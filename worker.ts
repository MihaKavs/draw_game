interface Env {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
}

const DEFAULT_WORDS = [
  'Mačka', 'Raketa', 'Pica', 'Grad', 'Zmaj', 'Kolo', 'Ocean', 'Robot',
  'Hiška na drevesu', 'Kitara', 'Vulkan', 'Samorog', 'Sendvič', 'Vesoljska ladja',
  'Svetilnik', 'Dinozaver', 'Balon na vroč zrak', 'Zaklad', 'Sova', 'Gora',
]

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() })
    }

    // ---------- API ----------
    if (url.pathname.startsWith('/api/')) {
      try {
        if (url.pathname === '/api/prompt' && request.method === 'GET') {
          return handlePrompt(url, env)
        }
        if (url.pathname === '/api/drawings' && request.method === 'GET') {
          return handleGetDrawings(url, env)
        }
        if (url.pathname === '/api/drawings' && request.method === 'POST') {
          return handlePostDrawing(request, env)
        }
        if (url.pathname === '/api/image' && request.method === 'GET') {
          return handleImage(url, env)
        }
        if (url.pathname === '/api/votes' && request.method === 'GET') {
          return handleGetVotes(url, env)
        }
        if (url.pathname === '/api/votes' && request.method === 'POST') {
          return handlePostVotes(request, env)
        }
        if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
          return handleLeaderboard(env)
        }
        return json({ error: 'Not found' }, 404)
      } catch (e) {
        return json({ error: String(e) }, 500)
      }
    }

    // ---------- Statična stran (React) ----------
    return env.ASSETS.fetch(request)
  },
}

async function handlePrompt(url: URL, env: Env) {
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10)
  let row = await env.DB.prepare('SELECT id, date, word FROM prompts WHERE date = ?')
    .bind(date)
    .first<{ id: string; date: string; word: string }>()

  if (!row) {
    const dayIndex =
      Math.floor(new Date(date + 'T12:00:00Z').getTime() / 86400000) % DEFAULT_WORDS.length
    const word = DEFAULT_WORDS[Math.abs(dayIndex)]
    const id = `prompt-${date}`
    await env.DB.prepare('INSERT OR IGNORE INTO prompts (id, date, word) VALUES (?, ?, ?)')
      .bind(id, date, word)
      .run()
    row = { id, date, word }
  }
  return json(row)
}

async function handleGetDrawings(url: URL, env: Env) {
  const promptId = url.searchParams.get('promptId')
  const all = url.searchParams.get('all')

  let rows: Array<{
    id: string
    user_id: string
    user_name: string
    prompt_id: string
    prompt_word: string
    image_key: string
    created_at: string
  }>

  if (all === '1') {
    const result = await env.DB.prepare(
      'SELECT id, user_id, user_name, prompt_id, prompt_word, image_key, created_at FROM drawings ORDER BY created_at DESC LIMIT 200'
    ).all()
    rows = (result.results || []) as typeof rows
  } else if (promptId) {
    const result = await env.DB.prepare(
      'SELECT id, user_id, user_name, prompt_id, prompt_word, image_key, created_at FROM drawings WHERE prompt_id = ? ORDER BY created_at ASC'
    )
      .bind(promptId)
      .all()
    rows = (result.results || []) as typeof rows
  } else {
    return json({ error: 'promptId or all=1 required' }, 400)
  }

  return json(
    rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      promptId: r.prompt_id,
      promptWord: r.prompt_word,
      imageUrl: `/api/image?key=${encodeURIComponent(r.image_key)}`,
      createdAt: r.created_at,
      votes: 0,
    }))
  )
}

async function handlePostDrawing(request: Request, env: Env) {
  const body = await request.json<{
    id: string
    userId: string
    userName: string
    promptId: string
    promptWord: string
    imageBase64: string
  }>()

  if (!body?.id || !body.userId || !body.userName || !body.promptId || !body.imageBase64) {
    return json({ error: 'Missing fields' }, 400)
  }

  await env.DB.prepare('INSERT OR IGNORE INTO users (id, name, points) VALUES (?, ?, 0)')
    .bind(body.userId, body.userName)
    .run()

  const existing = await env.DB.prepare(
    'SELECT id FROM drawings WHERE user_id = ? AND prompt_id = ?'
  )
    .bind(body.userId, body.promptId)
    .first()

  if (existing) return json({ error: 'Already submitted today' }, 409)

  const base64 = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const imageKey = `drawings/${body.promptId}/${body.id}.png`

  await env.IMAGES.put(imageKey, binary, {
    httpMetadata: { contentType: 'image/png' },
  })

  await env.DB.prepare(
    `INSERT INTO drawings (id, user_id, user_name, prompt_id, prompt_word, image_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(body.id, body.userId, body.userName, body.promptId, body.promptWord, imageKey)
    .run()

  return json({
    id: body.id,
    imageUrl: `/api/image?key=${encodeURIComponent(imageKey)}`,
  })
}

async function handleImage(url: URL, env: Env) {
  const key = url.searchParams.get('key')
  if (!key) return new Response('Missing key', { status: 400, headers: cors() })

  const obj = await env.IMAGES.get(key)
  if (!obj) return new Response('Not found', { status: 404, headers: cors() })

  const headers = new Headers(cors())
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'image/png')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(obj.body, { headers })
}

async function handleGetVotes(url: URL, env: Env) {
  const promptId = url.searchParams.get('promptId')
  const voterId = url.searchParams.get('voterId')
  if (!promptId) return json({ error: 'promptId required' }, 400)

  if (voterId) {
    const row = await env.DB.prepare(
      'SELECT COUNT(*) as c FROM votes WHERE voter_id = ? AND prompt_id = ?'
    )
      .bind(voterId, promptId)
      .first<{ c: number }>()
    return json({ hasVoted: (row?.c || 0) > 0 })
  }

  const result = await env.DB.prepare(
    'SELECT drawing_id, voter_id, rank FROM votes WHERE prompt_id = ?'
  )
    .bind(promptId)
    .all()
  return json(result.results || [])
}

async function handlePostVotes(request: Request, env: Env) {
  const body = await request.json<{
    voterId: string
    promptId: string
    votes: Array<{ drawingId: string; rank: 1 | 2 | 3 }>
  }>()

  if (!body?.voterId || !body.promptId || !body.votes?.length) {
    return json({ error: 'Missing fields' }, 400)
  }

  const existing = await env.DB.prepare(
    'SELECT COUNT(*) as c FROM votes WHERE voter_id = ? AND prompt_id = ?'
  )
    .bind(body.voterId, body.promptId)
    .first<{ c: number }>()

  if ((existing?.c || 0) > 0) return json({ error: 'Already voted' }, 409)

  for (const v of body.votes) {
    await env.DB.prepare(
      'INSERT INTO votes (id, drawing_id, voter_id, rank, prompt_id) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), v.drawingId, body.voterId, v.rank, body.promptId)
      .run()
  }

  // Točke
  const voteRows = await env.DB.prepare('SELECT drawing_id, rank FROM votes WHERE prompt_id = ?')
    .bind(body.promptId)
    .all<{ drawing_id: string; rank: number }>()

  const scoreMap: Record<string, number> = {}
  for (const v of voteRows.results || []) {
    scoreMap[v.drawing_id] = (scoreMap[v.drawing_id] || 0) + (6 - v.rank)
  }

  const drawings = await env.DB.prepare('SELECT id, user_id FROM drawings WHERE prompt_id = ?')
    .bind(body.promptId)
    .all<{ id: string; user_id: string }>()

  const ranked = [...(drawings.results || [])].sort(
    (a, b) => (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0)
  )

  const placement = [5, 4, 3, 2, 1]
  for (let i = 0; i < Math.min(5, ranked.length); i++) {
    await env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?')
      .bind(placement[i], ranked[i].user_id)
      .run()
  }

  return json({ ok: true })
}

async function handleLeaderboard(env: Env) {
  const result = await env.DB.prepare(
    'SELECT id, name, points FROM users ORDER BY points DESC, name ASC LIMIT 100'
  ).all()
  return json(
    (result.results || []).map((u: { id: string; name: string; points: number }) => ({
      id: u.id,
      name: u.name,
      points: u.points,
    }))
  )
}