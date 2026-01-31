import { useState, useEffect } from 'react';
import { adminAPI } from '../lib/api';
import dayjs from 'dayjs';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'USER' | 'TRENER' | 'ADMINISTRATOR';
  isActive: boolean;
  createdAt: string;
}

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError('');

    try {
      const data = await adminAPI.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Nie udało się załadować listy użytkowników');
    } finally {
      setLoading(false);
    }
  }

  const roleLabels: Record<string, string> = {
    USER: 'Użytkownik',
    TRENER: 'Trener',
    ADMINISTRATOR: 'Administrator',
  };

  const roleBadgeClass: Record<string, string> = {
    USER: 'badge-primary',
    TRENER: 'badge-warning',
    ADMINISTRATOR: 'badge-danger',
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesSearch =
      searchTerm === '' ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

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

      <div className="filters mb-3">
        <div className="filter-row">
          <div className="form-group">
            <label className="form-label">Szukaj</label>
            <input
              type="text"
              className="form-input"
              placeholder="Email, imię lub nazwisko..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Rola</label>
            <select
              className="form-input"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">Wszystkie</option>
              <option value="USER">Użytkownicy</option>
              <option value="TRENER">Trenerzy</option>
              <option value="ADMINISTRATOR">Administratorzy</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="stats mb-3">
          <span className="stat-item">
            Łącznie: <strong>{users.length}</strong>
          </span>
          <span className="stat-item">
            Użytkownicy: <strong>{users.filter((u) => u.role === 'USER').length}</strong>
          </span>
          <span className="stat-item">
            Trenerzy: <strong>{users.filter((u) => u.role === 'TRENER').length}</strong>
          </span>
          <span className="stat-item">
            Aktywni: <strong>{users.filter((u) => u.isActive).length}</strong>
          </span>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Imię i nazwisko</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Rola</th>
                <th>Status</th>
                <th>Data rejestracji</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted">
                    Brak użytkowników spełniających kryteria
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <span className={`badge ${roleBadgeClass[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          user.isActive ? 'badge-success' : 'badge-danger'
                        }`}
                      >
                        {user.isActive ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </td>
                    <td>{dayjs(user.createdAt).format('DD.MM.YYYY')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .filters {
          background-color: var(--color-surface);
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }

        .filter-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
          align-items: end;
        }

        .stats {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--color-border);
        }

        .stat-item {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .table-container {
          overflow-x: auto;
        }

        @media (max-width: 768px) {
          .filter-row {
            grid-template-columns: 1fr;
          }

          .stats {
            flex-direction: column;
            gap: 0.5rem;
          }

          .table {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
