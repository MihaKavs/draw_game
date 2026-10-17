interface Env {
  IMAGES: R2Bucket
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: cors() })

/** GET /api/image?key=drawings/... */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const key = url.searchParams.get('key')
  if (!key) {
    return new Response('Missing key', { status: 400, headers: cors() })
  }

  const obj = await context.env.IMAGES.get(key)
  if (!obj) {
    return new Response('Not found', { status: 404, headers: cors() })
  }

  const headers = new Headers(cors())
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'image/png')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(obj.body, { headers })
}
