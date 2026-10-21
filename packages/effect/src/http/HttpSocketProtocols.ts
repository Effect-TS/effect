/**
 * Access to the WebSocket sub-protocols requested by the current server
 * request through the `Sec-WebSocket-Protocol` header.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as S from "../Schema.ts"
import * as SocketProtocols from "../socket/SocketProtocols.ts"
import * as HttpServerRequest from "./HttpServerRequest.ts"

/**
 * Service exposing the WebSocket sub-protocols requested by the client.
 *
 * **When to use**
 *
 * Use inside WebSocket upgrade handlers to pick a sub-protocol supported by
 * both the client and the server.
 *
 * **Details**
 *
 * Resolves to `undefined` when the request has no `Sec-WebSocket-Protocol`
 * header. Provide it with {@link layer}.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class HttpSocketProtocols extends Context.Service<HttpSocketProtocols, ReadonlyArray<string> | undefined>()(
  "effect/http/HttpSocketProtocols"
) {}

const decode = S.decodeSync(SocketProtocols.Schema)

/**
 * Layer that reads the `HttpSocketProtocols` service from the current
 * `HttpServerRequest`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<HttpSocketProtocols, never, HttpServerRequest.HttpServerRequest> = Layer.effect(
  HttpSocketProtocols,
  Effect.map(HttpServerRequest.HttpServerRequest, (request) => {
    const header = request.headers["sec-websocket-protocol"]
    return header === undefined ? undefined : decode(header)
  })
)
