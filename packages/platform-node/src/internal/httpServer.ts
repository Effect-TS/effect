import * as MultipartNode from "@effect/platform-node-shared/NodeMultipart"
import * as Cookies from "@effect/platform/Cookies"
import * as Etag from "@effect/platform/Etag"
import * as FileSystem from "@effect/platform/FileSystem"
import type * as Headers from "@effect/platform/Headers"
import * as App from "@effect/platform/HttpApp"
import * as IncomingMessage from "@effect/platform/HttpIncomingMessage"
import type { HttpMethod } from "@effect/platform/HttpMethod"
import type * as Middleware from "@effect/platform/HttpMiddleware"
import * as Server from "@effect/platform/HttpServer"
import * as Error from "@effect/platform/HttpServerError"
import * as ServerRequest from "@effect/platform/HttpServerRequest"
import type * as ServerResponse from "@effect/platform/HttpServerResponse"
import type * as Multipart from "@effect/platform/Multipart"
import type * as Path from "@effect/platform/Path"
import * as Socket from "@effect/platform/Socket"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as FiberSet from "effect/FiberSet"
import { type LazyArg, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { ReadonlyRecord } from "effect/Record"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Http from "node:http"
import type * as Net from "node:net"
import type { Duplex } from "node:stream"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import * as WS from "ws"
import * as NodeContext from "../NodeContext.js"
import * as NodeHttpClient from "../NodeHttpClient.js"
import { HttpIncomingMessageImpl } from "./httpIncomingMessage.js"
import * as internalPlatform from "./httpPlatform.js"

/** @internal */
export const make = (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
): Effect.Effect<Server.HttpServer, Error.ServeError, Scope.Scope> =>
  Effect.gen(function*() {
    const scope = yield* Effect.scope
    const server = yield* Effect.acquireRelease(
      Effect.sync(evaluate),
      (server) =>
        Effect.async<void>((resume) => {
          if (!server.listening) {
            return resume(Effect.void)
          }
          server.close((error) => {
            if (error) {
              resume(Effect.die(error))
            } else {
              resume(Effect.void)
            }
          })
        })
    )

    yield* Effect.async<void, Error.ServeError>((resume) => {
      function onError(cause: Error) {
        resume(Effect.fail(new Error.ServeError({ cause })))
      }
      server.on("error", onError)
      server.listen(options, () => {
        server.off("error", onError)
        resume(Effect.void)
      })
    })

    const address = server.address()!

    const wss = yield* pipe(
      Effect.acquireRelease(
        Effect.sync(() => new WS.WebSocketServer({ noServer: true })),
        (wss) =>
          Effect.async<void>((resume) => {
            wss.close(() => resume(Effect.void))
          })
      ),
      Scope.extend(scope),
      Effect.cached
    )

    return Server.make({
      address: typeof address === "string" ?
        {
          _tag: "UnixAddress",
          path: address
        } :
        {
          _tag: "TcpAddress",
          hostname: address.address === "::" ? "0.0.0.0" : address.address,
          port: address.port
        },
      serve: (httpApp, middleware) =>
        Effect.gen(function*() {
          const handler = yield* makeHandler(httpApp, middleware!)
          const upgradeHandler = yield* makeUpgradeHandler(wss, httpApp, middleware!)
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              server.off("request", handler)
              server.off("upgrade", upgradeHandler)
            })
          )
          server.on("request", handler)
          server.on("upgrade", upgradeHandler)
        })
    })
  }).pipe(
    Effect.provideService(
      IncomingMessage.MaxBodySize,
      Option.some(FileSystem.Size(1024 * 1024 * 10))
    )
  )

/** @internal */
export const makeHandler: {
  <R, E>(httpApp: App.Default<E, R>): Effect.Effect<
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse) => void,
    never,
    Exclude<R, ServerRequest.HttpServerRequest | Scope.Scope>
  >
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware: Middleware.HttpMiddleware.Applied<App, E, R>
  ): Effect.Effect<
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse) => void,
    never,
    Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest | Scope.Scope>
  >
} = <E, R>(httpApp: App.Default<E, R>, middleware?: Middleware.HttpMiddleware) => {
  const handledApp = App.toHandled(httpApp, handleResponse, middleware)
  return Effect.map(Effect.runtime<R>(), (runtime) => {
    const runFork = Runtime.runFork(runtime)
    return function handler(
      nodeRequest: Http.IncomingMessage,
      nodeResponse: Http.ServerResponse
    ) {
      const fiber = runFork(
        Effect.provideService(
          handledApp,
          ServerRequest.HttpServerRequest,
          new ServerRequestImpl(nodeRequest, nodeResponse)
        )
      )
      nodeResponse.on("close", () => {
        if (!nodeResponse.writableEnded) {
          fiber.unsafeInterruptAsFork(Error.clientAbortFiberId)
        }
      })
    }
  })
}

/** @internal */
export const makeUpgradeHandler = <R, E>(
  lazyWss: Effect.Effect<WS.WebSocketServer>,
  httpApp: App.Default<E, R>,
  middleware?: Middleware.HttpMiddleware
) => {
  const handledApp = App.toHandled(httpApp, handleResponse, middleware)
  return Effect.map(FiberSet.makeRuntime<R>(), (runFork) =>
    function handler(
      nodeRequest: Http.IncomingMessage,
      socket: Duplex,
      head: Buffer
    ) {
      let nodeResponse_: Http.ServerResponse | undefined = undefined
      const nodeResponse = () => {
        if (nodeResponse_ === undefined) {
          nodeResponse_ = new Http.ServerResponse(nodeRequest)
          nodeResponse_.assignSocket(socket as any)
          nodeResponse_.on("finish", () => {
            socket.end()
          })
        }
        return nodeResponse_
      }
      const upgradeEffect = Socket.fromWebSocket(Effect.flatMap(
        lazyWss,
        (wss) =>
          Effect.acquireRelease(
            Effect.async<globalThis.WebSocket>((resume) =>
              wss.handleUpgrade(nodeRequest, socket, head, (ws) => {
                resume(Effect.succeed(ws as any))
              })
            ),
            (ws) => Effect.sync(() => ws.close())
          )
      ))
      const fiber = runFork(
        Effect.provideService(
          handledApp,
          ServerRequest.HttpServerRequest,
          new ServerRequestImpl(nodeRequest, nodeResponse, upgradeEffect)
        )
      )
      socket.on("close", () => {
        if (!socket.writableEnded) {
          fiber.unsafeInterruptAsFork(Error.clientAbortFiberId)
        }
      })
    })
}

class ServerRequestImpl extends HttpIncomingMessageImpl<Error.RequestError> implements ServerRequest.HttpServerRequest {
  readonly [ServerRequest.TypeId]: ServerRequest.TypeId

  constructor(
    readonly source: Http.IncomingMessage,
    readonly response: Http.ServerResponse | LazyArg<Http.ServerResponse>,
    private upgradeEffect?: Effect.Effect<Socket.Socket, Error.RequestError>,
    readonly url = source.url!,
    private headersOverride?: Headers.Headers,
    remoteAddressOverride?: string
  ) {
    super(source, (cause) =>
      new Error.RequestError({
        request: this,
        reason: "Decode",
        cause
      }), remoteAddressOverride)
    this[ServerRequest.TypeId] = ServerRequest.TypeId
  }

  private cachedCookies: ReadonlyRecord<string, string> | undefined
  get cookies() {
    if (this.cachedCookies) {
      return this.cachedCookies
    }
    return this.cachedCookies = Cookies.parseHeader(this.headers.cookie ?? "")
  }

  get resolvedResponse(): Http.ServerResponse {
    return typeof this.response === "function" ? this.response() : this.response
  }

  modify(
    options: {
      readonly url?: string | undefined
      readonly headers?: Headers.Headers | undefined
      readonly remoteAddress?: string | undefined
    }
  ) {
    return new ServerRequestImpl(
      this.source,
      this.response,
      this.upgradeEffect,
      options.url ?? this.url,
      options.headers ?? this.headersOverride,
      options.remoteAddress ?? this.remoteAddressOverride
    )
  }

  get originalUrl(): string {
    return this.source.url!
  }

  get method(): HttpMethod {
    return this.source.method!.toUpperCase() as HttpMethod
  }

  get headers(): Headers.Headers {
    this.headersOverride ??= this.source.headers as Headers.Headers
    return this.headersOverride
  }

  private multipartEffect:
    | Effect.Effect<
      Multipart.Persisted,
      Multipart.MultipartError,
      Scope.Scope | FileSystem.FileSystem | Path.Path
    >
    | undefined
  get multipart(): Effect.Effect<
    Multipart.Persisted,
    Multipart.MultipartError,
    Scope.Scope | FileSystem.FileSystem | Path.Path
  > {
    if (this.multipartEffect) {
      return this.multipartEffect
    }
    this.multipartEffect = Effect.runSync(Effect.cached(
      MultipartNode.persisted(this.source, this.source.headers)
    ))
    return this.multipartEffect
  }

  get multipartStream(): Stream.Stream<Multipart.Part, Multipart.MultipartError> {
    return MultipartNode.stream(this.source, this.source.headers)
  }

  get upgrade(): Effect.Effect<Socket.Socket, Error.RequestError> {
    return this.upgradeEffect ?? Effect.fail(
      new Error.RequestError({
        request: this,
        reason: "Decode",
        description: "not an upgradeable ServerRequest"
      })
    )
  }

  toString(): string {
    return `ServerRequest(${this.method} ${this.url})`
  }

  toJSON(): unknown {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/HttpServerRequest",
      method: this.method,
      url: this.originalUrl
    })
  }
}

/** @internal */
export const layerServer = (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) => Layer.scoped(Server.HttpServer, make(evaluate, options))

/** @internal */
export const layerContext = Layer.mergeAll(
  internalPlatform.layer,
  Etag.layerWeak,
  NodeContext.layer
)

/** @internal */
export const layer = (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) =>
  Layer.mergeAll(
    Layer.scoped(Server.HttpServer, make(evaluate, options)),
    layerContext
  )

/** @internal */
export const layerTest = Server.layerTestClient.pipe(
  Layer.provide(NodeHttpClient.layerWithoutAgent),
  Layer.provide(NodeHttpClient.makeAgentLayer({ keepAlive: false })),
  Layer.provideMerge(layer(Http.createServer, { port: 0 }))
)

/** @internal */
export const layerConfig = (
  evaluate: LazyArg<Http.Server>,
  options: Config.Config.Wrap<Net.ListenOptions>
) =>
  Layer.mergeAll(
    Layer.scoped(
      Server.HttpServer,
      Effect.flatMap(Config.unwrap(options), (options) => make(evaluate, options))
    ),
    internalPlatform.layer,
    Etag.layerWeak,
    NodeContext.layer
  )

const handleResponse = (request: ServerRequest.HttpServerRequest, response: ServerResponse.HttpServerResponse) =>
  Effect.suspend((): Effect.Effect<void, Error.ResponseError> => {
    const nodeResponse = (request as ServerRequestImpl).resolvedResponse
    if (nodeResponse.writableEnded) {
      return Effect.void
    }

    let headers: Record<string, string | Array<string>> = response.headers
    if (!Cookies.isEmpty(response.cookies)) {
      headers = { ...headers }
      const toSet = Cookies.toSetCookieHeaders(response.cookies)
      if (headers["set-cookie"] !== undefined) {
        toSet.push(headers["set-cookie"] as string)
      }
      headers["set-cookie"] = toSet
    }

    if (request.method === "HEAD") {
      nodeResponse.writeHead(response.status, headers)
      return Effect.async<void>((resume) => {
        nodeResponse.end(() => resume(Effect.void))
      })
    }
    const body = response.body
    switch (body._tag) {
      case "Empty": {
        nodeResponse.writeHead(response.status, headers)
        nodeResponse.end()
        return Effect.void
      }
      case "Raw": {
        nodeResponse.writeHead(response.status, headers)
        if (
          typeof body.body === "object" && body.body !== null && "pipe" in body.body &&
          typeof body.body.pipe === "function"
        ) {
          return Effect.tryPromise({
            try: (signal) => pipeline(body.body as any, nodeResponse, { signal, end: true }),
            catch: (cause) =>
              new Error.ResponseError({
                request,
                response,
                reason: "Decode",
                cause
              })
          }).pipe(
            Effect.interruptible,
            Effect.tapErrorCause(handleCause(nodeResponse, response))
          )
        }
        return Effect.async<void>((resume) => {
          nodeResponse.end(body.body, () => resume(Effect.void))
        })
      }
      case "Uint8Array": {
        nodeResponse.writeHead(response.status, headers)
        return Effect.async<void>((resume) => {
          nodeResponse.end(body.body, () => resume(Effect.void))
        })
      }
      case "FormData": {
        return Effect.suspend(() => {
          const r = new Response(body.formData)
          nodeResponse.writeHead(response.status, {
            ...headers,
            ...Object.fromEntries(r.headers)
          })
          return Effect.async<void, Error.ResponseError>((resume, signal) => {
            Readable.fromWeb(r.body as any, { signal })
              .pipe(nodeResponse)
              .on("error", (cause) => {
                resume(Effect.fail(
                  new Error.ResponseError({
                    request,
                    response,
                    reason: "Decode",
                    cause
                  })
                ))
              })
              .once("finish", () => {
                resume(Effect.void)
              })
          }).pipe(
            Effect.interruptible,
            Effect.tapErrorCause(handleCause(nodeResponse, response))
          )
        })
      }
      case "Stream": {
        nodeResponse.writeHead(response.status, headers)
        const drainLatch = Effect.unsafeMakeLatch()
        nodeResponse.on("drain", () => drainLatch.unsafeOpen())
        return body.stream.pipe(
          Stream.orDie,
          Stream.runForEachChunk((chunk) => {
            const array = Chunk.toReadonlyArray(chunk)
            if (array.length === 0) return Effect.void
            let needDrain = false
            for (let i = 0; i < array.length; i++) {
              const written = nodeResponse.write(array[i])
              if (!written && !needDrain) {
                needDrain = true
                drainLatch.unsafeClose()
              } else if (written && needDrain) {
                needDrain = false
              }
            }
            if (!needDrain) return Effect.void
            return drainLatch.await
          }),
          Effect.interruptible,
          Effect.matchCauseEffect({
            onSuccess: () => Effect.sync(() => nodeResponse.end()),
            onFailure: handleCause(nodeResponse, response)
          })
        )
      }
    }
  })

const handleCause = (
  nodeResponse: Http.ServerResponse,
  original: ServerResponse.HttpServerResponse
) =>
<E>(originalCause: Cause.Cause<E>) =>
  Error.causeResponse(originalCause).pipe(
    Effect.flatMap(([response, cause]) => {
      const headersSent = nodeResponse.headersSent
      if (!headersSent) {
        nodeResponse.writeHead(response.status)
      }
      if (!nodeResponse.writableEnded) {
        nodeResponse.end()
      }
      return Effect.failCause(
        headersSent
          ? Cause.sequential(originalCause, Cause.die(original))
          : cause
      )
    })
  )

/** @internal */
export const toIncomingMessage = (self: ServerRequest.HttpServerRequest): Http.IncomingMessage =>
  (self as ServerRequestImpl).source

/** @internal */
export const toServerResponse = (self: ServerRequest.HttpServerRequest): Http.ServerResponse => {
  const res = (self as ServerRequestImpl).response
  return typeof res === "function" ? res() : res
}
