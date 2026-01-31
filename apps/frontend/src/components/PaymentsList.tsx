import { useState, useEffect } from 'react';
import { paymentsAPI } from '../lib/api';
import dayjs from 'dayjs';

interface Payment {
  id: string;
  stripeInvoiceId: string;
  amount: number;
  status: 'paid' | 'failed' | 'pending';
  paidAt?: string;
  createdAt: string;
  subscription: {
    classType: {
      name: string;
    };
  };
}

export default function PaymentsList() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    setError('');

    try {
      const data = await paymentsAPI.getMy();
      setPayments(data);
    } catch (err) {
      setError('Nie udało się załadować historii płatności');
    } finally {
      setLoading(false);
    }
  }

  const statusLabels: Record<string, string> = {
    paid: 'Zapłacono',
    failed: 'Nieudana',
    pending: 'Oczekuje',
  };

  const statusBadgeClass: Record<string, string> = {
    paid: 'badge-success',
    failed: 'badge-danger',
    pending: 'badge-warning',
  };

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

  if (payments.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-muted mb-0">Brak historii płatności</p>
      </div>
    );
  }

  return (
    <div>
      <div className="table-container card">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Typ zajęć</th>
              <th>Kwota</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  {dayjs(payment.paidAt || payment.createdAt).format('DD.MM.YYYY HH:mm')}
                </td>
                <td>{payment.subscription.classType.name}</td>
                <td className="amount">
                  {(payment.amount / 100).toFixed(2)} PLN
                </td>
                <td>
                  <span className={`badge ${statusBadgeClass[payment.status]}`}>
                    {statusLabels[payment.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .table-container {
          overflow-x: auto;
        }

        .amount {
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .table {
            font-size: 0.875rem;
          }

          .table th,
          .table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
