import { useState, useEffect } from 'react';
import { membersAPI, classesAPI } from '../lib/api';
import dayjs from 'dayjs';

interface ClassType {
  id: string;
  name: string;
}

interface MemberSubscription {
  id: string;
  classType: {
    id: string;
    name: string;
  };
  status: string;
  currentPeriodEnd: string;
}

interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  subscriptions: MemberSubscription[];
}

interface MemberStats {
  classTypeId: string;
  classTypeName: string;
  activeMembers: number;
}

export default function MembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [stats, setStats] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterClassType, setFilterClassType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadMembers();
  }, [filterClassType]);

  async function loadInitialData() {
    try {
      const [classTypesData, statsData] = await Promise.all([
        classesAPI.getAll(),
        membersAPI.getStats(),
      ]);
      setClassTypes(classTypesData);
      setStats(statsData);
      await loadMembers();
    } catch (err) {
      setError('Nie udało się załadować danych');
      setLoading(false);
    }
  }

  async function loadMembers() {
    setLoading(true);
    setError('');

    try {
      const data = await membersAPI.getAll(filterClassType || undefined);
      setMembers(data);
    } catch (err) {
      setError('Nie udało się załadować listy członków');
    } finally {
      setLoading(false);
    }
  }

  // Filter members by search term
  const filteredMembers = members.filter((member) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      member.email.toLowerCase().includes(term) ||
      member.firstName.toLowerCase().includes(term) ||
      member.lastName.toLowerCase().includes(term)
    );
  });

  // Get total unique members count
  const totalMembers = members.length;

  if (loading && members.length === 0) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-error mb-3">{error}</div>}

      {/* Statystyki */}
      <div className="stats-grid mb-3">
        <div className="stat-card stat-total">
          <div className="stat-value">{totalMembers}</div>
          <div className="stat-label">Aktywnych członków</div>
        </div>
        {stats.map((stat) => (
          <div key={stat.classTypeId} className="stat-card">
            <div className="stat-value">{stat.activeMembers}</div>
            <div className="stat-label">{stat.classTypeName}</div>
          </div>
        ))}
      </div>

      {/* Filtry */}
      <div className="filters card mb-3">
        <div className="filter-row">
          <div className="form-group">
            <label className="form-label">Szukaj członka</label>
            <input
              type="text"
              className="form-input"
              placeholder="Imię, nazwisko lub email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Filtruj według typu zajęć</label>
            <select
              className="form-input"
              value={filterClassType}
              onChange={(e) => setFilterClassType(e.target.value)}
            >
              <option value="">Wszystkie zajęcia</option>
              {classTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista członków */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Imię i nazwisko</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Subskrypcje</th>
                <th>Ważna do</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted">
                    {filterClassType
                      ? 'Brak członków z subskrypcją na te zajęcia'
                      : 'Brak aktywnych członków'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>
                        {member.firstName} {member.lastName}
                      </strong>
                    </td>
                    <td>
                      <a href={`mailto:${member.email}`}>{member.email}</a>
                    </td>
                    <td>
                      {member.phone ? (
                        <a href={`tel:${member.phone}`}>{member.phone}</a>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="subscriptions-badges">
                        {member.subscriptions.map((sub) => (
                          <span key={sub.id} className="badge badge-primary">
                            {sub.classType.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {member.subscriptions.length > 0 && (
                        <span className="expiry-date">
                          {dayjs(
                            member.subscriptions.reduce((latest, sub) =>
                              new Date(sub.currentPeriodEnd) > new Date(latest.currentPeriodEnd)
                                ? sub
                                : latest
                            ).currentPeriodEnd
                          ).format('DD.MM.YYYY')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          text-align: center;
        }

        .stat-card.stat-total {
          background-color: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          margin-top: 0.5rem;
          opacity: 0.8;
        }

        .filters {
          padding: 1rem;
        }

        .filter-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
          align-items: end;
        }

        .table-container {
          overflow-x: auto;
        }

        .subscriptions-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .expiry-date {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .filter-row {
            grid-template-columns: 1fr;
          }

          .table {
            font-size: 0.75rem;
          }

          .subscriptions-badges .badge {
            font-size: 0.625rem;
            padding: 0.125rem 0.375rem;
          }
        }
      `}</style>
    </div>
  );
}
