import { useState, useEffect } from 'react';
import { classesAPI, subscriptionsAPI } from '../lib/api';
import dayjs from 'dayjs';

interface ClassType {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  stripePriceId?: string;
}

interface Subscription {
  id: string;
  classTypeId: string;
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  classType: ClassType;
}

export default function SubscriptionsList() {
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check URL params for success/cancel messages
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const successParam = urlParams?.get('success');
  const cancelledParam = urlParams?.get('cancelled');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [classTypesData, subscriptionsData] = await Promise.all([
        classesAPI.getAll(),
        subscriptionsAPI.getMy(),
      ]);

      setClassTypes(classTypesData);
      setSubscriptions(subscriptionsData);
    } catch (err) {
      setError('Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(classTypeId: string) {
    setProcessingId(classTypeId);
    setError('');

    try {
      const { url } = await subscriptionsAPI.createCheckoutSession(classTypeId);
      window.location.href = url;
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Nie udało się utworzyć sesji płatności');
      }
      setProcessingId(null);
    }
  }

  async function handleCancel(subscriptionId: string) {
    if (!confirm('Czy na pewno chcesz anulować subskrypcję? Dostęp pozostanie do końca okresu rozliczeniowego.')) {
      return;
    }

    setProcessingId(subscriptionId);
    setError('');

    try {
      await subscriptionsAPI.cancel(subscriptionId);
      await loadData();
    } catch (err) {
      setError('Nie udało się anulować subskrypcji');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReactivate(subscriptionId: string) {
    setProcessingId(subscriptionId);
    setError('');

    try {
      await subscriptionsAPI.reactivate(subscriptionId);
      await loadData();
    } catch (err) {
      setError('Nie udało się reaktywować subskrypcji');
    } finally {
      setProcessingId(null);
    }
  }

  // HU-12: Zmiana metody płatności przez Stripe Customer Portal
  async function handleManagePaymentMethod() {
    setProcessingId('portal');
    setError('');

    try {
      const { url } = await subscriptionsAPI.createCustomerPortalSession();
      window.location.href = url;
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Nie masz aktywnych subskrypcji do zarządzania');
      } else {
        setError('Nie udało się otworzyć panelu zarządzania płatnościami');
      }
      setProcessingId(null);
    }
  }

  function getSubscriptionForClassType(classTypeId: string): Subscription | undefined {
    return subscriptions.find(
      (sub) => sub.classTypeId === classTypeId && sub.status !== 'cancelled'
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {successParam && (
        <div className="alert alert-success mb-3">
          Subskrypcja została pomyślnie aktywowana!
        </div>
      )}

      {cancelledParam && (
        <div className="alert alert-warning mb-3">
          Płatność została anulowana. Możesz spróbować ponownie.
        </div>
      )}

      {error && <div className="alert alert-error mb-3">{error}</div>}

      <div className="section-header mb-2">
        <h2>Moje subskrypcje</h2>
        {subscriptions.filter(s => s.status !== 'cancelled').length > 0 && (
          <button
            className="btn btn-outline btn-sm"
            onClick={handleManagePaymentMethod}
            disabled={processingId === 'portal'}
          >
            {processingId === 'portal' ? 'Przekierowanie...' : 'Zmień metodę płatności'}
          </button>
        )}
      </div>

      {subscriptions.filter(s => s.status !== 'cancelled').length === 0 ? (
        <div className="card mb-3">
          <p className="text-muted mb-0">Nie masz jeszcze żadnych aktywnych subskrypcji.</p>
        </div>
      ) : (
        <div className="subscriptions-grid mb-4">
          {subscriptions
            .filter((sub) => sub.status !== 'cancelled')
            .map((sub) => (
              <div key={sub.id} className="subscription-card card">
                <div className="subscription-header">
                  <h3>{sub.classType.name}</h3>
                  <span className={`badge ${sub.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                    {sub.status === 'active' ? 'Aktywna' : 'Zaległa płatność'}
                  </span>
                </div>

                <div className="subscription-details">
                  <div className="detail-row">
                    <span>Cena:</span>
                    <span className="price">{sub.classType.monthlyPrice} PLN/miesiąc</span>
                  </div>
                  <div className="detail-row">
                    <span>Następne odnowienie:</span>
                    <span>{dayjs(sub.currentPeriodEnd).format('DD.MM.YYYY')}</span>
                  </div>
                </div>

                {sub.cancelAtPeriodEnd && (
                  <div className="alert alert-warning" style={{ marginBottom: '1rem', padding: '0.5rem' }}>
                    Subskrypcja zostanie anulowana {dayjs(sub.currentPeriodEnd).format('DD.MM.YYYY')}
                  </div>
                )}

                <div className="subscription-actions">
                  {sub.cancelAtPeriodEnd ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleReactivate(sub.id)}
                      disabled={processingId === sub.id}
                    >
                      {processingId === sub.id ? 'Przetwarzanie...' : 'Reaktywuj'}
                    </button>
                  ) : (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancel(sub.id)}
                      disabled={processingId === sub.id}
                    >
                      {processingId === sub.id ? 'Przetwarzanie...' : 'Anuluj'}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      <h2 className="mb-2">Dostępne zajęcia</h2>

      <div className="class-types-grid">
        {classTypes.map((classType) => {
          const existingSubscription = getSubscriptionForClassType(classType.id);

          return (
            <div key={classType.id} className="class-type-card card">
              <h3>{classType.name}</h3>
              <p className="description">{classType.description}</p>
              <div className="price">{classType.monthlyPrice} PLN/miesiąc</div>

              {existingSubscription ? (
                <span className="badge badge-success">Posiadasz subskrypcję</span>
              ) : classType.stripePriceId ? (
                <button
                  className="btn btn-primary"
                  onClick={() => handleSubscribe(classType.id)}
                  disabled={processingId === classType.id}
                >
                  {processingId === classType.id ? 'Przekierowanie...' : 'Wykup subskrypcję'}
                </button>
              ) : (
                <span className="text-muted">Niedostępne</span>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-header h2 {
          margin: 0;
        }

        .subscriptions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .subscription-card {
          border-left: 4px solid var(--color-success);
        }

        .subscription-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .subscription-header h3 {
          margin: 0;
        }

        .subscription-details {
          margin-bottom: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
          border-bottom: 1px solid var(--color-border);
        }

        .detail-row .price {
          font-weight: 600;
          color: var(--color-primary);
        }

        .subscription-actions {
          display: flex;
          gap: 0.5rem;
        }

        .class-types-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .class-type-card {
          text-align: center;
        }

        .class-type-card h3 {
          color: var(--color-primary);
          margin-bottom: 0.5rem;
        }

        .class-type-card .description {
          color: var(--color-text-muted);
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .class-type-card .price {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
