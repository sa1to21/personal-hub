import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <h1>Добро пожаловать!</h1>
            <p className="user-email">{user?.email}</p>
          </div>
          <button onClick={logout} className="logout-btn">
            Выйти
          </button>
        </div>

        <div className="dashboard-content">
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
            <h2>Ваш Personal Hub готов к работе</h2>
            <p>Здесь скоро появятся задачи, заметки и другие модули для повышения продуктивности</p>
          </div>

          <div className="features-grid">
            <div className="feature-card coming-soon">
              <div className="feature-icon">📝</div>
              <h3>Задачи</h3>
              <p>Управление задачами с приоритетами и статусами</p>
              <span className="badge">Скоро</span>
            </div>

            <div className="feature-card coming-soon">
              <div className="feature-icon">📔</div>
              <h3>Заметки</h3>
              <p>Markdown заметки с тегами</p>
              <span className="badge">Скоро</span>
            </div>

            <div className="feature-card coming-soon">
              <div className="feature-icon">💪</div>
              <h3>Привычки</h3>
              <p>Трекер ежедневных привычек</p>
              <span className="badge">Скоро</span>
            </div>

            <div className="feature-card coming-soon">
              <div className="feature-icon">💰</div>
              <h3>Финансы</h3>
              <p>Учет доходов и расходов</p>
              <span className="badge">Скоро</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
