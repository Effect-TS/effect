/**
 * Access to the WebSocket sub-protocols negotiated by the current request.
 *
 * Clients advertise the sub-protocols they understand through the
 * `Sec-WebSocket-Protocol` request header as a comma-separated list. This
 * module provides a `SocketProtocols` service that reads that header from the
 * active `HttpServerRequest` and exposes the parsed list, along with a schema
 * for converting between the header string and an array of protocol names.
 *
 * @since 4.0.0
 */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import { flow } from "../../Function.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as S from "../../Schema.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"
import * as Headers from "../http/Headers.ts"
import * as HttpServerRequest from "../http/HttpServerRequest.ts"

/**
 * Name of the request header that carries the WebSocket sub-protocol list.
 *
 * @category constants
 * @since 4.0.0
 */
export const SOCKET_PROTOCOLS_KEY = "Sec-WebSocket-Protocol" as const

/**
 * Schema for the `Sec-WebSocket-Protocol` header value.
 *
 * **Details**
 *
 * Decoding splits the comma-separated header into an array of trimmed
 * protocol names. Encoding joins the array back into a single header value.
 *
 * @category schemas
 * @since 4.0.0
 */
export const Schema = S.String.pipe(
  S.decodeTo(S.Array(S.Trim), {
    decode: SchemaGetter.split({ separator: "," }),
    encode: SchemaGetter.transform((arr) => arr.join(","))
  })
)

/**
 * Service exposing the WebSocket sub-protocols requested by the client.
 *
 * **When to use**
 *
 * Use to pick a sub-protocol supported by both the client and the server
 * inside WebSocket upgrade handlers.
 *
 * **Details**
 *
 * The service resolves to `undefined` when the request does not carry a
 * `Sec-WebSocket-Protocol` header. Provide it with {@link SocketProtocols.layer}
 * or build it directly from `SocketProtocols.make`.
 *
 * @category services
 * @since 4.0.0
 */
export class SocketProtocols extends Context.Service<SocketProtocols>()("effect/socket/SocketProtocols", {
  make: HttpServerRequest.HttpServerRequest.pipe(
    Effect.flatMap(
      flow(
        (request) => request.headers,
        Headers.get(SOCKET_PROTOCOLS_KEY),
        Option.match({
          onSome: S.decodeEffect(Schema),
          onNone: () => Effect.undefined
        })
      )
    )
  )
}) {
  /**
   * Layer that derives the service from the current `HttpServerRequest`.
   *
   * @since 4.0.0
   */
  static readonly layer: Layer.Layer<SocketProtocols, S.SchemaError, HttpServerRequest.HttpServerRequest> = Layer
    .effect(this, this.make)
}
