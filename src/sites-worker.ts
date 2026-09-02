interface AssetBinding {
  fetch(request: Request): Promise<Response>
}

interface SitesEnvironment {
  ASSETS: AssetBinding
}

const worker = {
  async fetch(request: Request, environment: SitesEnvironment): Promise<Response> {
    return environment.ASSETS.fetch(request)
  },
}

export default worker
