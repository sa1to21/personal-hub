import { useState, useEffect, useRef } from 'react'
import {
  getTask,
  updateTask,
  deleteTask,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  getProjectLabels,
  createLabel,
  attachLabel,
  removeLabel,
} from '../api/tasks'
import './TaskDetailPanel.css'

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const LABEL_COLORS = ['#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#1abc9c']

const TaskDetailPanel = ({ taskId, projectId, onClose, onUpdated, onStatusChange }) => {
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [descValue, setDescValue] = useState('')
  const [descFocused, setDescFocused] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState('')
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [projectLabels, setProjectLabels] = useState([])
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleRef = useRef(null)

  const fetchTask = async () => {
    try {
      setError('')
      const data = await getTask(taskId)
      setTask(data)
      setTitleValue(data.title)
      setDescValue(data.description || '')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  const fetchLabels = async () => {
    try {
      const data = await getProjectLabels(projectId)
      setProjectLabels(data.labels)
    } catch (err) {
      console.error('Failed to load labels', err)
    }
  }

  useEffect(() => {
    fetchTask()
  }, [taskId])

  useEffect(() => {
    if (showLabelManager) fetchLabels()
  }, [showLabelManager])

  const handleSaveTitle = async () => {
    setEditingTitle(false)
    if (titleValue.trim() && titleValue !== task.title) {
      await updateTask(taskId, { title: titleValue.trim() })
      fetchTask()
      onUpdated()
    } else {
      setTitleValue(task.title)
    }
  }

  const handleSaveDescription = async () => {
    setDescFocused(false)
    const newDesc = descValue.trim() || null
    if (newDesc !== (task.description || null)) {
      await updateTask(taskId, { description: newDesc })
      fetchTask()
      onUpdated()
    }
  }

  const handleStatusChange = async (newStatus) => {
    await updateTask(taskId, { status: newStatus })
    fetchTask()
    onStatusChange(taskId, newStatus)
    onUpdated()
  }

  const handlePriorityChange = async (newPriority) => {
    await updateTask(taskId, { priority: newPriority })
    fetchTask()
    onUpdated()
  }

  const handleDueDateChange = async (dateStr) => {
    await updateTask(taskId, { due_date: dateStr || null })
    fetchTask()
    onUpdated()
  }

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim()) return
    await addChecklistItem(taskId, { title: newCheckItem.trim() })
    setNewCheckItem('')
    fetchTask()
    onUpdated()
  }

  const handleToggleCheck = async (checkId) => {
    await toggleChecklistItem(checkId)
    fetchTask()
    onUpdated()
  }

  const handleDeleteCheck = async (checkId) => {
    await deleteChecklistItem(checkId)
    fetchTask()
    onUpdated()
  }

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return
    await createLabel(projectId, { name: newLabelName.trim(), color: newLabelColor })
    setNewLabelName('')
    fetchLabels()
  }

  const handleToggleLabel = async (labelId) => {
    const taskLabels = task.labels || []
    const isAttached = taskLabels.some((l) => l.id === labelId)
    if (isAttached) {
      await removeLabel(taskId, labelId)
    } else {
      await attachLabel(taskId, labelId)
    }
    fetchTask()
    onUpdated()
  }

  const handleDeleteTask = async () => {
    await deleteTask(taskId)
    onClose()
    onUpdated()
  }

  if (loading) {
    return (
      <div className="panel-overlay" onClick={onClose}>
        <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
          <div className="panel-loading">Loading...</div>
        </div>
      </div>
    )
  }

  if (!task) return null

  const checklist = task.checklist || []
  const taskLabels = task.labels || []
  const completedCount = checklist.filter((c) => c.is_completed).length
  const progressPercent = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <button className="panel-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="panel-error">{error}</div>}

        <div className="panel-body">
          {/* Title */}
          <div className="section-title">
            {editingTitle ? (
              <input
                ref={titleRef}
                className="title-input"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') {
                    setTitleValue(task.title)
                    setEditingTitle(false)
                  }
                }}
                autoFocus
              />
            ) : (
              <h2 className="task-title-display" onClick={() => setEditingTitle(true)}>
                {task.title}
              </h2>
            )}
          </div>

          {/* Labels on task */}
          {taskLabels.length > 0 && (
            <div className="task-labels-row">
              {taskLabels.map((l) => (
                <span key={l.id} className="label-pill-lg" style={{ backgroundColor: l.color }}>{l.name}</span>
              ))}
            </div>
          )}

          {/* Status + Priority + Due Date row */}
          <div className="meta-row">
            <div className="meta-item">
              <span className="meta-label">Status</span>
              <select
                className="meta-select"
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="meta-item">
              <span className="meta-label">Priority</span>
              <select
                className="meta-select"
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="meta-item">
              <span className="meta-label">Due Date</span>
              <input
                type="date"
                className="meta-input"
                value={task.due_date ? task.due_date.slice(0, 10) : ''}
                onChange={(e) => handleDueDateChange(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="section">
            <h4 className="section-heading">Description</h4>
            <textarea
              className={`desc-textarea ${descFocused ? 'focused' : ''}`}
              placeholder="Add a description..."
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onFocus={() => setDescFocused(true)}
              onBlur={handleSaveDescription}
              rows={3}
            />
          </div>

          {/* Checklist */}
          <div className="section">
            <div className="section-heading-row">
              <h4 className="section-heading">Checklist</h4>
              {checklist.length > 0 && (
                <span className="check-count">{completedCount}/{checklist.length}</span>
              )}
            </div>
            {checklist.length > 0 && (
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? '#10b981' : '#5b5fc7' }}
                />
              </div>
            )}
            <div className="checklist-items">
              {checklist.map((item) => (
                <div key={item.id} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    onChange={() => handleToggleCheck(item.id)}
                  />
                  <span className={`check-title ${item.is_completed ? 'completed' : ''}`}>
                    {item.title}
                  </span>
                  <button className="btn-check-delete" onClick={() => handleDeleteCheck(item.id)}>&times;</button>
                </div>
              ))}
            </div>
            <div className="checklist-add">
              <input
                type="text"
                placeholder="Add item..."
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCheckItem()
                }}
              />
              <button className="btn-primary btn-sm" onClick={handleAddCheckItem}>Add</button>
            </div>
          </div>

          {/* Labels */}
          <div className="section">
            <div className="section-heading-row">
              <h4 className="section-heading">Labels</h4>
              <button
                className="btn-text"
                onClick={() => setShowLabelManager(!showLabelManager)}
              >
                {showLabelManager ? 'Close' : 'Manage'}
              </button>
            </div>
            {showLabelManager && (
              <div className="label-manager">
                <div className="label-list">
                  {projectLabels.map((label) => {
                    const isActive = taskLabels.some((tl) => tl.id === label.id)
                    return (
                      <div
                        key={label.id}
                        className={`label-option ${isActive ? 'active' : ''}`}
                        onClick={() => handleToggleLabel(label.id)}
                      >
                        <span className="label-color-dot" style={{ backgroundColor: label.color }} />
                        <span className="label-name">{label.name}</span>
                        {isActive && <span className="label-check-mark">&#10003;</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="label-create">
                  <input
                    type="text"
                    placeholder="New label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateLabel()
                    }}
                  />
                  <div className="label-color-row">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`color-dot ${newLabelColor === c ? 'selected' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setNewLabelColor(c)}
                      />
                    ))}
                  </div>
                  <button className="btn-primary btn-sm" onClick={handleCreateLabel}>Create Label</button>
                </div>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="section timestamps">
            <span>Created: {new Date(task.created_at).toLocaleString('en-US')}</span>
            <span>Updated: {new Date(task.updated_at).toLocaleString('en-US')}</span>
          </div>

          {/* Delete */}
          <div className="section danger-section">
            {confirmDelete ? (
              <div className="confirm-delete-row">
                <span>Delete this task permanently?</span>
                <button className="btn-danger" onClick={handleDeleteTask}>Confirm Delete</button>
                <button className="btn-cancel btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn-danger-outline" onClick={() => setConfirmDelete(true)}>Delete Task</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetailPanel
