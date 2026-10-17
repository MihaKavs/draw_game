interface Env {
  DB: D1Database
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

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: cors() })

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10)

  try {
    let row = await context.env.DB.prepare(
      'SELECT id, date, word FROM prompts WHERE date = ?'
    )
      .bind(date)
      .first<{ id: string; date: string; word: string }>()

    if (!row) {
      const dayIndex = Math.floor(new Date(date + 'T12:00:00Z').getTime() / 86400000) % DEFAULT_WORDS.length
      const word = DEFAULT_WORDS[Math.abs(dayIndex)]
      const id = `prompt-${date}`
      await context.env.DB.prepare(
        'INSERT OR IGNORE INTO prompts (id, date, word) VALUES (?, ?, ?)'
      )
        .bind(id, date, word)
        .run()
      row = { id, date, word }
    }

    return json(row)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
}
