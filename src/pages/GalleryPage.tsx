import { useState, useEffect } from 'react'
import type { Drawing } from '../types'
import { getDrawings } from '../utils/storage'

export default function GalleryPage() {
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [filterWord, setFilterWord] = useState<string>('all')

  useEffect(() => {
    const all = getDrawings().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    setDrawings(all)
  }, [])

  const words = [...new Set(drawings.map((d) => d.promptWord))]

  const filtered =
    filterWord === 'all'
      ? drawings
      : drawings.filter((d) => d.promptWord === filterWord)

  return (
    <div className="container">
      <div className="gallery-header">
        <h2>Vse risbe</h2>
        <p className="subtitle">
          {drawings.length} {drawings.length === 1 ? 'risba' : drawings.length === 2 ? 'risbi' : 'risb'} do zdaj
        </p>

        {words.length > 0 && (
          <div className="filters">
            <button
              className={`filter-btn ${filterWord === 'all' ? 'active' : ''}`}
              onClick={() => setFilterWord('all')}
            >
              Vse
            </button>
            {words.map((w) => (
              <button
                key={w}
                className={`filter-btn ${filterWord === w ? 'active' : ''}`}
                onClick={() => setFilterWord(w)}
              >
                {w}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card empty">
          <p>Še ni risb. Bodi prvi/a danes!</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {filtered.map((d) => (
            <div key={d.id} className="gallery-card">
              <img src={d.imageUrl} alt={`${d.promptWord} od ${d.userName}`} />
              <div className="meta">
                <span className="word-tag">{d.promptWord}</span>
                <span className="artist">{d.userName}</span>
                <span className="date">
                  {new Date(d.createdAt).toLocaleDateString('sl-SI')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .gallery-header {
          margin-bottom: 1.75rem;
        }
        .gallery-header h2 {
          font-size: 1.6rem;
          margin-bottom: 0.25rem;
        }
        .subtitle {
          color: #64748b;
          margin-bottom: 1.25rem;
        }
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .filter-btn {
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: white;
          font-weight: 600;
          font-size: 0.85rem;
          color: #475569;
          transition: all 0.15s;
        }
        .filter-btn:hover {
          border-color: #4361ee;
          color: #4361ee;
        }
        .filter-btn.active {
          background: #4361ee;
          border-color: #4361ee;
          color: white;
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.25rem;
        }
        .gallery-card {
          background: white;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }
        .gallery-card img {
          width: 100%;
          aspect-ratio: 7/5;
          object-fit: contain;
          background: #f8fafc;
          display: block;
        }
        .meta {
          padding: 0.75rem 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        .word-tag {
          background: #e0e7ff;
          color: #3730a3;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
        }
        .artist {
          font-weight: 600;
          font-size: 0.9rem;
          color: #1e293b;
        }
        .date {
          margin-left: auto;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .empty {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }
      `}</style>
    </div>
  )
}
