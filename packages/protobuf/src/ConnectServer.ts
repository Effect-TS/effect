/**
 * Serves an `RpcGroup` over the Connect protocol.
 *
 * PROTOTYPE — see the package README.
 *
 * Each rpc is served at `POST /<ServiceName>/<Rpc tag>`. Unary rpcs accept
 * `application/proto` and `application/json`; streaming rpcs (`stream: true`)
 * are served as Connect server streams (`application/connect+proto` and
 * `application/connect+json`). Handlers, middleware, and tracing come from
 * `RpcServer` unchanged.
 *
 * Not implemented: GET requests, compression, client and bidi streaming.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Rpc from "effect/rpc/Rpc"
import type * as RpcGroup from "effect/rpc/RpcGroup"
import type { FromClientEncoded, FromServerEncoded } from "effect/rpc/RpcMessage"
import * as RpcServer from "effect/rpc/RpcServer"
import type * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { Code } from "./ConnectRpc.ts"
import * as Connect from "./internal/connect.ts"

/**
 * Options for {@link layer} and {@link layerProtocol}.
 *
 * @stability unstable
 * @since 4.0.0
 */
export interface Options {
  /** Overrides the `ConnectRpc.ServiceName` annotation of the group. */
  readonly serviceName?: string | undefined
  /** Path prefix for all routes, for example `"/api"`. */
  readonly prefix?: string | undefined
}

const identityCodecFor = <S extends Schema.Top>(schema: S) => schema as any

const errorResponse = (error: Connect.WireError) =>
  HttpServerResponse.uint8Array(Connect.encodeJsonBytes(Connect.wireErrorToJson(error)), {
    status: Connect.codeToHttpStatus(error.code),
    contentType: "application/json"
  })

const protocolError = (code: Code, message: string) => errorResponse({ code, message, details: [] })

/**
 * Creates the Connect server `Protocol` for a group and registers one POST
 * route per rpc on the current `HttpRouter`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const makeProtocol: (
  group: RpcGroup.Any,
  options?: Options
) => Effect.Effect<RpcServer.Protocol["Service"], never, HttpRouter.HttpRouter> = Effect.fnUntraced(
  function*(group: RpcGroup.Any, options?: Options) {
    const methods = Connect.methods(group, options?.serviceName)
    const router = yield* HttpRouter.HttpRouter
    const disconnects = yield* Queue.make<number>()
    const clients = new Map<number, Queue.Queue<FromServerEncoded, Cause.Done>>()
    const clientIds = new Set<number>()
    let nextClientId = 0
    let writeRequest!: (clientId: number, message: FromClientEncoded) => Effect.Effect<void>

    const protocol = yield* RpcServer.Protocol.make((writeRequest_) => {
      writeRequest = writeRequest_
      return Effect.succeed({
        disconnects,
        send(clientId, response) {
          const queue = clients.get(clientId)
          return queue ? Queue.offer(queue, response).pipe(Effect.asVoid) : Effect.void
        },
        end(clientId) {
          const queue = clients.get(clientId)
          return queue ? Queue.end(queue).pipe(Effect.asVoid) : Effect.void
        },
        clientIds: Effect.sync(() => clientIds),
        initialMessage: Effect.succeedNone,
        supportsAck: false,
        supportsTransferables: false,
        supportsSpanPropagation: false,
        supportsNotifications: false,
        codecFor: identityCodecFor
      })
    })

    const handler = (method: Connect.Method) =>
      Effect.gen(function*() {
        const fiber = Fiber.getCurrent()!
        const request = Context.getUnsafe(fiber.context, HttpServerRequest.HttpServerRequest)
        const scope = Context.getUnsafe(fiber.context, Scope.Scope)
        const type = Connect.parseContentType(request.headers["content-type"])
        if (type === undefined || type.stream !== method.stream) {
          return HttpServerResponse.empty({ status: 415 })
        }
        const encoding = request.headers[method.stream ? "connect-content-encoding" : "content-encoding"]
        if (encoding !== undefined && encoding !== "identity") {
          return protocolError("unimplemented", `unsupported compression "${encoding}"`)
        }
        const body = new Uint8Array(yield* Effect.orDie(request.arrayBuffer))

        // decode the request message
        let payload: unknown
        // @effect-diagnostics-next-line tryCatchInEffectGen:off
        try {
          let messageBytes: Uint8Array = body
          if (method.stream) {
            const decoder = new Connect.EnvelopeDecoder()
            const envelopes = decoder.push(body)
            if (envelopes.length !== 1 || decoder.pending !== 0) {
              return yield* streamError(method, type.format, {
                code: "invalid_argument",
                message: "expected exactly one request message",
                details: []
              })
            }
            if ((envelopes[0].flags & Connect.FLAG_COMPRESSED) !== 0) {
              return yield* streamError(method, type.format, {
                code: "unimplemented",
                message: "compressed messages are not supported",
                details: []
              })
            }
            messageBytes = envelopes[0].data
          }
          payload = Connect.decodeMessage(method.input, messageBytes, type.format)
        } catch (e) {
          const error: Connect.WireError = {
            code: "invalid_argument",
            message: `invalid request message: ${e instanceof Error ? e.message : String(e)}`,
            details: []
          }
          return method.stream ? yield* streamError(method, type.format, error) : errorResponse(error)
        }

        // hand the request to the rpc server as a single-request client
        const clientId = nextClientId++
        const queue = yield* Queue.make<FromServerEncoded, Cause.Done>()
        clients.set(clientId, queue)
        clientIds.add(clientId)
        let done = false
        yield* Scope.addFinalizer(
          scope,
          Effect.suspend(() => {
            clients.delete(clientId)
            clientIds.delete(clientId)
            Queue.offerUnsafe(disconnects, clientId)
            return done ? Effect.void : writeRequest(clientId, { _tag: "Interrupt", requestId: "0" })
          })
        )
        const headers = Object.entries(request.headers)
        yield* writeRequest(clientId, { _tag: "Request", id: "0", tag: method.tag, payload, headers })
        yield* writeRequest(clientId, { _tag: "Eof" })

        const timeout = parseTimeout(request.headers["connect-timeout-ms"])

        if (!method.stream) {
          const take = Effect.interruptible(takeExit(queue))
          const exit = timeout === undefined
            ? yield* take
            : yield* Effect.timeoutOption(take, timeout).pipe(
              Effect.map((o) => o._tag === "Some" ? o.value : "timeout" as const)
            )
          done = true
          if (exit === "timeout") {
            yield* writeRequest(clientId, { _tag: "Interrupt", requestId: "0" })
            return protocolError("deadline_exceeded", "deadline exceeded")
          }
          if (exit._tag === "Defect") return errorResponse(defectError(exit.defect))
          const failure = Connect.exitFailure(exit.exit)
          if (failure !== undefined) return errorResponse(Connect.failureToWireError(method, failure))
          return HttpServerResponse.uint8Array(
            Connect.encodeMessage(method.output, Connect.exitValue(exit.exit), type.format),
            { contentType: Connect.contentType(false, type.format) }
          )
        }

        // server stream: one envelope per chunk value, then the end-stream message
        const frames = Stream.fromQueue(queue).pipe(
          Stream.flatMap((message): Stream.Stream<Uint8Array> => {
            switch (message._tag) {
              case "Chunk":
                return Stream.fromIterable(
                  message.values.map((value) =>
                    Connect.envelope(0, Connect.encodeMessage(method.output, value, type.format))
                  )
                )
              case "Exit": {
                done = true
                const failure = Connect.exitFailure(message.exit)
                return Stream.succeed(
                  endStream(failure === undefined ? undefined : Connect.failureToWireError(method, failure))
                )
              }
              case "Defect":
                done = true
                return Stream.succeed(endStream(defectError(message.defect)))
              default:
                return Stream.empty
            }
          }),
          Stream.catchCause((cause) =>
            Stream.succeed(endStream({ code: "internal", message: Cause.pretty(cause), details: [] }))
          )
        )
        const body$ = timeout === undefined ? frames : frames.pipe(
          Stream.interruptWhen(Effect.sleep(timeout)),
          Stream.concat(Stream.suspend(() =>
            done ? Stream.empty : Stream.succeed(endStream({
              code: "deadline_exceeded",
              message: "deadline exceeded",
              details: []
            }))
          ))
        )
        return HttpServerResponse.stream(body$, { contentType: Connect.contentType(true, type.format) })
      })

    for (const method of methods.values()) {
      yield* router.add("POST", `${options?.prefix ?? ""}${method.path}` as HttpRouter.PathInput, handler(method))
    }

    return protocol
  }
)

type ExitMessage =
  | { readonly _tag: "Exit"; readonly exit: unknown }
  | { readonly _tag: "Defect"; readonly defect: unknown }

const takeExit = (queue: Queue.Queue<FromServerEncoded, Cause.Done>): Effect.Effect<ExitMessage> =>
  Effect.gen(function*() {
    for (;;) {
      const message = yield* Queue.take(queue).pipe(
        Effect.catchCause(() => Effect.succeed({ _tag: "Defect", defect: "rpc server ended the request" } as const))
      )
      if (message._tag === "Exit") return { _tag: "Exit", exit: message.exit }
      if (message._tag === "Defect") return { _tag: "Defect", defect: message.defect }
    }
  })

const defectError = (defect: unknown): Connect.WireError => ({
  code: "internal",
  message: typeof defect === "object" && defect !== null && typeof (defect as any).message === "string"
    ? (defect as any).message
    : "internal error",
  details: []
})

const endStream = (error: Connect.WireError | undefined): Uint8Array =>
  Connect.envelope(
    Connect.FLAG_END_STREAM,
    Connect.encodeJsonBytes(error === undefined ? {} : { error: Connect.wireErrorToJson(error) })
  )

const streamError = (_method: Connect.Method, format: Connect.Format, error: Connect.WireError) =>
  Effect.succeed(
    HttpServerResponse.uint8Array(endStream(error), { contentType: Connect.contentType(true, format) })
  )

const parseTimeout = (header: string | undefined): Duration.Duration | undefined => {
  if (header === undefined || !/^\d{1,10}$/.test(header)) return undefined
  return Duration.millis(Number(header))
}

/**
 * Provides the Connect server `Protocol` for a group, registering its routes on
 * the current `HttpRouter`.
 *
 * @stability unstable
 * @since 4.0.0
 */
export const layerProtocol = (
  group: RpcGroup.Any,
  options?: Options
): Layer.Layer<RpcServer.Protocol, never, HttpRouter.HttpRouter> =>
  Layer.effect(RpcServer.Protocol)(makeProtocol(group, options))

/**
 * Serves an `RpcGroup` over Connect on the current `HttpRouter`.
 *
 * @example
 * ```ts
 * import { Effect, Layer } from "effect"
 * import { HttpRouter } from "effect/http"
 * import { ConnectServer } from "@effect/protobuf"
 * import { PointService } from "./gen/acme/v1/kitchen_sink_effect.ts"
 *
 * const Handlers = PointService.toLayer({
 *   GetPoint: ({ id }) => Effect.succeed({ x: id, y: id }),
 *   // ...
 * })
 *
 * const Routes = ConnectServer.layer(PointService).pipe(Layer.provide(Handlers))
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
export const layer = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: Options & {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly concurrency?: number | "unbounded" | undefined
  }
): Layer.Layer<
  never,
  never,
  HttpRouter.HttpRouter | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>
> => RpcServer.layer(group, options).pipe(Layer.provide(layerProtocol(group, options)))
