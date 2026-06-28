import type { Role, User } from './types'

export function isOwner(user: User | null): boolean {
  return user?.role === 'owner'
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin'
}

export function isEditor(user: User | null): boolean {
  return user?.role === 'editor'
}

export function isManager(user: User | null): boolean {
  return user?.role === 'owner' || user?.role === 'admin'
}

// Part L1 — capability matrix (enforced in the mock API, not just hidden UI).
export function canViewAllWork(user: User | null): boolean {
  return isManager(user)
}

export function canManageProjects(user: User | null): boolean {
  return isManager(user)
}

export function canReviewDeliveries(user: User | null): boolean {
  return isManager(user)
}

export function canViewBilling(user: User | null, targetEditorId: string): boolean {
  if (isOwner(user)) {
    return true
  }
  if (isEditor(user)) {
    return user?.id === targetEditorId
  }
  return false
}

export function canEditRates(user: User | null): boolean {
  return isOwner(user)
}

export function canInvite(user: User | null): boolean {
  return isManager(user)
}

// Admins may invite editors only; owners may invite any role.
export function invitableRoles(user: User | null): Role[] {
  if (isOwner(user)) {
    return ['admin', 'editor']
  }
  if (isAdmin(user)) {
    return ['editor']
  }
  return []
}

export function canChangeRoles(user: User | null): boolean {
  return isOwner(user)
}

export function canDisableProfile(user: User | null): boolean {
  return isOwner(user)
}

// Part L2 — Owner "edit anything" override.
export function canEditAnything(user: User | null): boolean {
  return isOwner(user)
}

export function canViewActivity(user: User | null): boolean {
  return isManager(user)
}

export function canViewAs(user: User | null): boolean {
  return isOwner(user)
}
