export interface Drawing {
  id: string
  userId: string
  userName: string
  promptId: string
  promptWord: string
  imageUrl: string // base64 for now, later R2 URL
  createdAt: string
  votes: number
}

export interface Prompt {
  id: string
  date: string // YYYY-MM-DD
  word: string
}

export interface User {
  id: string
  name: string
  points: number
}

export interface Vote {
  drawingId: string
  voterId: string
  rank: 1 | 2 | 3 // top 3 only
}

export type Page = 'draw' | 'vote' | 'gallery' | 'leaderboard'
