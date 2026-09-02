interface AssetBinding {
  fetch(request: Request): Promise<Response>
}

interface SitesEnvironment {
  ASSETS: AssetBinding
}

const VOICE_PUBLIC_PATH = '/voice.mp3'
const VOICE_ASSET_PATH = '/audio/voice.mp3'

function addAudioCorsHeaders(headers: Headers): void {
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Range')
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range')
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
}

const worker = {
  async fetch(request: Request, environment: SitesEnvironment): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== VOICE_PUBLIC_PATH) return environment.ASSETS.fetch(request)

    const headers = new Headers()
    addAudioCorsHeaders(headers)

    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Max-Age', '86400')
      return new Response(null, { status: 204, headers })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      headers.set('Allow', 'GET, HEAD, OPTIONS')
      return new Response(null, { status: 405, headers })
    }

    url.pathname = VOICE_ASSET_PATH
    const assetRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
    })
    const assetResponse = await environment.ASSETS.fetch(assetRequest)
    const responseHeaders = new Headers(assetResponse.headers)
    addAudioCorsHeaders(responseHeaders)

    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers: responseHeaders,
    })
  },
}

export default worker
