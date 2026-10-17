import type { Drawing, Prompt, User } from '../types'

const API = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText)
  }
  return data as T
}

export async function fetchPrompt(date?: string): Promise<Prompt> {
  const q = date ? `?date=${date}` : ''
  return request<Prompt>(`/prompt${q}`)
}

export async function fetchDrawings(promptId: string): Promise<Drawing[]> {
  return request<Drawing[]>(`/drawings?promptId=${encodeURIComponent(promptId)}`)
}

export async function fetchAllDrawings(): Promise<Drawing[]> {
  return request<Drawing[]>(`/drawings?all=1`)
}

export async function submitDrawing(payload: {
  id: string
  userId: string
  userName: string
  promptId: string
  promptWord: string
  imageBase64: string
}): Promise<{ id: string; imageUrl: string }> {
  return request(`/drawings`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function checkHasVoted(promptId: string, voterId: string): Promise<boolean> {
  const data = await request<{ hasVoted: boolean }>(
    `/votes?promptId=${encodeURIComponent(promptId)}&voterId=${encodeURIComponent(voterId)}`
  )
  return data.hasVoted
}

export async function submitVotes(payload: {
  voterId: string
  promptId: string
  votes: Array<{ drawingId: string; rank: 1 | 2 | 3 }>
}): Promise<void> {
  await request(`/votes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchLeaderboard(): Promise<User[]> {
  return request<User[]>(`/leaderboard`)
}

/** Detect if shared API is available (D1/R2 bound) */
export async function isApiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/prompt`, { method: 'GET' })
    if (!res.ok) return false
    const data = await res.json()
    return !!(data && (data as Prompt).word)
  } catch {
    return false
  }
}
