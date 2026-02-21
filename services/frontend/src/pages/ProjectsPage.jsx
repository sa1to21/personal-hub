import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getProjects, createProject, updateProject, deleteProject, reorderProjects } from '../api/projects'
import './ProjectsPage.css'

const COLOR_OPTIONS = ['#5b5fc7', '#e74c3c', '#27ae60', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#e67e22']

const ProjectCardContent = ({ project, onEdit, onDelete, deletingId, confirmDelete, cancelDelete, style, isDragging, ...props }) => {
  const navigate = useNavigate()

  return (
    <div
      className={`project-card ${isDragging ? 'project-card-dragging' : ''}`}
      style={{ ...style, borderTopColor: project.color || '#5b5fc7' }}
      onClick={() => navigate(`/projects/${project.id}`)}
      {...props}
    >
      <div className="project-card-header">
        <h3 className="project-name">{project.name}</h3>
        <div className="project-actions">
          <button className="btn-icon-sm" onClick={(e) => onEdit(e, project)} title="Edit">&#9998;</button>
          {deletingId === project.id ? (
            <span className="confirm-delete-inline">
              <button className="btn-confirm-del" onClick={(e) => onDelete(e, project.id)}>Delete</button>
              <button className="btn-confirm-cancel" onClick={cancelDelete}>Cancel</button>
            </span>
          ) : (
            <button className="btn-icon-sm delete" onClick={(e) => confirmDelete(e, project.id)} title="Delete">&times;</button>
          )}
        </div>
      </div>
      {project.description && <p className="project-description">{project.description}</p>}
      <div className="project-stats">
        <span className="stat todo">{project.todo_count || 0} To Do</span>
        <span className="stat in-progress">{project.in_progress_count || 0} In Progress</span>
        <span className="stat review">{project.review_count || 0} Review</span>
        <span className="stat done">{project.done_count || 0} Done</span>
      </div>
      <div className="project-total">{project.total_tasks || 0} tasks total</div>
    </div>
  )
}

const SortableProjectCard = ({ project, ...cardProps }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProjectCardContent project={project} isDragging={isDragging} {...cardProps} />
    </div>
  )
}

const ProjectsPage = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', color: '#5b5fc7' })
  const [saving, setSaving] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
  const navigate = useNavigate()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const fetchProjects = async () => {
    try {
      setError('')
      const data = await getProjects()
      setProjects(data.projects)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const openCreateForm = () => {
    setFormData({ name: '', description: '', color: '#5b5fc7' })
    setEditingProject(null)
    setShowForm(true)
  }

  const openEditForm = (e, project) => {
    e.stopPropagation()
    e.preventDefault()
    setFormData({ name: project.name, description: project.description || '', color: project.color || '#5b5fc7' })
    setEditingProject(project)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData)
      } else {
        await createProject(formData)
      }
      setShowForm(false)
      setEditingProject(null)
      fetchProjects()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await deleteProject(id)
      setDeletingId(null)
      fetchProjects()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete project')
    }
  }

  const confirmDelete = (e, id) => {
    e.stopPropagation()
    e.preventDefault()
    setDeletingId(id)
  }

  const cancelDelete = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setDeletingId(null)
  }

  const handleDragStart = (event) => {
    const project = projects.find(p => p.id === event.active.id)
    if (project) setActiveProject(project)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveProject(null)

    if (!over || active.id === over.id) return

    const oldIndex = projects.findIndex(p => p.id === active.id)
    const newIndex = projects.findIndex(p => p.id === over.id)

    const newProjects = arrayMove(projects, oldIndex, newIndex)
    setProjects(newProjects)

    try {
      await reorderProjects(newProjects.map(p => p.id))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reorder projects')
      fetchProjects() // rollback
    }
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <div className="projects-header-left">
          <Link to="/dashboard" className="back-link">&#8592; Dashboard</Link>
          <h1>Projects</h1>
        </div>
        <button className="btn-primary" onClick={openCreateForm}>+ New Project</button>
      </div>

      {error && <div className="projects-error">{error}</div>}

      {loading ? (
        <div className="projects-loading">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="projects-empty">
          <div className="projects-empty-icon">📋</div>
          <h3>No projects yet</h3>
          <p>Create your first project to start organizing tasks</p>
          <button className="btn-primary" onClick={openCreateForm}>Create Project</button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={projects.map(p => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="projects-grid">
              {projects.map((project) => (
                <SortableProjectCard
                  key={project.id}
                  project={project}
                  onEdit={openEditForm}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                  confirmDelete={confirmDelete}
                  cancelDelete={cancelDelete}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeProject ? (
              <ProjectCardContent
                project={activeProject}
                isDragging
                onEdit={() => {}}
                onDelete={() => {}}
                deletingId={null}
                confirmDelete={() => {}}
                cancelDelete={() => {}}
                style={{ cursor: 'grabbing' }}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form className="project-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Project name"
                  maxLength={100}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-swatch ${formData.color === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                    />
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
