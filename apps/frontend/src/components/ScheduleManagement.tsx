import { useState, useEffect } from 'react';
import { scheduleAPI, classesAPI } from '../lib/api';

interface ClassType {
  id: string;
  name: string;
}

interface ScheduleItem {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  classType: ClassType;
  trainer: {
    firstName: string;
    lastName: string;
  };
}

const DAYS_OF_WEEK = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
];

export default function ScheduleManagement() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Form state for adding new schedule
  const [newSchedule, setNewSchedule] = useState({
    classTypeId: '',
    dayOfWeek: 1,
    startTime: '18:00',
    endTime: '19:30',
  });

  // Form state for cancelling a class
  const [cancelData, setCancelData] = useState({
    date: '',
    reason: '',
  });

  const [addError, setAddError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [scheduleData, classTypesData] = await Promise.all([
        scheduleAPI.getAll(),
        classesAPI.getAll(),
      ]);
      setSchedule(scheduleData);
      setClassTypes(classTypesData);
      if (classTypesData.length > 0 && !newSchedule.classTypeId) {
        setNewSchedule(prev => ({ ...prev, classTypeId: classTypesData[0].id }));
      }
    } catch (err) {
      setError('Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setProcessingId('add');

    try {
      await scheduleAPI.create(newSchedule);
      setNewSchedule({
        classTypeId: classTypes[0]?.id || '',
        dayOfWeek: 1,
        startTime: '18:00',
        endTime: '19:30',
      });
      setShowAddForm(false);
      await loadData();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setAddError('Kolizja terminów - w tym czasie są już inne zajęcia');
      } else {
        setAddError('Nie udało się dodać terminu');
      }
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeleteSchedule(id: string) {
    if (!confirm('Czy na pewno chcesz usunąć ten termin?')) return;

    setProcessingId(id);
    try {
      await scheduleAPI.delete(id);
      await loadData();
    } catch (err) {
      setError('Nie udało się usunąć terminu');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCancelClass(scheduleId: string) {
    if (!cancelData.date) {
      setAddError('Wybierz datę odwołania');
      return;
    }

    setProcessingId(scheduleId);
    try {
      await scheduleAPI.cancel(scheduleId, cancelData);
      setCancelData({ date: '', reason: '' });
      setShowCancelForm(null);
      alert('Zajęcia zostały odwołane. Utworzono automatyczne powiadomienie.');
      await loadData();
    } catch (err) {
      setError('Nie udało się odwołać zajęć');
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

  // Group schedule by day
  const scheduleByDay = DAYS_OF_WEEK.map((dayName, dayIndex) => ({
    dayName,
    dayIndex,
    items: schedule.filter(item => item.dayOfWeek === dayIndex && item.isActive),
  }));

  return (
    <div>
      {error && <div className="alert alert-error mb-3">{error}</div>}

      <div className="actions mb-3">
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Anuluj' : 'Dodaj termin'}
        </button>
      </div>

      {showAddForm && (
        <div className="card mb-3">
          <h3 className="mb-2">Nowy termin zajęć</h3>

          {addError && <div className="alert alert-error mb-2">{addError}</div>}

          <form onSubmit={handleAddSchedule}>
            <div className="form-group">
              <label className="form-label">Typ zajęć</label>
              <select
                className="form-input"
                value={newSchedule.classTypeId}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, classTypeId: e.target.value })
                }
                required
              >
                {classTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Dzień tygodnia</label>
              <select
                className="form-input"
                value={newSchedule.dayOfWeek}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(e.target.value) })
                }
                required
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Godzina rozpoczęcia</label>
                <input
                  type="time"
                  className="form-input"
                  value={newSchedule.startTime}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, startTime: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Godzina zakończenia</label>
                <input
                  type="time"
                  className="form-input"
                  value={newSchedule.endTime}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, endTime: e.target.value })
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
              {processingId === 'add' ? 'Dodawanie...' : 'Dodaj termin'}
            </button>
          </form>
        </div>
      )}

      <div className="schedule-grid">
        {scheduleByDay.map(({ dayName, dayIndex, items }) => (
          <div key={dayIndex} className="card schedule-day">
            <h3 className="day-title">{dayName}</h3>
            {items.length === 0 ? (
              <p className="text-muted">Brak zajęć</p>
            ) : (
              <div className="schedule-items">
                {items.map((item) => (
                  <div key={item.id} className="schedule-item">
                    <div className="schedule-item-header">
                      <strong>{item.classType.name}</strong>
                      <span className="schedule-time">
                        {item.startTime.slice(0, 5)} - {item.endTime.slice(0, 5)}
                      </span>
                    </div>

                    {showCancelForm === item.id ? (
                      <div className="cancel-form mt-2">
                        <div className="form-group">
                          <label className="form-label">Data odwołania</label>
                          <input
                            type="date"
                            className="form-input"
                            value={cancelData.date}
                            onChange={(e) =>
                              setCancelData({ ...cancelData, date: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Powód (opcjonalnie)</label>
                          <input
                            type="text"
                            className="form-input"
                            value={cancelData.reason}
                            onChange={(e) =>
                              setCancelData({ ...cancelData, reason: e.target.value })
                            }
                            placeholder="np. Choroba trenera"
                          />
                        </div>
                        <div className="action-buttons">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleCancelClass(item.id)}
                            disabled={processingId === item.id}
                          >
                            Potwierdź
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setShowCancelForm(null);
                              setCancelData({ date: '', reason: '' });
                            }}
                          >
                            Anuluj
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="action-buttons mt-2">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setShowCancelForm(item.id)}
                          disabled={processingId === item.id}
                        >
                          Odwołaj termin
                        </button>
                        <button
                          className="btn btn-outline btn-sm btn-danger"
                          onClick={() => handleDeleteSchedule(item.id)}
                          disabled={processingId === item.id}
                        >
                          Usuń
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .schedule-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .schedule-day {
          min-height: 150px;
        }

        .day-title {
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--color-primary);
        }

        .schedule-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .schedule-item {
          padding: 0.75rem;
          background-color: var(--color-background);
          border-radius: var(--radius-md);
        }

        .schedule-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .schedule-time {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-danger {
          border-color: var(--color-danger);
          color: var(--color-danger);
        }

        .btn-danger:hover {
          background-color: var(--color-danger);
          color: white;
        }

        .cancel-form {
          border-top: 1px solid var(--color-border);
          padding-top: 0.75rem;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .schedule-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
