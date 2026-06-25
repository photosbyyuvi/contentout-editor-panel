import { useState } from 'react'
import { useApp } from '../store'
import { isOwner } from '../permissions'
import { PageHeader } from './PageHeader'
import { formatCurrency } from '../format'
import {
  DELIVERABLE_LABELS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_LABELS,
  ROLE_LABELS,
  type DeliverableType,
  type NotificationChannel,
  type NotificationPrefs,
  type NotificationType,
} from '../types'

const TIMEZONES = [
  'America/Toronto',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Skopje',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
]

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  portal: 'In-portal',
  email: 'Email',
  discord: 'Discord',
  push: 'Browser push',
}

export function Profile() {
  const { user, updateUser, updateNotificationPrefs, showToast } = useApp()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [initials, setInitials] = useState(user?.avatarInitials ?? '')
  const [timezone, setTimezone] = useState(user?.timezone ?? 'America/Toronto')
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    user?.notificationPrefs ?? {
      channels: { portal: true, email: true, discord: true, push: false },
      events: {
        assignment: true,
        delivery_received: true,
        feedback: true,
        revision: true,
        approval: true,
        mention: true,
      },
    },
  )

  if (!user) {
    return null
  }

  const toggleChannel = (channel: NotificationChannel) => {
    setPrefs((prev) => ({ ...prev, channels: { ...prev.channels, [channel]: !prev.channels[channel] } }))
  }
  const toggleEvent = (event: NotificationType) => {
    setPrefs((prev) => ({ ...prev, events: { ...prev.events, [event]: !prev.events[event] } }))
  }

  const save = () => {
    updateUser(user.id, { fullName: fullName.trim() || user.fullName, avatarInitials: initials.trim() || user.avatarInitials, timezone })
    updateNotificationPrefs(prefs)
    showToast('Profile saved')
  }

  return (
    <>
      <PageHeader eyebrow="Your profile" title={user.fullName} />

      <section className="surface">
        <div className="profile-head">
          <span className="avatar avatar-lg" aria-hidden="true">{user.avatarInitials}</span>
          <div>
            <span className={`role-badge role-${user.role}`}>{ROLE_LABELS[user.role]}</span>
            <p className="profile-email tabular">{user.email}</p>
          </div>
        </div>
        <div className="profile-fields">
          <label className="field">
            <span>Display name</span>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="field">
            <span>Avatar initials</span>
            <input value={initials} maxLength={3} onChange={(event) => setInitials(event.target.value.toUpperCase())} />
          </label>
          <label className="field">
            <span>Timezone</span>
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {[...new Set([timezone, ...TIMEZONES])].map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {user.role === 'editor' ? (
        <section className="surface">
          <h2 className="section-head">Pay setup</h2>
          {isOwner(user) || user.role === 'editor' ? (
            <dl className="spec-grid">
              <div>
                <dt>Pay model</dt>
                <dd>{user.payModel === 'flat' ? 'Flat / deliverable' : 'Hourly'}</dd>
              </div>
              {user.payModel === 'hourly' ? (
                <div>
                  <dt>Rate</dt>
                  <dd className="tabular">{formatCurrency(user.hourlyRate ?? 0)}/h</dd>
                </div>
              ) : (
                <div>
                  <dt>Flat rates</dt>
                  <dd className="tabular">
                    {Object.entries(user.flatRates ?? {})
                      .map(([type, amount]) => `${DELIVERABLE_LABELS[type as DeliverableType]} ${formatCurrency(amount)}`)
                      .join(' · ')}
                  </dd>
                </div>
              )}
            </dl>
          ) : null}
          <p className="helper">Pay rates are editable by the Owner only.</p>
        </section>
      ) : null}

      <section className="surface">
        <h2 className="section-head">Notification preferences</h2>
        <p className="pref-group-label">Channels</p>
        <div className="pref-toggles">
          {NOTIFICATION_CHANNELS.map((channel) => (
            <label key={channel} className={`toggle ${prefs.channels[channel] ? 'toggle-on' : ''}`}>
              <input type="checkbox" checked={prefs.channels[channel]} onChange={() => toggleChannel(channel)} />
              {CHANNEL_LABELS[channel]}
            </label>
          ))}
        </div>
        <p className="pref-group-label">Events</p>
        <div className="pref-toggles">
          {NOTIFICATION_EVENTS.map((event) => (
            <label key={event} className={`toggle ${prefs.events[event] ? 'toggle-on' : ''}`}>
              <input type="checkbox" checked={prefs.events[event]} onChange={() => toggleEvent(event)} />
              {NOTIFICATION_EVENT_LABELS[event]}
            </label>
          ))}
        </div>
        <button type="button" className="primary-button profile-save" onClick={save}>
          Save changes
        </button>
      </section>
    </>
  )
}
