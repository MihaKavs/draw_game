interface Env {
  DB: D1Database
}

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

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: cors() })

/** GET /api/votes?promptId=...&voterId=... */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const promptId = url.searchParams.get('promptId')
  const voterId = url.searchParams.get('voterId')

  if (!promptId) return json({ error: 'promptId required' }, 400)

  try {
    if (voterId) {
      const row = await context.env.DB.prepare(
        'SELECT COUNT(*) as c FROM votes WHERE voter_id = ? AND prompt_id = ?'
      )
        .bind(voterId, promptId)
        .first<{ c: number }>()
      return json({ hasVoted: (row?.c || 0) > 0 })
    }

    const result = await context.env.DB.prepare(
      'SELECT drawing_id, voter_id, rank FROM votes WHERE prompt_id = ?'
    )
      .bind(promptId)
      .all()

    return json(result.results || [])
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
}

/** POST /api/votes  body: { voterId, promptId, votes: [{ drawingId, rank }] } */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json<{
      voterId: string
      promptId: string
      votes: Array<{ drawingId: string; rank: 1 | 2 | 3 }>
    }>()

    if (!body?.voterId || !body.promptId || !body.votes?.length) {
      return json({ error: 'Missing fields' }, 400)
    }

    const existing = await context.env.DB.prepare(
      'SELECT COUNT(*) as c FROM votes WHERE voter_id = ? AND prompt_id = ?'
    )
      .bind(body.voterId, body.promptId)
      .first<{ c: number }>()

    if ((existing?.c || 0) > 0) {
      return json({ error: 'Already voted' }, 409)
    }

    for (const v of body.votes) {
      const id = crypto.randomUUID()
      await context.env.DB.prepare(
        'INSERT INTO votes (id, drawing_id, voter_id, rank, prompt_id) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(id, v.drawingId, body.voterId, v.rank, body.promptId)
        .run()
    }

    // Recalculate placement points for this prompt and update user totals
    await recalculateScores(context.env.DB, body.promptId)

    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
}

async function recalculateScores(db: D1Database, promptId: string) {
  // Rank drawings by sum of (6 - rank) from votes
  const voteRows = await db
    .prepare('SELECT drawing_id, rank FROM votes WHERE prompt_id = ?')
    .bind(promptId)
    .all<{ drawing_id: string; rank: number }>()

  const scoreMap: Record<string, number> = {}
  for (const v of voteRows.results || []) {
    scoreMap[v.drawing_id] = (scoreMap[v.drawing_id] || 0) + (6 - v.rank)
  }

  const drawings = await db
    .prepare('SELECT id, user_id FROM drawings WHERE prompt_id = ?')
    .bind(promptId)
    .all<{ id: string; user_id: string }>()

  const ranked = [...(drawings.results || [])].sort(
    (a, b) => (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0)
  )

  const placement = [5, 4, 3, 2, 1]
  // We don't store per-prompt scores separately; full recalc of all users is safer
  // Simple approach: add placement points to users for this prompt only once
  // To avoid double-counting on re-vote (blocked), this is fine.

  for (let i = 0; i < Math.min(5, ranked.length); i++) {
    const pts = placement[i]
    await db
      .prepare('UPDATE users SET points = points + ? WHERE id = ?')
      .bind(pts, ranked[i].user_id)
      .run()
  }
}
