export {
  ClusterDurableQueue,
  ClusterEntity,
  ClusterSingleton,
  ClusterWorkflow
} from "@effect/platform-cloudflare/CloudflareDurableObjects"

export default {
  async fetch(request: Request, env: Record<string, any>): Promise<Response> {
    const url = new URL(request.url)
    const binding = url.pathname.slice(1)
    const namespace = env[binding]
    if (namespace === undefined) {
      return new Response(`unknown binding: ${binding}`, { status: 404 })
    }
    const stub = namespace.getByName(url.searchParams.get("name") ?? "4:User42")
    try {
      await stub.fetch(request)
      return new Response("expected the object to reject direct fetch", { status: 500 })
    } catch (error) {
      return new Response(String(error), { status: 200 })
    }
  }
}
