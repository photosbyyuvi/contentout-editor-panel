import { DELIVERABLE_LABELS, type DeliverableType } from './types'

// Part O1 — AI Mode. Built to target the Anthropic API (model `claude-sonnet-4-6`) via a
// server-side proxy; NO API key is handled in client code. In this no-backend build the
// calls are simulated locally behind this interface, so a real backend drops in by swapping
// these function bodies for fetches to `/api/ai/*` without touching any component.
export const AI_MODEL = 'claude-sonnet-4-6'

const LATENCY_MS = 600

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

export type BriefRequest = {
  clientName: string
  deliverableType: DeliverableType
  goal: string
}

export function generateBrief(request: BriefRequest): Promise<string> {
  const kind = DELIVERABLE_LABELS[request.deliverableType].toLowerCase()
  const goal = request.goal.trim() || 'drive awareness and trust'
  const lines = [
    `${request.clientName} ${kind}. Goal: ${goal}.`,
    'Open on the strongest moment. No slow intro. Get to the point in the first two seconds.',
    'Keep the cut clean and confident. One accent color, readable type, motion that guides not decorates.',
    'Close on a clear payoff: the offer, the result, or the call to action. Leave nothing ambiguous.',
  ]
  return delay(lines.join(' '))
}

export function summarizeFeedback(notes: string[]): Promise<string[]> {
  const cleaned = notes.map((note) => note.trim()).filter(Boolean)
  if (cleaned.length === 0) {
    return delay(['No open feedback to summarize.'])
  }
  // Condense into a crisp, actionable checklist.
  const checklist = cleaned.map((note) => {
    const trimmed = note.replace(/\.$/, '')
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  })
  return delay(checklist)
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type ChatContext = {
  firstName: string
  dueTodayTitles: string[]
  inReviewTitles: string[]
  overdueTitles: string[]
}

export function chat(messages: ChatMessage[], context: ChatContext): Promise<string> {
  const last = messages[messages.length - 1]?.content.toLowerCase() ?? ''

  if (last.includes('due') || last.includes('today')) {
    if (context.dueTodayTitles.length === 0 && context.overdueTitles.length === 0) {
      return delay(`Nothing is due today, ${context.firstName}. You're clear.`)
    }
    const parts: string[] = []
    if (context.overdueTitles.length > 0) {
      parts.push(`Overdue: ${context.overdueTitles.join(', ')}.`)
    }
    if (context.dueTodayTitles.length > 0) {
      parts.push(`Due soon: ${context.dueTodayTitles.join(', ')}.`)
    }
    return delay(parts.join(' '))
  }

  if (last.includes('review') || last.includes('waiting')) {
    return delay(
      context.inReviewTitles.length > 0
        ? `In review right now: ${context.inReviewTitles.join(', ')}.`
        : 'Nothing is sitting in review.',
    )
  }

  if (last.includes('status') || last.includes('update')) {
    return delay(
      `Draft status update: Wrapped the priority cuts, ${context.inReviewTitles.length} in review, ${context.overdueTitles.length} needing attention. Will deliver the rest on schedule.`,
    )
  }

  return delay(
    `Here to help with your work, ${context.firstName}. Ask me what's due, what's in review, to draft a status update, or to summarize a project.`,
  )
}
