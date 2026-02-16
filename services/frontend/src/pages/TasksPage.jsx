import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getTasks, createTask, updateTask, deleteTask } from '../api/tasks'
import TaskForm from '../components/TaskForm'
import './TasksPage.css'

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const TasksPage = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ status: '', priority: '', sort_by: 'created_at', order: 'desc' })
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const fetchTasks = useCallback(async () => {
    try {
      setError('')
      const data = await getTasks(filters)
      setTasks(data.tasks)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleCreate = async (data) => {
    await createTask(data)
    setShowForm(false)
    fetchTasks()
  }

  const handleUpdate = async (data) => {
    await updateTask(editingTask.id, data)
    setEditingTask(null)
    fetchTasks()
  }

  const handleDelete = async (id) => {
    try {
      await deleteTask(id)
      setDeletingId(null)
      fetchTasks()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete task')
    }
  }

  const handleToggleDone = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    try {
      await updateTask(task.id, { status: newStatus })
      fetchTasks()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task')
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const isOverdue = (dateStr) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  return (
    <div className="tasks-container">
      <div className="tasks-card">
        <div className="tasks-header">
          <div className="tasks-header-left">
            <Link to="/dashboard" className="back-link">
              ← Dashboard
            </Link>
            <h1>Tasks</h1>
          </div>
          <button className="btn-add" onClick={() => setShowForm(true)}>
            + New Task
          </button>
        </div>

        <div className="tasks-filters">
          <div className="filter-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="">All</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Priority</label>
            <select value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}>
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort</label>
            <select value={filters.sort_by} onChange={(e) => handleFilterChange('sort_by', e.target.value)}>
              <option value="created_at">Created</option>
              <option value="updated_at">Updated</option>
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Order</label>
            <select value={filters.order} onChange={(e) => handleFilterChange('order', e.target.value)}>
              <option value="desc">Newest</option>
              <option value="asc">Oldest</option>
            </select>
          </div>
        </div>

        {error && <div className="tasks-error">{error}</div>}

        {loading ? (
          <div className="tasks-loading">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="tasks-empty">
            <div className="tasks-empty-icon">📋</div>
            <h3>No tasks yet</h3>
            <p>Create your first task to get started</p>
          </div>
        ) : (
          <div className="tasks-list">
            {tasks.map((task) => (
              <div key={task.id} className={`task-item ${task.status === 'done' ? 'done' : ''}`}>
                <div className="task-checkbox">
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => handleToggleDone(task)}
                  />
                </div>

                <div className="task-body">
                  <div className="task-title">{task.title}</div>
                  {task.description && <div className="task-description">{task.description}</div>}
                  <div className="task-meta">
                    <span className={`badge-status ${task.status}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    <span className={`badge-priority ${task.priority}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.due_date && (
                      <span className={`badge-due ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : ''}`}>
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>

                  {deletingId === task.id && (
                    <div className="confirm-delete">
                      <span>Delete this task?</span>
                      <button className="btn-confirm-delete" onClick={() => handleDelete(task.id)}>Delete</button>
                      <button className="btn-confirm-cancel" onClick={() => setDeletingId(null)}>Cancel</button>
                    </div>
                  )}
                </div>

                <div className="task-actions">
                  <button className="btn-icon" onClick={() => setEditingTask(task)} title="Edit">
                    ✏️
                  </button>
                  <button className="btn-icon delete" onClick={() => setDeletingId(task.id)} title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <TaskForm onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}

      {editingTask && (
        <TaskForm task={editingTask} onSave={handleUpdate} onClose={() => setEditingTask(null)} />
      )}
    </div>
  )
}

export default TasksPage
