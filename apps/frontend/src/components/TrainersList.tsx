import { useState, useEffect } from 'react';
import { adminAPI } from '../lib/api';

interface Trainer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export default function TrainersList() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Add trainer form
  const [newTrainer, setNewTrainer] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [addError, setAddError] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    loadTrainers();
  }, []);

  async function loadTrainers() {
    setLoading(true);
    setError('');

    try {
      const data = await adminAPI.getTrainers();
      setTrainers(data);
    } catch (err) {
      setError('Nie udało się załadować listy trenerów');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTrainer(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setTempPassword(null);
    setProcessingId('add');

    try {
      const result = await adminAPI.createTrainer({
        ...newTrainer,
        phone: newTrainer.phone || undefined,
      });

      if (result.temporaryPassword) {
        setTempPassword(result.temporaryPassword);
      }

      setNewTrainer({ email: '', firstName: '', lastName: '', phone: '' });
      await loadTrainers();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setAddError('Użytkownik o tym adresie email już istnieje');
      } else {
        setAddError('Nie udało się utworzyć trenera');
      }
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Czy na pewno chcesz dezaktywować tego trenera?')) return;

    setProcessingId(id);
    try {
      await adminAPI.deactivateTrainer(id);
      await loadTrainers();
    } catch (err) {
      setError('Nie udało się dezaktywować trenera');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(id: string) {
    setProcessingId(id);
    try {
      await adminAPI.activateTrainer(id);
      await loadTrainers();
    } catch (err) {
      setError('Nie udało się aktywować trenera');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleResetPassword(id: string) {
    if (!confirm('Czy na pewno chcesz zresetować hasło tego trenera?')) return;

    setProcessingId(id);
    try {
      const result = await adminAPI.resetTrainerPassword(id);
      alert(`Nowe hasło tymczasowe: ${result.temporaryPassword}`);
    } catch (err) {
      setError('Nie udało się zresetować hasła');
    } finally {
      setProcessingId(null);
    }
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
      {error && <div className="alert alert-error mb-3">{error}</div>}

      <div className="actions mb-3">
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Anuluj' : 'Dodaj trenera'}
        </button>
      </div>

      {showAddForm && (
        <div className="card mb-3">
          <h3 className="mb-2">Nowy trener</h3>

          {addError && <div className="alert alert-error">{addError}</div>}

          {tempPassword && (
            <div className="alert alert-success">
              <strong>Trener został utworzony!</strong>
              <br />
              Hasło tymczasowe: <code>{tempPassword}</code>
              <br />
              <small>Zapisz to hasło - nie będzie wyświetlone ponownie.</small>
            </div>
          )}

          <form onSubmit={handleAddTrainer}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={newTrainer.email}
                  onChange={(e) =>
                    setNewTrainer({ ...newTrainer, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefon</label>
                <input
                  type="tel"
                  className="form-input"
                  value={newTrainer.phone}
                  onChange={(e) =>
                    setNewTrainer({ ...newTrainer, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Imię</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTrainer.firstName}
                  onChange={(e) =>
                    setNewTrainer({ ...newTrainer, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nazwisko</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTrainer.lastName}
                  onChange={(e) =>
                    setNewTrainer({ ...newTrainer, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={processingId === 'add'}
            >
              {processingId === 'add' ? 'Tworzenie...' : 'Utwórz trenera'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Imię i nazwisko</th>
              <th>Email</th>
              <th>Telefon</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {trainers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  Brak trenerów
                </td>
              </tr>
            ) : (
              trainers.map((trainer) => (
                <tr key={trainer.id}>
                  <td>
                    {trainer.firstName} {trainer.lastName}
                  </td>
                  <td>{trainer.email}</td>
                  <td>{trainer.phone || '-'}</td>
                  <td>
                    <span
                      className={`badge ${
                        trainer.isActive ? 'badge-success' : 'badge-danger'
                      }`}
                    >
                      {trainer.isActive ? 'Aktywny' : 'Nieaktywny'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {trainer.isActive ? (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleDeactivate(trainer.id)}
                          disabled={processingId === trainer.id}
                        >
                          Dezaktywuj
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleActivate(trainer.id)}
                          disabled={processingId === trainer.id}
                        >
                          Aktywuj
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleResetPassword(trainer.id)}
                        disabled={processingId === trainer.id}
                      >
                        Reset hasła
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        code {
          background-color: var(--color-background);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-family: monospace;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .table {
            font-size: 0.75rem;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
