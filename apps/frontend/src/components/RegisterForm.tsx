import { useState } from 'react';
import { authAPI } from '../lib/api';
import { saveTokens } from '../lib/auth';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Walidacja
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne');
      return;
    }

    if (formData.password.length < 8) {
      setError('Hasło musi mieć co najmniej 8 znaków');
      return;
    }

    // Walidacja siły hasła
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Hasło musi zawierać małą literę, wielką literę, cyfrę i znak specjalny');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const data = await authAPI.register(registerData);
      saveTokens(data.accessToken, data.refreshToken);
      window.location.href = '/dashboard';
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Użytkownik o tym adresie email już istnieje');
      } else if (err.response?.data?.message) {
        setError(Array.isArray(err.response.data.message)
          ? err.response.data.message[0]
          : err.response.data.message);
      } else {
        setError('Wystąpił błąd. Spróbuj ponownie.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="register-form">
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label htmlFor="firstName" className="form-label">Imię</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            className="form-input"
            placeholder="Jan"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName" className="form-label">Nazwisko</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            className="form-input"
            placeholder="Kowalski"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="email" className="form-label">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          className="form-input"
          placeholder="twoj@email.com"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone" className="form-label">Telefon (opcjonalnie)</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          className="form-input"
          placeholder="+48 123 456 789"
          value={formData.phone}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Hasło</label>
        <input
          type="password"
          id="password"
          name="password"
          className="form-input"
          placeholder="Min. 8 znaków"
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete="new-password"
        />
        <small className="text-muted">Hasło musi zawierać małą literę, wielką literę, cyfrę i znak specjalny</small>
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword" className="form-label">Potwierdź hasło</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          className="form-input"
          placeholder="Powtórz hasło"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          autoComplete="new-password"
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Rejestracja...' : 'Zarejestruj się'}
      </button>

      <p className="text-center mt-2 text-muted">
        Masz już konto? <a href="/login">Zaloguj się</a>
      </p>
    </form>
  );
}
