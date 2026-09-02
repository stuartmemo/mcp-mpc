interface AssetBinding {
  fetch(request: Request): Promise<Response>
}

interface SitesEnvironment {
  ASSETS: AssetBinding
}

const AUDIO_FILE_PATTERN = /\.(?:aac|flac|m4a|mp3|ogg|wav)$/i

function addAudioCorsHeaders(headers: Headers): void {
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Range')
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range')
}

const worker = {
  async fetch(request: Request, environment: SitesEnvironment): Promise<Response> {
    const isAudioFile = AUDIO_FILE_PATTERN.test(new URL(request.url).pathname)

    if (isAudioFile && request.method === 'OPTIONS') {
      const headers = new Headers()
      addAudioCorsHeaders(headers)
      return new Response(null, { status: 204, headers })
    }

    const response = await environment.ASSETS.fetch(request)
    if (!isAudioFile) return response

    const headers = new Headers(response.headers)
    addAudioCorsHeaders(headers)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
}

export default worker
