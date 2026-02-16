import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProject } from '../api/projects'
import { getProjectTasks, createTask, updateTaskStatus } from '../api/tasks'
import TaskCard from '../components/TaskCard'
import TaskDetailPanel from '../components/TaskDetailPanel'
import './BoardPage.css'

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#3b82f6' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'review', label: 'Review', color: '#8b5cf6' },
  { key: 'done', label: 'Done', color: '#10b981' },
]

const BoardPage = () => {
  const { id: projectId } = useParams()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [addingToColumn, setAddingToColumn] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setError('')
      const [proj, tasksData] = await Promise.all([
        getProject(projectId),
        getProjectTasks(projectId),
      ])
      setProject(proj)
      setTasks(tasksData.tasks)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleQuickAdd = async (status) => {
    if (!newTaskTitle.trim()) return
    try {
      await createTask(projectId, { title: newTaskTitle.trim(), status })
      setNewTaskTitle('')
      setAddingToColumn(null)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task')
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status')
    }
  }

  const handleTaskUpdated = () => {
    fetchData()
  }

  const handleTaskSelect = (task) => {
    setSelectedTask(task)
  }

  const getColumnTasks = (status) => {
    return tasks.filter((t) => t.status === status)
  }

  if (loading) {
    return <div className="board-loading">Loading board...</div>
  }

  return (
    <div className="board-container">
      <div className="board-header">
        <div className="board-header-left">
          <Link to="/projects" className="back-link">&#8592; Projects</Link>
          <div className="board-title-section">
            <h1 style={{ color: project?.color || '#1a1a2e' }}>{project?.name}</h1>
            {project?.description && <p className="board-description">{project.description}</p>}
          </div>
        </div>
      </div>

      {error && <div className="board-error">{error}</div>}

      <div className="board-columns">
        {COLUMNS.map((col) => {
          const columnTasks = getColumnTasks(col.key)
          return (
            <div key={col.key} className="board-column">
              <div className="column-header">
                <div className="column-header-left">
                  <span className="column-dot" style={{ backgroundColor: col.color }} />
                  <h3>{col.label}</h3>
                  <span className="column-count">{columnTasks.length}</span>
                </div>
                <button
                  className="btn-add-card"
                  onClick={() => {
                    setAddingToColumn(col.key)
                    setNewTaskTitle('')
                  }}
                  title="Add card"
                >
                  +
                </button>
              </div>

              <div className="column-body">
                {addingToColumn === col.key && (
                  <div className="quick-add-form">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAdd(col.key)
                        if (e.key === 'Escape') setAddingToColumn(null)
                      }}
                    />
                    <div className="quick-add-actions">
                      <button className="btn-primary btn-sm" onClick={() => handleQuickAdd(col.key)}>Add</button>
                      <button className="btn-cancel btn-sm" onClick={() => setAddingToColumn(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskSelect(task)}
                  />
                ))}

                {columnTasks.length === 0 && addingToColumn !== col.key && (
                  <div className="column-empty">No tasks</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedTask && (
        <TaskDetailPanel
          taskId={selectedTask.id}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

export default BoardPage
