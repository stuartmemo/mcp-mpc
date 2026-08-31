interface AssetBinding {
  fetch(request: Request): Promise<Response>
}

interface SitesEnvironment {
  ASSETS: AssetBinding
}

const worker = {
  async fetch(request: Request, environment: SitesEnvironment): Promise<Response> {
    const response = await environment.ASSETS.fetch(request)

    if (
      response.status !== 404 ||
      request.method !== 'GET' ||
      !(request.headers.get('accept') ?? '').includes('text/html')
    ) {
      return response
    }

    const indexUrl = new URL('/index.html', request.url)
    return environment.ASSETS.fetch(new Request(indexUrl, request))
  },
}

export default worker
