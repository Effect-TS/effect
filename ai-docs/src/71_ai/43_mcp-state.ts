/**
 * @title Protecting MCP continuation state across instances
 *
 * Bind multi round-trip state to an authenticated principal, share keys between
 * server instances, and keep old keys available during a rolling rotation.
 */
import { Context, Effect, Layer } from "effect"
import { McpProtocol, type McpSchema, McpServer } from "effect/ai"
import type { Aead } from "effect/crypto"

// The application's session verifier validates credentials on every request.
// Its errors use an application-defined MCP error code; the state token itself
// never authorizes a request or replaces authentication.
export class Sessions extends Context.Service<Sessions, {
  readonly verify: (authorization: string | undefined) => Effect.Effect<{
    readonly tenantId: string
    readonly userId: string
  }, McpSchema.McpErrorBase>
}>()("docs/McpSessions") {}

const Authentication = McpServer.middleware(Effect.gen(function*() {
  const sessions = yield* Sessions
  return (effect, { headers }) =>
    Effect.flatMap(sessions.verify(headers.authorization), (session) =>
      Effect.provideService(
        effect,
        McpServer.RequestStatePrincipal,
        // JSON encodes the pair unambiguously, including punctuation in IDs.
        JSON.stringify([session.tenantId, session.userId])
      ))
}))

// Load these keys from the application's secret store with
// Aead.key(Aead.xchacha20Poly1305, bytes). Other algorithms are rejected.
// Never generate replacement keys for each HTTP request.
// Keep the previous key until every token it issued has expired.
export const makeServer = (current: Aead.Key, previous: Aead.Key) =>
  McpServer.layerHttpRequestScoped({
    name: "Invoice Approvals",
    version: "1.0.0",
    path: "/mcp",
    protocols: [McpProtocol.v2026_07_28],
    requestState: {
      ttl: "2 minutes",
      keys: [
        { id: "2026-11", key: current },
        { id: "2026-10", key: previous }
      ]
    },
    registrations: Authentication.layerGlobal
  })

// Compose the application's resource, prompt, or toolkit registration layers
// with this endpoint. Its handlers return ordinary strings in InputRequired;
// McpRequestContext restores the original strings only after authentication,
// expiry, and method/argument checks. Client input responses still need their
// own validation. One-time approvals also need an atomic storage check, since
// an unexpired continuation can be replayed by the same principal.
export const withSessions = (sessions: Sessions["Service"], current: Aead.Key, previous: Aead.Key) =>
  makeServer(current, previous).pipe(Layer.provide(Layer.succeed(Sessions, sessions)))
