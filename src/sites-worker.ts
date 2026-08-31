interface AssetBinding {
  fetch(request: Request): Promise<Response>
}

interface SitesEnvironment {
  ASSETS: AssetBinding
}

const worker = {
  async fetch(request: Request, environment: SitesEnvironment): Promise<Response> {
    let response = await environment.ASSETS.fetch(request)

    if (
      response.status !== 404 ||
      request.method !== 'GET' ||
      !(request.headers.get('accept') ?? '').includes('text/html')
    ) {
      return withSiteOrigin(response, request)
    }

    const indexUrl = new URL('/index.html', request.url)
    response = await environment.ASSETS.fetch(new Request(indexUrl, request))
    return withSiteOrigin(response, request)
  },
}

async function withSiteOrigin(response: Response, request: Request): Promise<Response> {
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) {
    return response
  }

  const origin = new URL(request.url).origin
  const html = (await response.text()).replaceAll('__SITE_ORIGIN__', origin)

  return new Response(html, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  })
}

export default worker
