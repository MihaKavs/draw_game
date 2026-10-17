interface Env {
  DB: D1Database
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const result = await context.env.DB.prepare(
      'SELECT id, name, points FROM users ORDER BY points DESC, name ASC LIMIT 100'
    ).all()

    const users = (result.results || []).map((u: { id: string; name: string; points: number }) => ({
      id: u.id,
      name: u.name,
      points: u.points,
    }))

    return json(users)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
}
