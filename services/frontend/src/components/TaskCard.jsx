import { forwardRef } from 'react'
import './TaskCard.css'

const PRIORITY_COLORS = {
  urgent: '#dc2626',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
}

const PRIORITY_LABELS = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const TaskCard = forwardRef(({ task, onClick, isDragging, dragHandleProps, style, ...props }, ref) => {
  const checklist = task.checklist || []
  const labels = task.labels || []
  const completedCount = checklist.filter((c) => c.is_completed).length
  const totalCount = checklist.length

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      ref={ref}
      className={`task-card ${isDragging ? 'task-card-dragging' : ''}`}
      onClick={onClick}
      style={style}
      {...props}
    >
      <div className="task-card-priority-bar" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
      <div className="task-card-body">
        {labels.length > 0 && (
          <div className="task-card-labels">
            {labels.map((label) => (
              <span key={label.id} className="label-pill" style={{ backgroundColor: label.color }}>
                {label.name}
              </span>
            ))}
          </div>
        )}
        <div className="task-card-title">{task.title}</div>
        <div className="task-card-footer">
          <div className="task-card-badges">
            <span className={`priority-badge ${task.priority}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.due_date && (
              <span className={`due-badge ${isOverdue ? 'overdue' : ''}`}>
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
          {totalCount > 0 && (
            <div className={`checklist-progress ${completedCount === totalCount ? 'complete' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span>{completedCount}/{totalCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

TaskCard.displayName = 'TaskCard'

export default TaskCard
