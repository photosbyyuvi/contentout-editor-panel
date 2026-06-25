import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useApp } from '../store'
import { canChangeRoles, canDisableProfile, invitableRoles } from '../permissions'
import { PageHeader } from './PageHeader'
import { relativeTime } from '../format'
import { ROLE_LABELS, type Role } from '../types'
import { useFakeLoad } from '../useFakeLoad'

export function People() {
  const { user, users, projects, inviteUser, changeRole, setUserStatus } = useApp()
  const isLoading = useFakeLoad()
  const roles = user ? invitableRoles(user) : []

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>(roles[0] ?? 'editor')

  const projectsByEditor = useMemo(() => {
    const map: Record<string, number> = {}
    for (const project of projects) {
      map[project.assignedEditorId] = (map[project.assignedEditorId] ?? 0) + 1
    }
    return map
  }, [projects])

  if (!user) {
    return null
  }

  const handleInvite = () => {
    if (!name.trim() || !email.trim()) {
      return
    }
    inviteUser(name.trim(), email.trim(), role)
    setName('')
    setEmail('')
  }

  return (
    <>
      <PageHeader eyebrow="Team management" title="People" />
      {isLoading ? (
        <div className="hours-skeleton" aria-hidden="true">
          <div className="surface skeleton-box-lg" />
        </div>
      ) : (
        <>
          <section className="surface">
            <h2 className="section-head">Roster</h2>
            <table className="entries-table people-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Projects</th>
                  <th scope="col">Last active</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {users.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <span className="people-name">
                        <span className="avatar avatar-sm" aria-hidden="true">{member.avatarInitials}</span>
                        <span>
                          <span className="people-fullname">{member.fullName}</span>
                          <span className="people-email tabular">{member.email}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      {canChangeRoles(user) && member.id !== user.id ? (
                        <select
                          className="role-select"
                          value={member.role}
                          onChange={(event) => changeRole(member.id, event.target.value as Role)}
                          aria-label={`Role for ${member.fullName}`}
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                        </select>
                      ) : (
                        <span className={`role-badge role-${member.role}`}>{ROLE_LABELS[member.role]}</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-tag status-tag-${member.status}`}>{member.status}</span>
                    </td>
                    <td className="tabular">{projectsByEditor[member.id] ?? 0}</td>
                    <td className="muted tabular">{relativeTime(member.lastActiveAt)}</td>
                    <td className="num">
                      {canDisableProfile(user) && member.id !== user.id ? (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() =>
                            setUserStatus(member.id, member.status === 'disabled' ? 'active' : 'disabled')
                          }
                        >
                          {member.status === 'disabled' ? 'Enable' : 'Disable'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {roles.length > 0 ? (
            <section className="surface">
              <h2 className="section-head">Invite a profile</h2>
              <div className="invite-row">
                <label>
                  <span>Full name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jordan Lee" />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="jordan@contentout.studio"
                  />
                </label>
                <label>
                  <span>Role</span>
                  <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="primary-button" onClick={handleInvite}>
                  <UserPlus size={14} /> Invite
                </button>
              </div>
              <p className="helper">Invited profiles appear with an “invited” status and a mock invite link.</p>
            </section>
          ) : null}
        </>
      )}
    </>
  )
}
