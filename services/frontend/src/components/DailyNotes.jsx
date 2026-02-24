import { useState, useEffect, useRef, useCallback } from 'react'
import { getDailyNote, saveDailyNote } from '../api/notes'
import './DailyNotes.css'

const DailyNotes = () => {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const saveTimerRef = useRef(null)

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
          <span className="daily-notes-icon">&#128221;</span>
          <h3>Daily Notes</h3>
          <span className="daily-notes-date">{today}</span>
        </div>
        {saving && <span className="daily-notes-saving">Saving...</span>}
      </div>
      <div className="daily-notes-body">
        <textarea
          className="daily-notes-textarea"
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Write your daily notes here..."
        />
      </div>
    </div>
  )
}

export default DailyNotes
