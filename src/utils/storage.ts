import type { Drawing, Prompt, User, Vote } from '../types'

const KEYS = {
  drawings: 'daily-draw-drawings',
  users: 'daily-draw-users',
  votes: 'daily-draw-votes',
  currentUser: 'daily-draw-current-user',
  prompts: 'daily-draw-prompts',
}

// ---------- Helpers ----------
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ---------- Current User ----------
export function getCurrentUser(): User | null {
  return load(KEYS.currentUser, null)
}

export function setCurrentUser(user: User) {
  save(KEYS.currentUser, user)
  // also ensure user exists in users list
  const users = getUsers()
  if (!users.find((u) => u.id === user.id)) {
    users.push(user)
    save(KEYS.users, users)
  }
}

export function logout() {
  localStorage.removeItem(KEYS.currentUser)
}

// ---------- Users ----------
export function getUsers(): User[] {
  return load(KEYS.users, [])
}

export function updateUserPoints(userId: string, points: number) {
  const users = getUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx >= 0) {
    users[idx].points = points
    save(KEYS.users, users)
  }
}

// ---------- Prompts ----------
const DEFAULT_WORDS = [
  'Mačka', 'Raketa', 'Pica', 'Grad', 'Zmaj', 'Kolo', 'Ocean', 'Robot',
  'Hiška na drevesu', 'Kitara', 'Vulkan', 'Samorog', 'Sendvič', 'Vesoljska ladja',
  'Svetilnik', 'Dinozaver', 'Balon na vroč zrak', 'Zaklad', 'Sova', 'Gora'
]

export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getPromptForDate(date: string): Prompt {
  const prompts = load<Prompt[]>(KEYS.prompts, [])
  let prompt = prompts.find((p) => p.date === date)

  if (!prompt) {
    // simple deterministic word based on date
    const dayIndex = Math.floor(new Date(date).getTime() / 86400000) % DEFAULT_WORDS.length
    prompt = {
      id: `prompt-${date}`,
      date,
      word: DEFAULT_WORDS[dayIndex],
    }
    prompts.push(prompt)
    save(KEYS.prompts, prompts)
  }
  return prompt
}

export function getTodayPrompt(): Prompt {
  return getPromptForDate(getTodayDate())
}

// ---------- Drawings ----------
export function getDrawings(): Drawing[] {
  return load(KEYS.drawings, [])
}

export function getDrawingsForPrompt(promptId: string): Drawing[] {
  return getDrawings().filter((d) => d.promptId === promptId)
}

export function addDrawing(drawing: Drawing) {
  const drawings = getDrawings()
  drawings.push(drawing)
  save(KEYS.drawings, drawings)
}

export function getDrawingById(id: string): Drawing | undefined {
  return getDrawings().find((d) => d.id === id)
}

// ---------- Votes ----------
export function getVotes(): Vote[] {
  return load(KEYS.votes, [])
}

export function getVotesForPrompt(promptId: string): Vote[] {
  const drawings = getDrawingsForPrompt(promptId)
  const drawingIds = new Set(drawings.map((d) => d.id))
  return getVotes().filter((v) => drawingIds.has(v.drawingId))
}

export function hasUserVotedForPrompt(userId: string, promptId: string): boolean {
  const votes = getVotesForPrompt(promptId)
  return votes.some((v) => v.voterId === userId)
}

export function saveVotes(newVotes: Vote[]) {
  const existing = getVotes()
  // remove any previous votes from this voter for these drawings
  const voterId = newVotes[0]?.voterId
  const filtered = existing.filter((v) => v.voterId !== voterId)
  save(KEYS.votes, [...filtered, ...newVotes])
}

// ---------- Scoring (1st=5, 2nd=4, 3rd=3, 4th=2, 5th=1) ----------
export function calculatePointsForPrompt(promptId: string) {
  const drawings = getDrawingsForPrompt(promptId)
  const votes = getVotesForPrompt(promptId)

  // count points per drawing (rank 1 → 5 pts, rank 2 → 4, rank 3 → 3)
  const scoreMap: Record<string, number> = {}
  drawings.forEach((d) => (scoreMap[d.id] = 0))

  votes.forEach((v) => {
    const pts = 6 - v.rank // 1→5, 2→4, 3→3
    scoreMap[v.drawingId] = (scoreMap[v.drawingId] || 0) + pts
  })

  // sort drawings by total points
  const ranked = [...drawings].sort((a, b) => (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0))

  // award final placement points: 1st=5 … 5th=1
  const placementPoints = [5, 4, 3, 2, 1]
  const userPoints: Record<string, number> = {}

  ranked.forEach((drawing, index) => {
    if (index < 5) {
      const pts = placementPoints[index]
      userPoints[drawing.userId] = (userPoints[drawing.userId] || 0) + pts
    }
  })

  return { ranked, scoreMap, userPoints }
}

export function recalculateAllScores() {
  const users = getUsers()
  const userTotals: Record<string, number> = {}
  users.forEach((u) => (userTotals[u.id] = 0))

  // get all unique prompt ids that have votes
  const allVotes = getVotes()
  const drawingIds = new Set(allVotes.map((v) => v.drawingId))
  const drawings = getDrawings().filter((d) => drawingIds.has(d.id))
  const promptIds = [...new Set(drawings.map((d) => d.promptId))]

  promptIds.forEach((pid) => {
    const { userPoints } = calculatePointsForPrompt(pid)
    Object.entries(userPoints).forEach(([uid, pts]) => {
      userTotals[uid] = (userTotals[uid] || 0) + pts
    })
  })

  users.forEach((u) => {
    u.points = userTotals[u.id] || 0
  })
  save(KEYS.users, users)
}
