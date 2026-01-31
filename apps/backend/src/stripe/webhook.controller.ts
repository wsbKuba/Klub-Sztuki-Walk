import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('stripe')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private stripeService: StripeService,
    private subscriptionsService: SubscriptionsService,
    private configService: ConfigService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET nie jest ustawiony');
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      // req.rawBody jest dostępny dzięki konfiguracji w main.ts
      const rawBody = req.body;
      event = this.stripeService.constructWebhookEvent(
        rawBody as Buffer,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Błąd weryfikacji webhook: ${(err as Error).message}`);
      throw new BadRequestException(`Webhook signature verification failed: ${(err as Error).message}`);
    }

    this.logger.log(`Otrzymano webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        default:
          this.logger.log(`Nieobsługiwany typ zdarzenia: ${event.type}`);
      }
    } catch (err) {
      this.logger.error(`Błąd przetwarzania webhook ${event.type}: ${(err as Error).message}`);
      throw new BadRequestException(`Webhook processing failed: ${(err as Error).message}`);
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    this.logger.log(`Checkout session completed: ${session.id}`);
    this.logger.log(`Session metadata: ${JSON.stringify(session.metadata)}`);
    this.logger.log(`Session subscription: ${session.subscription}`);
    this.logger.log(`Session customer: ${session.customer}`);

    const userId = session.metadata?.userId;
    const classTypeId = session.metadata?.classTypeId;
    const stripeSubscriptionId = session.subscription as string;
    const stripeCustomerId = session.customer as string;

    if (!userId || !classTypeId || !stripeSubscriptionId) {
      this.logger.error(`Brakujące dane w metadata checkout session. userId: ${userId}, classTypeId: ${classTypeId}, stripeSubscriptionId: ${stripeSubscriptionId}`);
      return;
    }

    this.logger.log(`Pobieram szczegóły subskrypcji ${stripeSubscriptionId} ze Stripe...`);

    // Pobierz szczegóły subskrypcji ze Stripe
    const stripeSubscription = await this.stripeService.getSubscription(stripeSubscriptionId);
    this.logger.log(`Pobrano subskrypcję: ${JSON.stringify(stripeSubscription.id)}, status: ${stripeSubscription.status}`);

    // Wyciągnij daty okresu używając metody pomocniczej
    const { currentPeriodStart, currentPeriodEnd } = this.extractPeriodDates(stripeSubscription);
    this.logger.log(`Period dates - start: ${currentPeriodStart.toISOString()}, end: ${currentPeriodEnd.toISOString()}`);

    this.logger.log(`Tworzę subskrypcję w bazie danych...`);
    const subscription = await this.subscriptionsService.createFromWebhook({
      userId,
      classTypeId,
      stripeSubscriptionId,
      stripeCustomerId,
      currentPeriodStart,
      currentPeriodEnd,
    });

    this.logger.log(`Utworzono subskrypcję dla użytkownika ${userId}`);

    // Utwórz rekord pierwszej płatności
    // Pobierz najnowszą fakturę dla tej subskrypcji
    try {
      const invoices = await this.stripeService.getStripe().invoices.list({
        subscription: stripeSubscriptionId,
        limit: 1,
      });

      if (invoices.data.length > 0) {
        const invoice = invoices.data[0];
        if (invoice.status === 'paid') {
          this.logger.log(`Tworzę rekord pierwszej płatności dla faktury ${invoice.id}`);
          await this.subscriptionsService.createInitialPayment({
            subscriptionId: subscription.id,
            stripeInvoiceId: invoice.id!,
            amount: invoice.amount_paid ?? 0,
          });
          this.logger.log(`Utworzono rekord pierwszej płatności`);
        }
      }
    } catch (err) {
      this.logger.error(`Błąd tworzenia rekordu płatności: ${(err as Error).message}`);
      // Nie przerywaj procesu - subskrypcja została utworzona
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);

    // Pobierz pole subscription z invoice (może być string, obiekt lub null)
    const invoiceSubscription = (invoice as any).subscription;
    this.logger.log(`Invoice subscription field: ${JSON.stringify(invoiceSubscription)}`);
    this.logger.log(`Invoice subscription type: ${typeof invoiceSubscription}`);

    // Obsłuż różne formaty pola subscription (string lub obiekt)
    let stripeSubscriptionId: string | null = null;

    if (typeof invoiceSubscription === 'string') {
      stripeSubscriptionId = invoiceSubscription;
    } else if (invoiceSubscription && typeof invoiceSubscription === 'object') {
      stripeSubscriptionId = invoiceSubscription.id;
    }

    if (!stripeSubscriptionId) {
      this.logger.log('Invoice nie jest powiązana z subskrypcją - pomijam');
      return;
    }

    this.logger.log(`Przetwarzam płatność dla subskrypcji: ${stripeSubscriptionId}`);

    // Pobierz zaktualizowane dane subskrypcji
    const stripeSubscription = await this.stripeService.getSubscription(stripeSubscriptionId);

    // Pobierz daty okresu z różnych możliwych lokalizacji
    const { currentPeriodStart, currentPeriodEnd } = this.extractPeriodDates(stripeSubscription);

    await this.subscriptionsService.handlePaymentSucceeded({
      stripeSubscriptionId,
      stripeInvoiceId: invoice.id!,
      amount: invoice.amount_paid ?? 0,
      currentPeriodStart,
      currentPeriodEnd,
    });

    this.logger.log(`Zaktualizowano subskrypcję ${stripeSubscriptionId} po płatności`);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);

    const invoiceSubscription = (invoice as any).subscription;
    let stripeSubscriptionId: string | null = null;

    if (typeof invoiceSubscription === 'string') {
      stripeSubscriptionId = invoiceSubscription;
    } else if (invoiceSubscription && typeof invoiceSubscription === 'object') {
      stripeSubscriptionId = invoiceSubscription.id;
    }

    if (!stripeSubscriptionId) {
      return;
    }

    await this.subscriptionsService.handlePaymentFailed({
      stripeSubscriptionId: stripeSubscriptionId!,
      stripeInvoiceId: invoice.id!,
      amount: invoice.amount_due ?? 0,
    });

    this.logger.log(`Oznaczono subskrypcję ${stripeSubscriptionId} jako past_due`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription deleted: ${subscription.id}`);

    await this.subscriptionsService.handleSubscriptionCancelled(subscription.id);

    this.logger.log(`Anulowano subskrypcję ${subscription.id}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription updated: ${subscription.id}`);

    const { currentPeriodStart, currentPeriodEnd } = this.extractPeriodDates(subscription);

    await this.subscriptionsService.handleSubscriptionUpdated({
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart,
      currentPeriodEnd,
    });
  }

  /**
   * Pomocnicza metoda do wyciągania dat okresu z obiektu subskrypcji Stripe
   * Obsługuje różne wersje API i struktury danych
   */
  private extractPeriodDates(subscription: Stripe.Subscription): {
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  } {
    let periodStart: number | undefined;
    let periodEnd: number | undefined;

    // Próba 1: bezpośrednio na obiekcie subskrypcji
    if ((subscription as any).current_period_start) {
      periodStart = (subscription as any).current_period_start;
      periodEnd = (subscription as any).current_period_end;
    }
    // Próba 2: w items.data[0]
    else if (subscription.items?.data?.[0]) {
      const item = subscription.items.data[0] as any;
      periodStart = item.current_period_start;
      periodEnd = item.current_period_end;
    }
    // Próba 3: użyj start_date i dodaj miesiąc
    else if ((subscription as any).start_date) {
      periodStart = (subscription as any).start_date;
      periodEnd = periodStart! + (30 * 24 * 60 * 60);
    }

    // Fallback do aktualnej daty
    const now = new Date();
    const currentPeriodStart = periodStart ? new Date(periodStart * 1000) : now;
    const currentPeriodEnd = periodEnd
      ? new Date(periodEnd * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return { currentPeriodStart, currentPeriodEnd };
  }
}
