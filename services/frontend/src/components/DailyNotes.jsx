import { useState, useEffect, useRef, useCallback } from 'react'
import { getDailyNote, saveDailyNote } from '../api/notes'
import './DailyNotes.css'

const renderMarkdown = (text) => {
  if (!text) return ''

  const escapeHtml = (str) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const lines = text.split('\n')
  let html = ''
  let inCodeBlock = false
  let codeBlockContent = ''
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code>${escapeHtml(codeBlockContent.trimEnd())}</code></pre>`
        codeBlockContent = ''
        inCodeBlock = false
      } else {
        if (inList) { html += '</ul>'; inList = false }
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n'
      continue
    }

    // Close list if line is not a list item
    if (inList && !line.match(/^\s*[-*]\s/)) {
      html += '</ul>'
      inList = false
    }

    // Empty line
    if (!line.trim()) {
      if (!inList) html += '<br/>'
      continue
    }

    // Headers
    const h3 = line.match(/^###\s+(.+)/)
    if (h3) { html += `<h4>${formatInline(escapeHtml(h3[1]))}</h4>`; continue }
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) { html += `<h3>${formatInline(escapeHtml(h2[1]))}</h3>`; continue }
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) { html += `<h2>${formatInline(escapeHtml(h1[1]))}</h2>`; continue }

    // List items
    const li = line.match(/^\s*[-*]\s+(.+)/)
    if (li) {
      if (!inList) { html += '<ul>'; inList = true }
      html += `<li>${formatInline(escapeHtml(li[1]))}</li>`
      continue
    }

    // Regular paragraph
    html += `<p>${formatInline(escapeHtml(line))}</p>`
  }

  if (inCodeBlock) {
    html += `<pre><code>${escapeHtml(codeBlockContent.trimEnd())}</code></pre>`
  }
  if (inList) html += '</ul>'

  return html
}

const formatInline = (text) => {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

const DailyNotes = () => {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const saveTimerRef = useRef(null)
  const textareaRef = useRef(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const load = async () => {
      try {
        const note = await getDailyNote(today)
        setContent(note.content || '')
        setSavedContent(note.content || '')
      } catch (err) {
        console.error('Failed to load daily note:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today])

  const save = useCallback(async (text) => {
    if (text === savedContent) return
    setSaving(true)
    try {
      await saveDailyNote(text, today)
      setSavedContent(text)
    } catch (err) {
      console.error('Failed to save daily note:', err)
    } finally {
      setSaving(false)
    }
  }, [savedContent, today])

  const handleChange = (e) => {
    const val = e.target.value
    setContent(val)

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => save(val), 1500)
  }

  const handleBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    save(content)
  }

  const switchToEdit = () => {
    setIsEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const switchToPreview = () => {
    setIsEditing(false)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    save(content)
  }

  if (loading) {
    return (
      <div className="daily-notes">
        <div className="daily-notes-header">
          <h3>Daily Notes</h3>
        </div>
        <div className="daily-notes-body loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="daily-notes">
      <div className="daily-notes-header">
        <div className="daily-notes-title">
          <span className="daily-notes-icon">📝</span>
          <h3>Daily Notes</h3>
          <span className="daily-notes-date">{today}</span>
        </div>
        <div className="daily-notes-actions">
          {saving && <span className="daily-notes-saving">Saving...</span>}
          <button
            className={`daily-notes-tab ${isEditing ? 'active' : ''}`}
            onClick={switchToEdit}
          >
            Edit
          </button>
          <button
            className={`daily-notes-tab ${!isEditing ? 'active' : ''}`}
            onClick={switchToPreview}
          >
            Preview
          </button>
        </div>
      </div>
      <div className="daily-notes-body">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="daily-notes-textarea"
            value={content}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Write your daily notes here... (supports Markdown)"
          />
        ) : (
          <div
            className="daily-notes-preview markdown-content"
            onClick={switchToEdit}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
        {!isEditing && !content && (
          <div className="daily-notes-empty" onClick={switchToEdit}>
            Click to start writing...
          </div>
        )}
      </div>
    </div>
  )
}

export default DailyNotes
