import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProjects, createProject, updateProject, deleteProject } from '../api/projects'
import './ProjectsPage.css'

const COLOR_OPTIONS = ['#5b5fc7', '#e74c3c', '#27ae60', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#e67e22']

const ProjectsPage = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', color: '#5b5fc7' })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

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
        <div className="projects-grid">
          {projects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              style={{ borderTopColor: project.color || '#5b5fc7' }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="project-card-header">
                <h3 className="project-name">{project.name}</h3>
                <div className="project-actions">
                  <button className="btn-icon-sm" onClick={(e) => openEditForm(e, project)} title="Edit">&#9998;</button>
                  {deletingId === project.id ? (
                    <span className="confirm-delete-inline">
                      <button className="btn-confirm-del" onClick={(e) => handleDelete(e, project.id)}>Delete</button>
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
          ))}
        </div>
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
