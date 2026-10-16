/**
 * Calls Connect services through an `RpcClient`.
 *
 * PROTOTYPE — see the package README.
 *
 * The protocol turns each rpc request into a Connect HTTP call on
 * `<baseUrl>/<ServiceName>/<Rpc tag>`, so the typed client, middleware, and
 * tracing come from `RpcClient` unchanged. Any Connect server works, including
 * `connect-go` and `@connectrpc/connect-node`.
 *
 * Connect errors whose details carry one of the rpc's error schemas (matched by
 * the schema's type name) fail with that error; any other Connect error is a
 * defect.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as HttpBody from "effect/http/HttpBody"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import type * as Rpc from "effect/rpc/Rpc"
import * as RpcClient from "effect/rpc/RpcClient"
import { RpcClientDefect, RpcClientError } from "effect/rpc/RpcClientError"
import type * as RpcGroup from "effect/rpc/RpcGroup"
import type { FromClientEncoded, FromServerEncoded } from "effect/rpc/RpcMessage"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Connect from "./internal/connect.ts"

/**
 * Options for {@link makeProtocol}.
 *
 * @stability unstable
 * @since 4.0.0
 */
export interface Options {
  /** Base URL of the Connect server, for example `"http://localhost:8080"`. */
  readonly baseUrl: string
  /** Wire format. Defaults to `"binary"` (`application/proto`). */
  readonly format?: "binary" | "json" | undefined
  /** Overrides the `ConnectRpc.ServiceName` annotation of the group. */
  readonly serviceName?: string | undefined
  /** Sent as `Connect-Timeout-Ms`. */
  readonly timeoutMs?: number | undefined
}

const identityCodecFor = <S extends Schema.Top>(schema: S) => schema as any

const protocolDefect = (message: string, cause?: unknown) =>
  new RpcClientError({ reason: new RpcClientDefect({ message, cause }) })

/**
 * Creates a client `Protocol` that sends rpc requests as Connect calls.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const makeProtocol = (
  group: RpcGroup.Any,
  options: Options
): Effect.Effect<RpcClient.Protocol["Service"], never, HttpClient.HttpClient> =>
  RpcClient.Protocol.make(Effect.fnUntraced(function*(writeResponse) {
    const client = yield* HttpClient.HttpClient
    const methods = Connect.methods(group, options.serviceName)
    const format = options.format ?? "binary"
    const baseUrl = options.baseUrl.replace(/\/+$/, "")

    const exitResponse = (requestId: string | number, exit: unknown): FromServerEncoded => ({
      _tag: "Exit",
      requestId,
      exit: exit as any
    })

    const send = Effect.fnUntraced(function*(clientId: number, message: FromClientEncoded) {
      if (message._tag !== "Request") return
      const method = methods.get(message.tag)
      if (method === undefined) return yield* protocolDefect(`unknown rpc ${message.tag}`)

      const body = yield* Effect.try({
        try: () => {
          const bytes = Connect.encodeMessage(method.input, message.payload, format)
          return method.stream ? Connect.envelope(0, bytes) : bytes
        },
        catch: (cause) => protocolDefect("Error encoding request message", cause)
      })

      let request = HttpClientRequest.post(baseUrl + method.path).pipe(
        HttpClientRequest.setHeaders(Object.fromEntries(message.headers)),
        HttpClientRequest.setHeader("connect-protocol-version", "1"),
        HttpClientRequest.setBody(HttpBody.uint8Array(body, Connect.contentType(method.stream, format)))
      )
      if (options.timeoutMs !== undefined) {
        request = HttpClientRequest.setHeader(request, "connect-timeout-ms", String(options.timeoutMs))
      }

      const response = yield* client.execute(request).pipe(
        Effect.mapError((cause) => protocolDefect("HTTP request failed", cause))
      )
      const responseType = Connect.parseContentType(response.headers["content-type"])

      if (!method.stream) {
        const bytes = new Uint8Array(
          yield* response.arrayBuffer.pipe(Effect.mapError((cause) => protocolDefect("Error reading response", cause)))
        )
        if (response.status !== 200) {
          const fallback = Connect.codeFromHttpStatus(response.status)
          const error = responseType !== undefined && responseType.format === "json" && !responseType.stream
            ? Connect.wireErrorFromJson(safeJson(bytes), fallback)
            : { code: fallback, message: `HTTP ${response.status}`, details: [] }
          return yield* writeResponse(clientId, exitResponse(message.id, Connect.wireErrorToExit(method, error)))
        }
        if (responseType === undefined || responseType.stream || responseType.format !== format) {
          return yield* protocolDefect(`unexpected response content type ${response.headers["content-type"]}`)
        }
        const value = yield* Effect.try({
          try: () => Connect.decodeMessage(method.output, bytes, format),
          catch: (cause) => protocolDefect("Error decoding response message", cause)
        })
        return yield* writeResponse(clientId, exitResponse(message.id, Exit.succeed(value)))
      }

      if (response.status !== 200) {
        const error: Connect.WireError = {
          code: Connect.codeFromHttpStatus(response.status),
          message: `HTTP ${response.status}`,
          details: []
        }
        return yield* writeResponse(clientId, exitResponse(message.id, Connect.wireErrorToExit(method, error)))
      }

      const decoder = new Connect.EnvelopeDecoder()
      let ended = false
      yield* response.stream.pipe(
        Stream.mapError((cause) => protocolDefect("Error reading response stream", cause)),
        Stream.runForEach((chunk) =>
          Effect.forEach(decoder.push(chunk), (env) => {
            if ((env.flags & Connect.FLAG_END_STREAM) !== 0) {
              ended = true
              const end = safeJson(env.data) as { readonly error?: unknown } | undefined
              const exit = end?.error !== undefined && end.error !== null
                ? Connect.wireErrorToExit(method, Connect.wireErrorFromJson(end.error, "unknown"))
                : Exit.void
              return writeResponse(clientId, exitResponse(message.id, exit))
            }
            return Effect.try({
              try: () => Connect.decodeMessage(method.output, env.data, format),
              catch: (cause) => protocolDefect("Error decoding stream message", cause)
            }).pipe(
              Effect.flatMap((value) =>
                writeResponse(clientId, { _tag: "Chunk", requestId: message.id, values: [value] })
              )
            )
          }, { discard: true })
        )
      )
      if (!ended) return yield* protocolDefect("stream ended without an end-stream message")
    })

    return {
      send,
      supportsAck: false,
      supportsTransferables: false,
      codecFor: identityCodecFor
    }
  }))

const safeJson = (bytes: Uint8Array): unknown => {
  try {
    return Connect.decodeJsonBytes(bytes)
  } catch {
    return undefined
  }
}

/**
 * Provides a client `Protocol` that sends rpc requests as Connect calls.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const layerProtocol = (
  group: RpcGroup.Any,
  options: Options
): Layer.Layer<RpcClient.Protocol, never, HttpClient.HttpClient> =>
  Layer.effect(RpcClient.Protocol)(makeProtocol(group, options))

/**
 * Creates a typed Connect client for an `RpcGroup`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { ConnectClient } from "@effect/protobuf"
 * import { PointService } from "./gen/acme/v1/kitchen_sink_effect.ts"
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* ConnectClient.make(PointService, { baseUrl: "http://localhost:8080" })
 *   const point = yield* client.GetPoint({ id: 1 })
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
export const make = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options: Options
): Effect.Effect<RpcClient.RpcClient<Rpcs>, never, HttpClient.HttpClient | Scope.Scope | Rpc.MiddlewareClient<Rpcs>> =>
  Effect.flatMap(
    makeProtocol(group, options),
    (protocol) => RpcClient.make(group).pipe(Effect.provideService(RpcClient.Protocol, protocol))
  ) as any
