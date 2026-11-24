/**
 * Node.js integrations for `McpServer` from `effect/ai`.
 *
 * Provides MCP Events (SEP-3415) webhook delivery with a transport that only
 * reaches globally reachable callback hosts, protecting the server against
 * server-side request forgery through subscriber-supplied callback URLs.
 *
 * @stability unstable
 * @since 4.1.6
 */
import type * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as WebhookTransport from "./internal/mcpWebhookTransport.ts"
import * as NodeDns from "./NodeDns.ts"

/**
 * Turns on MCP Events webhook delivery with a callback guard and an HTTP
 * client that connect only to globally reachable addresses.
 *
 * **When to use**
 *
 * Use to offer `"webhook"` delivery from a Node.js MCP server without
 * providing your own `CallbackGuard` and `HttpClient`.
 *
 * **Details**
 *
 * This is `McpServer.layerEventWebhooks` provided with
 * `McpServer.layerCallbackGuard` over the Node.js resolver and a `node:http`
 * client whose connections are pinned to checked addresses:
 *
 * - Before a subscription is created and before every POST, the guard refuses
 *   a callback whose host is an IP literal that is not globally reachable, or
 *   a host name that fails to resolve or resolves to any address that is not
 *   globally reachable, as decided by `NetAddress.isGlobal`.
 * - The client resolves host names again when it connects and refuses the
 *   connection unless every resolved address is globally reachable, then
 *   connects to one of those addresses, so a DNS answer that changes after the
 *   guard's check (DNS rebinding) cannot reach a refused address. Node.js does
 *   not resolve IP-literal URLs, which the guard's check before every POST
 *   covers. The `Host` header and TLS server name keep the URL's host.
 * - Redirect responses are treated as the response to the POST; `node:http`
 *   never follows them.
 *
 * Hosts in `allowedHosts`, matched case-insensitively against the URL's host
 * name or IP literal, skip these checks and may use plain `http:`.
 *
 * **Gotchas**
 *
 * `allowedHosts` disables the protection for its hosts; reserve it for a
 * receiver you control, such as `localhost` during development.
 *
 * **Example** (Enabling webhook delivery)
 *
 * ```ts
 * import { NodeMcpServer } from "@effect/platform-node"
 * import { Effect } from "effect"
 * import { McpSchema } from "effect/ai"
 *
 * declare const currentUser: Effect.Effect<string, McpSchema.Forbidden>
 *
 * const WebhooksLive = NodeMcpServer.layerEventWebhooks({
 *   principal: currentUser,
 *   allowedHosts: ["localhost"]
 * })
 * ```
 *
 * @see {@link McpServer.layerEventWebhooks} for providing a custom guard and client
 * @stability unstable
 * @category layers
 * @since 4.1.6
 */
export const layerEventWebhooks = <R = never>(options: {
  readonly principal: Effect.Effect<string, McpSchema.Forbidden, R>
  readonly allowedHosts?: ReadonlyArray<string> | undefined
}): Layer.Layer<
  never,
  never,
  McpServer.McpServer | McpServer.McpRequest.From<"Requires", Exclude<R, McpSchema.McpRequestContext>>
> => {
  const allowedHosts = options.allowedHosts ?? []
  return McpServer.layerEventWebhooks({ principal: options.principal }).pipe(
    Layer.provide(Layer.mergeAll(
      McpServer.layerCallbackGuard({ allowedHosts }).pipe(Layer.provide(NodeDns.layer)),
      WebhookTransport.layerHttpClient(allowedHosts)
    ))
  )
}
