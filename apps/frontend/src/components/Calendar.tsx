import { useState, useEffect } from 'react';
import { scheduleAPI, subscriptionsAPI } from '../lib/api';

interface ClassSchedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  classType: {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
  };
  trainer: {
    firstName: string;
    lastName: string;
  };
  cancellations?: Array<{
    date: string;
    reason?: string;
  }>;
}

interface Subscription {
  id: string;
  classTypeId: string;
  status: string;
}

export default function Calendar() {
  const [schedule, setSchedule] = useState<ClassSchedule[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

  useEffect(() => {
    loadData();
  }, [selectedDay]);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [scheduleData, subscriptionsData] = await Promise.all([
        scheduleAPI.get(selectedDay ?? undefined),
        subscriptionsAPI.getMy(),
      ]);

      setSchedule(scheduleData);
      setSubscriptions(subscriptionsData);
    } catch (err) {
      setError('Nie udało się załadować harmonogramu');
    } finally {
      setLoading(false);
    }
  }

  function hasActiveSubscription(classTypeId: string): boolean {
    return subscriptions.some(
      (sub) => sub.classTypeId === classTypeId && sub.status === 'active'
    );
  }

  function groupByDay(items: ClassSchedule[]): Record<number, ClassSchedule[]> {
    return items.reduce((acc, item) => {
      if (!acc[item.dayOfWeek]) {
        acc[item.dayOfWeek] = [];
      }
      acc[item.dayOfWeek].push(item);
      return acc;
    }, {} as Record<number, ClassSchedule[]>);
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  const groupedSchedule = groupByDay(schedule);
  const daysToShow = selectedDay !== null ? [selectedDay] : [1, 2, 3, 4, 5, 6, 0];

  return (
    <div>
      <div className="filters mb-3">
        <button
          className={`btn btn-sm ${selectedDay === null ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSelectedDay(null)}
        >
          Cały tydzień
        </button>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <button
            key={day}
            className={`btn btn-sm ${selectedDay === day ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedDay(day)}
          >
            {dayNames[day].substring(0, 3)}
          </button>
        ))}
      </div>

      <div className="legend mb-3">
        <span className="legend-item">
          <span className="legend-dot legend-active"></span>
          Masz subskrypcję
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-inactive"></span>
          Brak subskrypcji
        </span>
      </div>

      {schedule.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted mb-0">Brak zajęć w wybranym dniu</p>
        </div>
      ) : (
        <div className="calendar-grid">
          {daysToShow.map((day) => (
            <div key={day} className="day-column">
              <div className="day-header">{dayNames[day]}</div>
              <div className="day-classes">
                {(groupedSchedule[day] || []).map((cls) => {
                  const hasSubscription = hasActiveSubscription(cls.classType.id);
                  return (
                    <div
                      key={cls.id}
                      className={`class-card ${hasSubscription ? 'has-subscription' : ''}`}
                    >
                      <div className="class-time">
                        {cls.startTime} - {cls.endTime}
                      </div>
                      <div className="class-name">{cls.classType.name}</div>
                      <div className="class-trainer">
                        Trener: {cls.trainer.firstName} {cls.trainer.lastName}
                      </div>
                      {hasSubscription && (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                          Aktywna subskrypcja
                        </span>
                      )}
                    </div>
                  );
                })}
                {(!groupedSchedule[day] || groupedSchedule[day].length === 0) && (
                  <div className="no-classes">Brak zajęć</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .filters {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .legend {
          display: flex;
          gap: 1.5rem;
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-active {
          background-color: var(--color-success);
        }

        .legend-inactive {
          background-color: var(--color-border);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .day-column {
          background-color: var(--color-surface);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .day-header {
          background-color: var(--color-secondary);
          color: white;
          padding: 0.75rem;
          text-align: center;
          font-weight: 600;
        }

        .day-classes {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-height: 200px;
        }

        .class-card {
          padding: 0.75rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background-color: var(--color-background);
        }

        .class-card.has-subscription {
          border-color: var(--color-success);
          background-color: rgba(16, 185, 129, 0.1);
        }

        .class-time {
          font-weight: 600;
          color: var(--color-primary);
          margin-bottom: 0.25rem;
        }

        .class-name {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .class-trainer {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .no-classes {
          text-align: center;
          color: var(--color-text-muted);
          padding: 2rem 0;
        }
      `}</style>
    </div>
  );
}
