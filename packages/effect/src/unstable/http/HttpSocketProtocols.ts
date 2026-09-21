/**
 * Access to the WebSocket sub-protocols negotiated by the current request.
 *
 * Clients advertise the sub-protocols they understand through the
 * `Sec-WebSocket-Protocol` request header. This module exposes the header
 * name and an `HttpSocketProtocols` service that reads that header from the active
 * `HttpServerRequest` and exposes the parsed list, using the schema from
 * `SocketProtocols` in `effect/unstable/socket`.
 *
 * @since 4.0.0
 */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import { flow } from "../../Function.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as S from "../../Schema.ts"
import { Schema as SocketProtocolsSchema } from "../socket/SocketProtocols.ts"
import * as Headers from "./Headers.ts"
import * as HttpServerRequest from "./HttpServerRequest.ts"

/**
 * Name of the request header that carries the WebSocket sub-protocol list.
 *
 * @category constants
 * @since 4.0.0
 */
export const HEADER_NAME = "Sec-WebSocket-Protocol" as const

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
 * `Sec-WebSocket-Protocol` header. Provide it with {@link layer}.
 *
 * @category services
 * @since 4.0.0
 */
export class HttpSocketProtocols extends Context.Service<HttpSocketProtocols, ReadonlyArray<string> | undefined>()(
  "effect/http/HttpSocketProtocols"
) {}

/**
 * Layer that derives the `HttpSocketProtocols` service from the current
 * `HttpServerRequest`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<HttpSocketProtocols, S.SchemaError, HttpServerRequest.HttpServerRequest> = Layer.effect(
  HttpSocketProtocols,
  HttpServerRequest.HttpServerRequest.pipe(
    Effect.flatMap(
      flow(
        (request) => request.headers,
        Headers.get(HEADER_NAME),
        Option.match({
          onSome: S.decodeEffect(SocketProtocolsSchema),
          onNone: () => Effect.undefined
        })
      )
    )
  )
)
