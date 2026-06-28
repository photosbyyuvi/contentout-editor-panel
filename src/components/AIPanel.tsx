import { useMemo, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useApp, useVisibleProjects } from '../store'
import { PageHeader } from './PageHeader'
import { urgencyFor } from '../format'
import { AI_MODEL, chat, generateBrief, type ChatMessage } from '../ai'
import { USE_BACKEND } from '../config'
import { api } from '../lib/api'
import { DELIVERABLE_LABELS, type DeliverableType } from '../types'

const DELIVERABLES = Object.keys(DELIVERABLE_LABELS) as DeliverableType[]

export function AIPanel() {
  const { user, clients } = useApp()
  const projects = useVisibleProjects()

  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [deliverable, setDeliverable] = useState<DeliverableType>('reel')
  const [goal, setGoal] = useState('')
  const [brief, setBrief] = useState('')
  const [briefLoading, setBriefLoading] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const context = useMemo(() => {
    const active = projects.filter((p) => p.status !== 'approved')
    return {
      firstName: user?.fullName.split(' ')[0] ?? 'there',
      dueTodayTitles: active
        .filter((p) => urgencyFor(p.dueDate, p.status) === 'due_soon')
        .map((p) => p.title),
      inReviewTitles: projects.filter((p) => p.status === 'submitted').map((p) => p.title),
      overdueTitles: active
        .filter((p) => urgencyFor(p.dueDate, p.status) === 'overdue')
        .map((p) => p.title),
    }
  }, [projects, user])

  const onGenerate = () => {
    const client = clients.find((c) => c.id === clientId)
    setBriefLoading(true)
    generateBrief({ clientName: client?.name ?? 'Client', deliverableType: deliverable, goal }).then(
      (result) => {
        setBrief(result)
        setBriefLoading(false)
      },
    )
  }

  const onSend = async () => {
    const text = input.trim()
    if (!text || thinking) {
      return
    }
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setThinking(true)
    const scrollToEnd = () =>
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))

    if (USE_BACKEND) {
      // stream the reply token-by-token into a growing assistant bubble
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      try {
        await api.aiStream({ messages: next, context }, (chunk) => {
          setMessages((prev) => {
            const copy = prev.slice()
            const last = copy[copy.length - 1]
            if (last && last.role === 'assistant') {
              copy[copy.length - 1] = { role: 'assistant', content: last.content + chunk }
            }
            return copy
          })
          scrollToEnd()
        })
      } catch {
        const reply = await chat(next, context)
        setMessages((prev) => {
          const copy = prev.slice()
          copy[copy.length - 1] = { role: 'assistant', content: reply }
          return copy
        })
      }
      setThinking(false)
      scrollToEnd()
      return
    }

    const reply = await chat(next, context)
    setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    setThinking(false)
    scrollToEnd()
  }

  return (
    <>
      <PageHeader eyebrow="Assistant" title="AI Mode" />

      <section className="surface ai-disclaimer">
        <Sparkles size={16} aria-hidden="true" />
        <p className="muted">
          AI suggestions are drafts — review and edit before they take effect. Nothing is auto-sent or
          auto-approved. Model: <span className="tabular">{AI_MODEL}</span>.
        </p>
      </section>

      <section className="surface">
        <h2 className="section-head">Generate a brief</h2>
        <div className="ai-brief-fields">
          <label>
            <span>Client</span>
            <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Deliverable</span>
            <select value={deliverable} onChange={(event) => setDeliverable(event.target.value as DeliverableType)}>
              {DELIVERABLES.map((type) => (
                <option key={type} value={type}>
                  {DELIVERABLE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Goal</span>
            <input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="e.g. drive summer lease bookings" />
          </label>
          <button type="button" className="primary-button" onClick={onGenerate} disabled={briefLoading}>
            <Sparkles size={14} /> {briefLoading ? 'Generating…' : 'Generate brief'}
          </button>
        </div>
        {brief ? (
          <div className="ai-brief-output">
            <p className="ai-label">AI draft — editable</p>
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={5} aria-label="Generated brief" />
          </div>
        ) : null}
      </section>

      <section className="surface ai-chat">
        <h2 className="section-head">Assistant chat</h2>
        <div className="ai-messages" ref={scrollRef}>
          {messages.length === 0 ? (
            <p className="muted ai-hint">
              Ask “what's due today”, “what's in review”, or “draft a status update”.
            </p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`ai-bubble ai-bubble-${message.role}`}>
                {message.content}
              </div>
            ))
          )}
          {thinking && !USE_BACKEND ? <div className="ai-bubble ai-bubble-assistant ai-thinking">Thinking…</div> : null}
        </div>
        <div className="ai-compose">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSend()
              }
            }}
            placeholder="Ask the assistant…"
            aria-label="Message the assistant"
          />
          <button type="button" className="primary-button" onClick={onSend} disabled={thinking || input.trim().length === 0}>
            <Send size={14} /> Send
          </button>
        </div>
      </section>
    </>
  )
}
