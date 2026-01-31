import { useState, useEffect } from 'react';
import { usersAPI, authAPI } from '../lib/api';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}

export default function ProfileForm() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await usersAPI.getMe();
      setUserData(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setPhone(data.phone || '');
    } catch (err) {
      setError('Nie udało się załadować profilu');
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await usersAPI.updateMe({ firstName, lastName, phone: phone || undefined });
      setSuccess('Profil został zaktualizowany');
    } catch (err) {
      setError('Nie udało się zaktualizować profilu');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Nowe hasła nie są identyczne');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordError('Hasło musi zawierać małą literę, wielką literę, cyfrę i znak specjalny');
      return;
    }

    setSavingPassword(true);

    try {
      const result = await authAPI.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Hasło zostało zmienione. Za chwilę nastąpi przekierowanie do logowania...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // HU-03: Wymagane ponowne zalogowanie po zmianie hasła
      if (result?.requiresRelogin) {
        setTimeout(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login?passwordChanged=true';
        }, 2000);
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        setPasswordError('Aktualne hasło jest nieprawidłowe');
      } else {
        setPasswordError('Nie udało się zmienić hasła');
      }
    } finally {
      setSavingPassword(false);
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
    <div className="profile-container">
      <div className="profile-section card">
        <h2>Dane osobowe</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={userData?.email || ''}
              disabled
            />
            <small className="text-muted">Adres email nie może być zmieniony</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Imię</label>
              <input
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nazwisko</label>
              <input
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+48 123 456 789"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </form>
      </div>

      <div className="profile-section card">
        <h2>Zmiana hasła</h2>

        {passwordError && <div className="alert alert-error">{passwordError}</div>}
        {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label className="form-label">Aktualne hasło</label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nowe hasło</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <small className="text-muted">
              Min. 8 znaków, mała litera, wielka litera, cyfra i znak specjalny
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Potwierdź nowe hasło</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={savingPassword}>
            {savingPassword ? 'Zmiana hasła...' : 'Zmień hasło'}
          </button>
        </form>
      </div>

      <style>{`
        .profile-container {
          display: grid;
          gap: 1.5rem;
          max-width: 600px;
        }

        .profile-section h2 {
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--color-border);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 480px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
