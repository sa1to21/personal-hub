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
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

const SortableTaskCard = ({ task, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
    filtered.sort((a, b) => a.position - b.position)
    return filtered
  }

  const findColumnForTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    return task ? task.status : null
  }

  const handleDragStart = (event) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    if (task) setActiveTask(task)
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
    setTasks((prev) => {
      const task = prev.find(t => t.id === activeId)
      if (!task) return prev

      const destTasks = prev.filter(t => t.status === overColumn && t.id !== activeId)
      let newIndex = destTasks.length

      if (overId !== overColumn) {
        // Dropped over a specific task
        const overTask = prev.find(t => t.id === overId)
        if (overTask) {
          newIndex = destTasks.findIndex(t => t.id === overId)
          if (newIndex === -1) newIndex = destTasks.length
        }
      }

      const updated = prev.map(t => {
        if (t.id === activeId) {
          return { ...t, status: overColumn, position: newIndex }
        }
        return t
      })

      // Recalculate positions in dest column
      const destItems = updated
        .filter(t => t.status === overColumn)
        .sort((a, b) => {
          if (a.id === activeId) return 0
          if (b.id === activeId) return 0
          return a.position - b.position
        })

      return updated
    })
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id
    const overId = over.id

    const activeTask = tasksRef.current.find(t => t.id === activeId)
    if (!activeTask) return

    // Determine target column
    const targetColumn = COLUMNS.find(c => c.key === overId)
      ? overId
      : findColumnForTask(overId) || activeTask.status

    // Get current tasks in target column (excluding active)
    const columnTasks = tasksRef.current
      .filter(t => t.status === targetColumn && t.id !== activeId)
      .sort((a, b) => a.position - b.position)

    // Determine new position
    let newPosition
    if (overId === targetColumn || !over.data?.current) {
      // Dropped on empty column or column itself
      newPosition = columnTasks.length
    } else {
      // Dropped on a task
      const overIndex = columnTasks.findIndex(t => t.id === overId)
      if (overIndex === -1) {
        newPosition = columnTasks.length
      } else {
        newPosition = overIndex
      }
    }

    // Optimistic update
    setTasks((prev) => {
      const updated = prev.map(t => {
        if (t.id === activeId) {
          return { ...t, status: targetColumn, position: newPosition }
        }
        return t
      })

      // Recalculate all positions in the target column
      const inColumn = updated
        .filter(t => t.status === targetColumn)
        .sort((a, b) => {
          if (a.id === activeId) return -1
          if (b.id === activeId) return 1
          return a.position - b.position
        })

      // Insert at correct position
      const withoutActive = inColumn.filter(t => t.id !== activeId)
      const activeItem = inColumn.find(t => t.id === activeId)
      withoutActive.splice(newPosition, 0, activeItem)

      const positionMap = {}
      withoutActive.forEach((t, i) => { positionMap[t.id] = i })

      return updated.map(t => {
        if (positionMap[t.id] !== undefined) {
          return { ...t, position: positionMap[t.id] }
        }
        return t
      })
    })

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
                  <SortableContext
                    items={columnTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onSelect={handleTaskSelect}
                      />
                    ))}
                  </SortableContext>

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
