import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { ClassType } from '../classes/entities/class-type.entity';

export interface MemberWithSubscriptions {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  subscriptions: {
    id: string;
    classType: {
      id: string;
      name: string;
    };
    status: string;
    currentPeriodEnd: Date;
  }[];
}

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ClassType)
    private classTypeRepository: Repository<ClassType>,
  ) {}

  /**
   * HU-23: Pobiera listę członków z aktywnymi subskrypcjami
   * Opcjonalne filtrowanie według typu zajęć
   */
  async getMembersWithSubscriptions(classTypeId?: string): Promise<MemberWithSubscriptions[]> {
    // Buduj zapytanie dla subskrypcji
    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .innerJoinAndSelect('subscription.user', 'user')
      .innerJoinAndSelect('subscription.classType', 'classType')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('user.role = :role', { role: 'USER' }) // Tylko zwykli użytkownicy, nie trenerzy/admini
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC');

    // Filtrowanie po typie zajęć
    if (classTypeId) {
      queryBuilder.andWhere('subscription.classTypeId = :classTypeId', { classTypeId });
    }

    const subscriptions = await queryBuilder.getMany();

    // Grupuj subskrypcje według użytkownika
    const membersMap = new Map<string, MemberWithSubscriptions>();

    for (const sub of subscriptions) {
      const userId = sub.user.id;

      if (!membersMap.has(userId)) {
        membersMap.set(userId, {
          id: sub.user.id,
          email: sub.user.email,
          firstName: sub.user.firstName,
          lastName: sub.user.lastName,
          phone: sub.user.phone,
          subscriptions: [],
        });
      }

      membersMap.get(userId)!.subscriptions.push({
        id: sub.id,
        classType: {
          id: sub.classType.id,
          name: sub.classType.name,
        },
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
      });
    }

    return Array.from(membersMap.values());
  }

  /**
   * Statystyki członków - liczba aktywnych subskrypcji per typ zajęć
   */
  async getMembersStats(): Promise<{ classTypeId: string; classTypeName: string; activeMembers: number }[]> {
    const stats = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .innerJoin('subscription.classType', 'classType')
      .innerJoin('subscription.user', 'user')
      .select('classType.id', 'classTypeId')
      .addSelect('classType.name', 'classTypeName')
      .addSelect('COUNT(DISTINCT subscription.userId)', 'activeMembers')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('user.role = :role', { role: 'USER' })
      .groupBy('classType.id')
      .addGroupBy('classType.name')
      .getRawMany();

    return stats.map(s => ({
      classTypeId: s.classTypeId,
      classTypeName: s.classTypeName,
      activeMembers: parseInt(s.activeMembers, 10),
    }));
  }
}
