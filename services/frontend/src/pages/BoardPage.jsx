import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { getProject } from '../api/projects'
import { getProjectTasks, createTask, reorderTask } from '../api/tasks'
import TaskCard from '../components/TaskCard'
import TaskDetailPanel from '../components/TaskDetailPanel'
import './BoardPage.css'

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#3b82f6' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'review', label: 'Review', color: '#8b5cf6' },
  { key: 'done', label: 'Done', color: '#10b981' },
]

const PRIORITIES = ['urgent', 'high', 'medium', 'low']
const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 }

const DraggableTaskCard = ({ task, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: task.id, data: { type: 'task', task } })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      isDragging={isDragging}
      style={style}
      onClick={() => onSelect(task)}
      {...attributes}
      {...listeners}
    />
  )
}

const DroppableColumn = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column' } })

  return (
    <div ref={setNodeRef} className={`column-body ${isOver ? 'column-body-over' : ''}`}>
      {children}
    </div>
  )
}

const BoardPage = () => {
  const { id: projectId } = useParams()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [addingToColumn, setAddingToColumn] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [priorityFilter, setPriorityFilter] = useState(null)
  const [activeTask, setActiveTask] = useState(null)
  const dragSourceColumn = useRef(null)
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const fetchData = useCallback(async () => {
    try {
      setError('')
      const [proj, tasksData] = await Promise.all([
        getProject(projectId),
        getProjectTasks(projectId, { sort_by: 'position', order: 'asc' }),
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

  const handleTaskUpdated = () => {
    fetchData()
  }

  const handleTaskSelect = (task) => {
    if (!activeTask) {
      setSelectedTask(task)
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return
      const columnTasks = tasks.filter(t => t.status === newStatus)
      const newPosition = columnTasks.length
      await reorderTask(taskId, { status: newStatus, position: newPosition })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status')
    }
  }

  const getColumnTasks = (status) => {
    let filtered = tasks.filter((t) => t.status === status)
    if (priorityFilter) {
      filtered = filtered.filter((t) => t.priority === priorityFilter)
    }
    filtered.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 4
      const pb = PRIORITY_ORDER[b.priority] ?? 4
      if (pa !== pb) return pa - pb
      return a.position - b.position
    })
    return filtered
  }

  const findColumnForTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    return task ? task.status : null
  }

  const handleDragStart = (event) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    if (task) {
      setActiveTask(task)
      dragSourceColumn.current = task.status
    }
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    const activeColumn = findColumnForTask(activeId)
    // Over could be a column id or a task id
    const overColumn = COLUMNS.find(c => c.key === overId)
      ? overId
      : findColumnForTask(overId)

    if (!activeColumn || !overColumn || activeColumn === overColumn) return

    // Move task to new column optimistically
    setTasks((prev) =>
      prev.map(t =>
        t.id === activeId ? { ...t, status: overColumn } : t
      )
    )
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) {
      // Revert optimistic update from handleDragOver
      if (dragSourceColumn.current) {
        setTasks((prev) =>
          prev.map(t =>
            t.id === active.id ? { ...t, status: dragSourceColumn.current } : t
          )
        )
      }
      dragSourceColumn.current = null
      return
    }

    const activeId = active.id
    const overId = over.id

    const activeTask = tasksRef.current.find(t => t.id === activeId)
    if (!activeTask) return

    // Determine target column
    const targetColumn = COLUMNS.find(c => c.key === overId)
      ? overId
      : findColumnForTask(overId) || activeTask.status

    // Prevent within-column reordering — tasks auto-sort by priority
    if (dragSourceColumn.current === targetColumn) {
      dragSourceColumn.current = null
      return
    }

    // Place at the end of the target column
    const columnTasks = tasksRef.current
      .filter(t => t.status === targetColumn && t.id !== activeId)
    const newPosition = columnTasks.length

    // Optimistic update
    setTasks((prev) =>
      prev.map(t =>
        t.id === activeId ? { ...t, status: targetColumn, position: newPosition } : t
      )
    )

    dragSourceColumn.current = null

    // API call
    try {
      await reorderTask(activeId, { status: targetColumn, position: newPosition })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reorder task')
      fetchData() // Rollback on error
    }
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

      <div className="board-filter-bar">
        <span className="filter-label">Priority:</span>
        <button
          className={`filter-btn ${!priorityFilter ? 'active' : ''}`}
          onClick={() => setPriorityFilter(null)}
        >
          All
        </button>
        {PRIORITIES.map((p) => (
          <button
            key={p}
            className={`filter-btn filter-priority-${p} ${priorityFilter === p ? 'active' : ''}`}
            onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
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
                </div>

                <DroppableColumn id={col.key}>
                    {columnTasks.map((task) => (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        onSelect={handleTaskSelect}
                      />
                    ))}

                  {columnTasks.length === 0 && addingToColumn !== col.key && (
                    <div className="column-empty">No tasks</div>
                  )}

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

                  {addingToColumn !== col.key && (
                    <button
                      className="btn-add-task"
                      onClick={() => {
                        setAddingToColumn(col.key)
                        setNewTaskTitle('')
                      }}
                    >
                      + Add task
                    </button>
                  )}
                </DroppableColumn>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging style={{ cursor: 'grabbing' }} />
          ) : null}
        </DragOverlay>
      </DndContext>

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
