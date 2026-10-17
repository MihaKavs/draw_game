import { Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import DrawPage from './pages/DrawPage'
import VotePage from './pages/VotePage'
import GalleryPage from './pages/GalleryPage'
import LeaderboardPage from './pages/LeaderboardPage'
import LoginModal from './components/LoginModal'
import { getCurrentUser, setCurrentUser, logout } from './utils/storage'
import type { User } from './types'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    const current = getCurrentUser()
    if (current) {
      setUser(current)
    } else {
      setShowLogin(true)
    }
  }, [])

  const handleLogin = (name: string) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name: name.trim(),
      points: 0,
    }
    setCurrentUser(newUser)
    setUser(newUser)
    setShowLogin(false)
  }

  const handleLogout = () => {
    logout()
    setUser(null)
    setShowLogin(true)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="container header-inner">
          <h1 className="logo">
            <span className="logo-icon">✏️</span> Dnevna risba
          </h1>

          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Riši
            </NavLink>
            <NavLink to="/vote" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Glasuj
            </NavLink>
            <NavLink to="/gallery" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Galerija
            </NavLink>
            <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Lestvica
            </NavLink>
          </nav>

          <div className="user-area">
            {user ? (
              <>
                <span className="user-name">Živjo, {user.name}</span>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                  Odjava
                </button>
              </>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setShowLogin(true)}>
                Prijava
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<DrawPage user={user} />} />
          <Route path="/vote" element={<VotePage user={user} />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
      </main>

      {showLogin && <LoginModal onLogin={handleLogin} />}
    </div>
  )
}

export default App
