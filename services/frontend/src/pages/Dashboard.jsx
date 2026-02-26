import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DailyNotes from '../components/DailyNotes'
import './Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <h1>Welcome back!</h1>
            <p className="user-email">{user?.email}</p>
          </div>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>

        <div className="dashboard-content">
          <DailyNotes />

          <div className="features-grid">
            <Link to="/projects" className="feature-card-link">
              <div className="feature-card active">
                <div className="feature-icon">📝</div>
                <h3>Projects</h3>
                <p>Kanban boards with tasks, checklists and labels</p>
                <span className="badge">Open</span>
              </div>
            </Link>

            <div className="feature-card coming-soon">
              <div className="feature-icon">📔</div>
              <h3>Notes</h3>
              <p>Markdown notes with tags</p>
              <span className="badge">Soon</span>
            </div>

            <div className="feature-card coming-soon">
              <div className="feature-icon">💪</div>
              <h3>Habits</h3>
              <p>Daily habits tracker</p>
              <span className="badge">Soon</span>
            </div>
          </div>

          <div className="welcome-section">
            <div className="icon-circle">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2>Your Personal Hub is ready</h2>
            <p>Tasks, notes and other productivity modules will appear here soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
