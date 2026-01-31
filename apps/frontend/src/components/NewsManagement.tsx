import { useState, useEffect } from 'react';
import { newsAPI } from '../lib/api';
import dayjs from 'dayjs';

interface News {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'event' | 'cancellation';
  coverImageUrl?: string;
  publishedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const NEWS_TYPES = [
  { value: 'announcement', label: 'Ogłoszenie' },
  { value: 'event', label: 'Wydarzenie' },
  { value: 'cancellation', label: 'Odwołanie' },
];

export default function NewsManagement() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'announcement' as 'announcement' | 'event' | 'cancellation',
    coverImageUrl: '',
  });

  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);
    setError('');

    try {
      const data = await newsAPI.getAll();
      setNews(data);
    } catch (err) {
      setError('Nie udało się załadować aktualności');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      content: '',
      type: 'announcement',
      coverImageUrl: '',
    });
    setFormError('');
    setEditingId(null);
    setShowAddForm(false);
  }

  function startEdit(item: News) {
    setFormData({
      title: item.title,
      content: item.content,
      type: item.type,
      coverImageUrl: item.coverImageUrl || '',
    });
    setEditingId(item.id);
    setShowAddForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setProcessingId(editingId || 'add');

    try {
      const dataToSend = {
        ...formData,
        coverImageUrl: formData.coverImageUrl || undefined,
      };

      if (editingId) {
        await newsAPI.update(editingId, dataToSend);
      } else {
        await newsAPI.create(dataToSend);
      }

      resetForm();
      await loadNews();
    } catch (err: any) {
      setFormError(editingId ? 'Nie udało się zaktualizować' : 'Nie udało się dodać aktualności');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Czy na pewno chcesz usunąć tę aktualność?')) return;

    setProcessingId(id);
    try {
      await newsAPI.delete(id);
      await loadNews();
    } catch (err) {
      setError('Nie udało się usunąć aktualności');
    } finally {
      setProcessingId(null);
    }
  }

  const typeLabels: Record<string, string> = {
    announcement: 'Ogłoszenie',
    event: 'Wydarzenie',
    cancellation: 'Odwołanie',
  };

  const typeBadgeClass: Record<string, string> = {
    announcement: 'badge-primary',
    event: 'badge-success',
    cancellation: 'badge-danger',
  };

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
          onClick={() => {
            if (showAddForm) {
              resetForm();
            } else {
              setShowAddForm(true);
            }
          }}
        >
          {showAddForm ? 'Anuluj' : 'Dodaj aktualność'}
        </button>
      </div>

      {showAddForm && (
        <div className="card mb-3">
          <h3 className="mb-2">
            {editingId ? 'Edytuj aktualność' : 'Nowa aktualność'}
          </h3>

          {formError && <div className="alert alert-error mb-2">{formError}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tytuł</label>
              <input
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Typ</label>
              <select
                className="form-input"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as 'announcement' | 'event' | 'cancellation',
                  })
                }
                required
              >
                {NEWS_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Treść</label>
              <textarea
                className="form-input form-textarea"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                required
                rows={5}
              />
            </div>

            <div className="form-group">
              <label className="form-label">URL obrazka (opcjonalnie)</label>
              <input
                type="url"
                className="form-input"
                value={formData.coverImageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, coverImageUrl: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={processingId !== null}
              >
                {processingId ? 'Zapisywanie...' : editingId ? 'Zapisz zmiany' : 'Dodaj'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={resetForm}
                >
                  Anuluj edycję
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="news-list">
        {news.length === 0 ? (
          <div className="card text-center">
            <p className="text-muted mb-0">Brak aktualności</p>
          </div>
        ) : (
          news.map((item) => (
            <div key={item.id} className="card news-card">
              <div className="news-header">
                <div>
                  <span className={`badge ${typeBadgeClass[item.type]}`}>
                    {typeLabels[item.type]}
                  </span>
                  <h3 className="news-title">{item.title}</h3>
                </div>
                <div className="news-meta">
                  <span>{dayjs(item.publishedAt).format('DD.MM.YYYY HH:mm')}</span>
                </div>
              </div>

              {item.coverImageUrl && (
                <img
                  src={item.coverImageUrl}
                  alt={item.title}
                  className="news-image"
                />
              )}

              <p className="news-content">{item.content}</p>

              <div className="news-footer">
                <span className="text-muted">
                  Autor: {item.author.firstName} {item.author.lastName}
                </span>
                <div className="action-buttons">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => startEdit(item)}
                    disabled={processingId === item.id}
                  >
                    Edytuj
                  </button>
                  <button
                    className="btn btn-outline btn-sm btn-danger"
                    onClick={() => handleDelete(item.id)}
                    disabled={processingId === item.id}
                  >
                    Usuń
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .news-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .news-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .news-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .news-title {
          margin: 0.5rem 0 0 0;
          font-size: 1.25rem;
        }

        .news-meta {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .news-image {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          border-radius: var(--radius-md);
        }

        .news-content {
          margin: 0;
          white-space: pre-wrap;
        }

        .news-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border);
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-danger {
          border-color: var(--color-danger);
          color: var(--color-danger);
        }

        .btn-danger:hover {
          background-color: var(--color-danger);
          color: white;
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
