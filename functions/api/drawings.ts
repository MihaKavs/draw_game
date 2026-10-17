interface Env {
  DB: D1Database
  IMAGES: R2Bucket
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

/** GET /api/drawings?promptId=...  or  ?all=1 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const promptId = url.searchParams.get('promptId')
  const all = url.searchParams.get('all')

  try {
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
      const result = await context.env.DB.prepare(
        'SELECT id, user_id, user_name, prompt_id, prompt_word, image_key, created_at FROM drawings ORDER BY created_at DESC LIMIT 200'
      ).all()
      rows = (result.results || []) as typeof rows
    } else if (promptId) {
      const result = await context.env.DB.prepare(
        'SELECT id, user_id, user_name, prompt_id, prompt_word, image_key, created_at FROM drawings WHERE prompt_id = ? ORDER BY created_at ASC'
      )
        .bind(promptId)
        .all()
      rows = (result.results || []) as typeof rows
    } else {
      return json({ error: 'promptId or all=1 required' }, 400)
    }

    const drawings = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      promptId: r.prompt_id,
      promptWord: r.prompt_word,
      imageUrl: `/api/image?key=${encodeURIComponent(r.image_key)}`,
      createdAt: r.created_at,
      votes: 0,
    }))

    return json(drawings)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
}

/** POST /api/drawings  body: { id, userId, userName, promptId, promptWord, imageBase64 } */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json<{
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

    // Ensure user exists
    await context.env.DB.prepare(
      'INSERT OR IGNORE INTO users (id, name, points) VALUES (?, ?, 0)'
    )
      .bind(body.userId, body.userName)
      .run()

    // One drawing per user per prompt
    const existing = await context.env.DB.prepare(
      'SELECT id FROM drawings WHERE user_id = ? AND prompt_id = ?'
    )
      .bind(body.userId, body.promptId)
      .first()

    if (existing) {
      return json({ error: 'Already submitted today' }, 409)
    }

    // Decode base64 PNG and store in R2
    const base64 = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const imageKey = `drawings/${body.promptId}/${body.id}.png`

    await context.env.IMAGES.put(imageKey, binary, {
      httpMetadata: { contentType: 'image/png' },
    })

    await context.env.DB.prepare(
      `INSERT INTO drawings (id, user_id, user_name, prompt_id, prompt_word, image_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(body.id, body.userId, body.userName, body.promptId, body.promptWord, imageKey)
      .run()

    return json({
      id: body.id,
      imageUrl: `/api/image?key=${encodeURIComponent(imageKey)}`,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
}
