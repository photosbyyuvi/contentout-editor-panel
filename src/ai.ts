import { DELIVERABLE_LABELS, type DeliverableType } from './types'
import { USE_BACKEND } from './config'
import { api } from './lib/api'

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
  if (USE_BACKEND) {
    return api
      .ai<string>('brief', request)
      .then((r) => r.result)
      .catch(() => localBrief(request))
  }
  return delay(localBrief(request))
}

function localBrief(request: BriefRequest): string {
  const kind = DELIVERABLE_LABELS[request.deliverableType].toLowerCase()
  const goal = request.goal.trim() || 'drive awareness and trust'
  const lines = [
    `${request.clientName} ${kind}. Goal: ${goal}.`,
    'Open on the strongest moment. No slow intro. Get to the point in the first two seconds.',
    'Keep the cut clean and confident. One accent color, readable type, motion that guides not decorates.',
    'Close on a clear payoff: the offer, the result, or the call to action. Leave nothing ambiguous.',
  ]
  return lines.join(' ')
}

export function summarizeFeedback(notes: string[]): Promise<string[]> {
  if (USE_BACKEND) {
    return api
      .ai<string[]>('summary', { notes })
      .then((r) => r.result)
      .catch(() => localSummary(notes))
  }
  return delay(localSummary(notes))
}

function localSummary(notes: string[]): string[] {
  const cleaned = notes.map((note) => note.trim()).filter(Boolean)
  if (cleaned.length === 0) {
    return ['No open feedback to summarize.']
  }
  return cleaned.map((note) => {
    const trimmed = note.replace(/\.$/, '')
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  })
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type ChatContext = {
  firstName: string
  dueTodayTitles: string[]
  inReviewTitles: string[]
  overdueTitles: string[]
}

export function chat(messages: ChatMessage[], context: ChatContext): Promise<string> {
  if (USE_BACKEND) {
    return api
      .ai<string>('chat', { messages, context })
      .then((r) => r.result)
      .catch(() => localChat(messages, context))
  }
  return delay(localChat(messages, context))
}

function localChat(messages: ChatMessage[], context: ChatContext): string {
  const last = messages[messages.length - 1]?.content.toLowerCase() ?? ''

  if (last.includes('due') || last.includes('today')) {
    if (context.dueTodayTitles.length === 0 && context.overdueTitles.length === 0) {
      return `Nothing is due today, ${context.firstName}. You're clear.`
    }
    const parts: string[] = []
    if (context.overdueTitles.length > 0) {
      parts.push(`Overdue: ${context.overdueTitles.join(', ')}.`)
    }
    if (context.dueTodayTitles.length > 0) {
      parts.push(`Due soon: ${context.dueTodayTitles.join(', ')}.`)
    }
    return parts.join(' ')
  }

  if (last.includes('review') || last.includes('waiting')) {
    return context.inReviewTitles.length > 0
      ? `In review right now: ${context.inReviewTitles.join(', ')}.`
      : 'Nothing is sitting in review.'
  }

  if (last.includes('status') || last.includes('update')) {
    return `Draft status update: Wrapped the priority cuts, ${context.inReviewTitles.length} in review, ${context.overdueTitles.length} needing attention. Will deliver the rest on schedule.`
  }

  return `Here to help with your work, ${context.firstName}. Ask me what's due, what's in review, to draft a status update, or to summarize a project.`
}
