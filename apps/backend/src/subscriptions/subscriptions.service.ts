import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { ClassType } from '../classes/entities/class-type.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class SubscriptionsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(ClassType)
    private classTypeRepository: Repository<ClassType>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(secretKey || '');
  }

  async getMySubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      relations: ['classType'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSubscriptionById(id: string, userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, userId },
      relations: ['classType'],
    });

    if (!subscription) {
      throw new NotFoundException('Subskrypcja nie została znaleziona');
    }

    return subscription;
  }

  async createCheckoutSession(
    userId: string,
    classTypeId: string,
  ): Promise<{ url: string }> {
    // Sprawdź czy typ zajęć istnieje
    const classType = await this.classTypeRepository.findOne({
      where: { id: classTypeId },
    });

    if (!classType) {
      throw new NotFoundException('Typ zajęć nie został znaleziony');
    }

    if (!classType.stripePriceId) {
      throw new BadRequestException(
        'Ten typ zajęć nie ma skonfigurowanej ceny w Stripe',
      );
    }

    // Sprawdź czy użytkownik nie ma już aktywnej subskrypcji tego typu
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        classTypeId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new ConflictException(
        'Masz już aktywną subskrypcję na te zajęcia',
      );
    }

    // Pobierz użytkownika
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Użytkownik nie został znaleziony');
    }

    // Pobierz lub utwórz klienta Stripe
    let stripeCustomer: Stripe.Customer;
    const existingCustomers = await this.stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
    } else {
      stripeCustomer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId },
      });
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4321';

    // Utwórz sesję Checkout
    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: classType.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/subscriptions?cancelled=true`,
      metadata: {
        userId,
        classTypeId,
      },
    });

    this.logger.log(`Utworzono sesję Checkout ${session.id} dla użytkownika ${userId}`);

    return { url: session.url! };
  }

  async cancelSubscription(id: string, userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subskrypcja nie została znaleziona');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Można anulować tylko aktywne subskrypcje');
    }

    // Anuluj w Stripe (na koniec okresu rozliczeniowego)
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    subscription.cancelAtPeriodEnd = true;
    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Subskrypcja ${id} oznaczona do anulowania`);

    return subscription;
  }

  async reactivateSubscription(id: string, userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subskrypcja nie została znaleziona');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subskrypcja nie jest oznaczona do anulowania');
    }

    // Reaktywuj w Stripe
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    subscription.cancelAtPeriodEnd = false;
    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Subskrypcja ${id} reaktywowana`);

    return subscription;
  }

  // Metody wywoływane przez webhooks

  async createFromWebhook(data: {
    userId: string;
    classTypeId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }): Promise<Subscription> {
    this.logger.log(`createFromWebhook wywołane z danymi: ${JSON.stringify(data)}`);

    // Sprawdź czy subskrypcja już istnieje (idempotentność)
    const existing = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: data.stripeSubscriptionId },
    });

    if (existing) {
      this.logger.log(`Subskrypcja ${data.stripeSubscriptionId} już istnieje`);
      return existing;
    }

    this.logger.log(`Tworzę nową subskrypcję...`);

    const subscription = this.subscriptionRepository.create({
      userId: data.userId,
      classTypeId: data.classTypeId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripeCustomerId: data.stripeCustomerId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: false,
    });

    this.logger.log(`Zapisuję subskrypcję do bazy danych...`);
    try {
      const saved = await this.subscriptionRepository.save(subscription);
      this.logger.log(`Subskrypcja zapisana z ID: ${saved.id}`);
      return saved;
    } catch (err) {
      this.logger.error(`Błąd zapisu subskrypcji: ${(err as Error).message}`);
      this.logger.error(`Stack: ${(err as Error).stack}`);
      throw err;
    }
  }

  async handlePaymentSucceeded(data: {
    stripeSubscriptionId: string;
    stripeInvoiceId: string;
    amount: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: data.stripeSubscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`Nie znaleziono subskrypcji ${data.stripeSubscriptionId}`);
      return;
    }

    // Zaktualizuj okres subskrypcji
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.currentPeriodStart = data.currentPeriodStart;
    subscription.currentPeriodEnd = data.currentPeriodEnd;
    await this.subscriptionRepository.save(subscription);

    // Sprawdź czy płatność już istnieje (idempotentność)
    const existingPayment = await this.paymentRepository.findOne({
      where: { stripeInvoiceId: data.stripeInvoiceId },
    });

    if (existingPayment) {
      this.logger.log(`Płatność ${data.stripeInvoiceId} już istnieje - pomijam tworzenie`);
      return;
    }

    // Utwórz rekord płatności
    const payment = this.paymentRepository.create({
      subscriptionId: subscription.id,
      stripeInvoiceId: data.stripeInvoiceId,
      amount: data.amount,
      status: PaymentStatus.PAID,
      paidAt: new Date(),
    });

    await this.paymentRepository.save(payment);
    this.logger.log(`Utworzono płatność ${data.stripeInvoiceId}`);
  }

  async handlePaymentFailed(data: {
    stripeSubscriptionId: string;
    stripeInvoiceId: string;
    amount: number;
  }): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: data.stripeSubscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`Nie znaleziono subskrypcji ${data.stripeSubscriptionId}`);
      return;
    }

    subscription.status = SubscriptionStatus.PAST_DUE;
    await this.subscriptionRepository.save(subscription);

    // Utwórz rekord nieudanej płatności
    const payment = this.paymentRepository.create({
      subscriptionId: subscription.id,
      stripeInvoiceId: data.stripeInvoiceId,
      amount: data.amount,
      status: PaymentStatus.FAILED,
    });

    await this.paymentRepository.save(payment);
  }

  async handleSubscriptionCancelled(stripeSubscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`Nie znaleziono subskrypcji ${stripeSubscriptionId}`);
      return;
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    await this.subscriptionRepository.save(subscription);
  }

  async createInitialPayment(data: {
    subscriptionId: string;
    stripeInvoiceId: string;
    amount: number;
  }): Promise<void> {
    // Sprawdź czy płatność już istnieje (idempotentność)
    const existing = await this.paymentRepository.findOne({
      where: { stripeInvoiceId: data.stripeInvoiceId },
    });

    if (existing) {
      this.logger.log(`Płatność ${data.stripeInvoiceId} już istnieje`);
      return;
    }

    const payment = this.paymentRepository.create({
      subscriptionId: data.subscriptionId,
      stripeInvoiceId: data.stripeInvoiceId,
      amount: data.amount,
      status: PaymentStatus.PAID,
      paidAt: new Date(),
    });

    await this.paymentRepository.save(payment);
    this.logger.log(`Utworzono płatność ${data.stripeInvoiceId} dla subskrypcji ${data.subscriptionId}`);
  }

  async handleSubscriptionUpdated(data: {
    stripeSubscriptionId: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: data.stripeSubscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`Nie znaleziono subskrypcji ${data.stripeSubscriptionId}`);
      return;
    }

    // Mapuj status Stripe na nasz enum
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELLED,
      unpaid: SubscriptionStatus.PAST_DUE,
    };

    subscription.status = statusMap[data.status] || subscription.status;
    subscription.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
    subscription.currentPeriodStart = data.currentPeriodStart;
    subscription.currentPeriodEnd = data.currentPeriodEnd;

    await this.subscriptionRepository.save(subscription);
  }

  /**
   * HU-12: Tworzenie sesji Stripe Customer Portal
   * Pozwala użytkownikowi na zmianę metody płatności
   */
  async createCustomerPortalSession(userId: string): Promise<{ url: string }> {
    // Znajdź subskrypcję użytkownika, aby uzyskać stripeCustomerId
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new NotFoundException('Nie znaleziono aktywnej subskrypcji');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4321';

    // Utwórz sesję Customer Portal
    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/subscriptions`,
    });

    this.logger.log(`Utworzono sesję Customer Portal dla użytkownika ${userId}`);

    return { url: session.url };
  }
}
