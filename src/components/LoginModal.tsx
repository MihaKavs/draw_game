import { useState } from 'react'

interface Props {
  onLogin: (name: string) => void
}

export default function LoginModal({ onLogin }: Props) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length >= 2) {
      onLogin(name.trim())
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal card">
        <h2>Dobrodošel/la v Dnevni risbi!</h2>
        <p className="modal-desc">
          Vpiši ime, da bodo prijatelji vedeli, kdo je narisal posamezno sliko.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Tvoje ime..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={20}
            className="name-input"
          />
          <button type="submit" className="btn btn-primary" disabled={name.trim().length < 2}>
            Začni
          </button>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal {
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        .modal h2 {
          margin-bottom: 0.5rem;
          font-size: 1.5rem;
        }
        .modal-desc {
          color: #64748b;
          margin-bottom: 1.5rem;
        }
        .name-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1rem;
          margin-bottom: 1rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .name-input:focus {
          border-color: #4361ee;
        }
        .modal .btn {
          width: 100%;
        }
      `}</style>
    </div>
  )
}
