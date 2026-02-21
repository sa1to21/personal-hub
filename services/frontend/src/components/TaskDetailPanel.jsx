import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getTask,
  updateTask,
  deleteTask,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  reorderChecklist,
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

const SortableChecklistItem = ({ item, onToggle, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`checklist-item ${isDragging ? 'checklist-item-dragging' : ''}`}>
      <span className="drag-handle" {...attributes} {...listeners}>&#x2630;</span>
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={() => onToggle(item.id)}
      />
      <span className={`check-title ${item.is_completed ? 'completed' : ''}`}>
        {item.title}
      </span>
      <button className="btn-check-delete" onClick={() => onDelete(item.id)}>&times;</button>
    </div>
  )
}

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

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
      const newTitle = titleValue.trim()
      setTask((prev) => ({ ...prev, title: newTitle }))
      await updateTask(taskId, { title: newTitle })
      onUpdated()
    } else {
      setTitleValue(task.title)
    }
  }

  const handleSaveDescription = async () => {
    setDescFocused(false)
    const newDesc = descValue.trim() || null
    if (newDesc !== (task.description || null)) {
      setTask((prev) => ({ ...prev, description: newDesc }))
      await updateTask(taskId, { description: newDesc })
    }
  }

  const handleStatusChange = async (newStatus) => {
    setTask((prev) => ({ ...prev, status: newStatus }))
    await updateTask(taskId, { status: newStatus })
    onStatusChange(taskId, newStatus)
    onUpdated()
  }

  const handlePriorityChange = async (newPriority) => {
    setTask((prev) => ({ ...prev, priority: newPriority }))
    await updateTask(taskId, { priority: newPriority })
    onUpdated()
  }

  const handleDueDateChange = async (dateStr) => {
    const newDate = dateStr || null
    setTask((prev) => ({ ...prev, due_date: newDate }))
    await updateTask(taskId, { due_date: newDate })
    onUpdated()
  }

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim()) return
    const title = newCheckItem.trim()
    setNewCheckItem('')
    const result = await addChecklistItem(taskId, { title })
    setTask((prev) => ({
      ...prev,
      checklist: [...(prev.checklist || []), result],
    }))
  }

  const handleToggleCheck = async (checkId) => {
    setTask((prev) => ({
      ...prev,
      checklist: prev.checklist.map((c) =>
        c.id === checkId ? { ...c, is_completed: !c.is_completed } : c
      ),
    }))
    await toggleChecklistItem(checkId)
  }

  const handleDeleteCheck = async (checkId) => {
    setTask((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((c) => c.id !== checkId),
    }))
    await deleteChecklistItem(checkId)
  }

  const handleChecklistDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const checklist = task.checklist || []
    const oldIndex = checklist.findIndex((c) => c.id === active.id)
    const newIndex = checklist.findIndex((c) => c.id === over.id)

    const newChecklist = arrayMove(checklist, oldIndex, newIndex)
    setTask((prev) => ({ ...prev, checklist: newChecklist }))

    try {
      await reorderChecklist(taskId, newChecklist.map((c) => c.id))
    } catch (err) {
      setTask((prev) => ({ ...prev, checklist })) // rollback
    }
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
      setTask((prev) => ({
        ...prev,
        labels: prev.labels.filter((l) => l.id !== labelId),
      }))
      await removeLabel(taskId, labelId)
    } else {
      const label = projectLabels.find((l) => l.id === labelId)
      if (label) {
        setTask((prev) => ({
          ...prev,
          labels: [...(prev.labels || []), { id: label.id, name: label.name, color: label.color }],
        }))
      }
      await attachLabel(taskId, labelId)
    }
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChecklistDragEnd}
            >
              <SortableContext
                items={checklist.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="checklist-items">
                  {checklist.map((item) => (
                    <SortableChecklistItem
                      key={item.id}
                      item={item}
                      onToggle={handleToggleCheck}
                      onDelete={handleDeleteCheck}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
