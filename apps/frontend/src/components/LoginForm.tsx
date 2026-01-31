import { useState } from 'react';
import { authAPI } from '../lib/api';
import { saveTokens } from '../lib/auth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.login(email, password);
      saveTokens(data.accessToken, data.refreshToken);
      window.location.href = '/dashboard';
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Nieprawidłowy email lub hasło');
      } else {
        setError('Wystąpił błąd. Spróbuj ponownie.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="email" className="form-label">Email</label>
        <input
          type="email"
          id="email"
          className="form-input"
          placeholder="twoj@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Hasło</label>
        <input
          type="password"
          id="password"
          className="form-input"
          placeholder="Twoje hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Logowanie...' : 'Zaloguj się'}
      </button>

      <p className="text-center mt-2 text-muted">
        Nie masz konta? <a href="/register">Zarejestruj się</a>
      </p>
    </form>
  );
}
