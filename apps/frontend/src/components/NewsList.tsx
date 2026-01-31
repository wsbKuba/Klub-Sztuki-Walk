import { useState, useEffect } from 'react';
import { newsAPI } from '../lib/api';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';

dayjs.locale('pl');

interface News {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'event' | 'cancellation';
  coverImageUrl?: string;
  publishedAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
}

export default function NewsList() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadNews();
  }, [filter]);

  async function loadNews() {
    setLoading(true);
    setError('');

    try {
      const data = await newsAPI.getAll(filter || undefined);
      setNews(data);
    } catch (err) {
      setError('Nie udało się załadować aktualności');
    } finally {
      setLoading(false);
    }
  }

  const typeLabels: Record<string, string> = {
    announcement: 'Ogłoszenie',
    event: 'Wydarzenie',
    cancellation: 'Odwołanie',
  };

  const typeBadgeClass: Record<string, string> = {
    announcement: 'badge-info',
    event: 'badge-info',
    cancellation: 'badge-danger',
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

  return (
    <div>
      <div className="filters mb-3">
        <button
          className={`btn btn-sm ${filter === '' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('')}
        >
          Wszystkie
        </button>
        <button
          className={`btn btn-sm ${filter === 'announcement' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('announcement')}
        >
          Ogłoszenia
        </button>
        <button
          className={`btn btn-sm ${filter === 'event' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('event')}
        >
          Wydarzenia
        </button>
        <button
          className={`btn btn-sm ${filter === 'cancellation' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('cancellation')}
        >
          Odwołania
        </button>
      </div>

      {news.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted mb-0">Brak aktualności</p>
        </div>
      ) : (
        <div className="news-grid">
          {news.map((item) => (
            <div key={item.id} className="news-card card">
              {item.coverImageUrl && (
                <img src={item.coverImageUrl} alt={item.title} className="news-image" />
              )}
              <div className="news-content">
                <span className={`badge ${typeBadgeClass[item.type]}`}>
                  {typeLabels[item.type]}
                </span>
                <h3>{item.title}</h3>
                <p>{item.content}</p>
                <div className="news-meta">
                  <span>
                    {item.author.firstName} {item.author.lastName}
                  </span>
                  <span>{dayjs(item.publishedAt).format('DD.MM.YYYY HH:mm')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .filters {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .news-grid {
          display: grid;
          gap: 1.5rem;
        }

        .news-card {
          overflow: hidden;
        }

        .news-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          margin: -1.5rem -1.5rem 1rem -1.5rem;
          width: calc(100% + 3rem);
        }

        .news-content h3 {
          margin: 0.5rem 0;
          font-size: 1.25rem;
        }

        .news-content p {
          color: var(--color-text-muted);
          margin-bottom: 1rem;
        }

        .news-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
