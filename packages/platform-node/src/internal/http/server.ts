import * as Etag from "@effect/platform-node-shared/Http/Etag"
import * as MultipartNode from "@effect/platform-node-shared/Http/Multipart"
import * as FileSystem from "@effect/platform/FileSystem"
import * as App from "@effect/platform/Http/App"
import * as Cookies from "@effect/platform/Http/Cookies"
import type * as Headers from "@effect/platform/Http/Headers"
import * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import type { Method } from "@effect/platform/Http/Method"
import * as Middleware from "@effect/platform/Http/Middleware"
import type * as Multipart from "@effect/platform/Http/Multipart"
import * as Server from "@effect/platform/Http/Server"
import * as Error from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import type * as ServerResponse from "@effect/platform/Http/ServerResponse"
import type * as Path from "@effect/platform/Path"
import * as Socket from "@effect/platform/Socket"
import * as Cause from "effect/Cause"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import { type LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { ReadonlyRecord } from "effect/ReadonlyRecord"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Http from "node:http"
import type * as Net from "node:net"
import type { Duplex } from "node:stream"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import * as WS from "ws"
import * as NodeContext from "../../NodeContext.js"
import * as NodeSink from "../../NodeSink.js"
import { IncomingMessageImpl } from "./incomingMessage.js"
import * as internalPlatform from "./platform.js"

/** @internal */
export const make = (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
): Effect.Effect<Server.Server, Error.ServeError, Scope.Scope> =>
  Effect.gen(function*(_) {
    const scope = yield* _(Effect.scope)

    const server = yield* _(Effect.acquireRelease(
      Effect.sync(evaluate),
      (server) =>
        Effect.async<void>((resume) => {
          server.close((error) => {
            if (error) {
              resume(Effect.die(error))
            } else {
              resume(Effect.unit)
            }
          })
        })
    ))

    yield* _(Effect.async<void, Error.ServeError>((resume) => {
      server.on("error", (error) => {
        resume(Effect.fail(new Error.ServeError({ error })))
      })
      server.listen(options, () => {
        resume(Effect.unit)
      })
    }))

    const address = server.address()!

    const wss = yield* _(
      Effect.acquireRelease(
        Effect.sync(() => new WS.WebSocketServer({ noServer: true })),
        (wss) =>
          Effect.async<void>((resume) => {
            wss.close(() => resume(Effect.unit))
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
        Effect.gen(function*(_) {
          const handler = yield* _(makeHandler(httpApp, middleware!))
          const upgradeHandler = yield* _(makeUpgradeHandler(wss, httpApp, middleware!))
          yield* _(Effect.addFinalizer(() =>
            Effect.sync(() => {
              server.off("request", handler)
              server.off("upgrade", upgradeHandler)
            })
          ))
          server.on("request", handler)
          server.on("upgrade", upgradeHandler)
        })
    })
  }).pipe(
    Effect.locally(
      IncomingMessage.maxBodySize,
      Option.some(FileSystem.Size(1024 * 1024 * 10))
    )
  )

/** @internal */
export const makeHandler: {
  <R, E>(httpApp: App.Default<R, E>): Effect.Effect<
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse) => void,
    never,
    Exclude<R, ServerRequest.ServerRequest | Scope.Scope>
  >
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<R, E>,
    middleware: Middleware.Middleware.Applied<R, E, App>
  ): Effect.Effect<
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse) => void,
    never,
    Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest | Scope.Scope>
  >
} = <R, E>(httpApp: App.Default<R, E>, middleware?: Middleware.Middleware) => {
  const handledApp = Effect.scoped(
    middleware
      ? middleware(App.withDefaultMiddleware(respond(httpApp)))
      : App.withDefaultMiddleware(respond(httpApp))
  )
  return Effect.map(Effect.runtime<R>(), (runtime) => {
    const runFork = Runtime.runFork(runtime)
    return function handler(
      nodeRequest: Http.IncomingMessage,
      nodeResponse: Http.ServerResponse
    ) {
      const fiber = runFork(
        Effect.provideService(
          handledApp,
          ServerRequest.ServerRequest,
          new ServerRequestImpl(nodeRequest, nodeResponse)
        )
      )
      nodeResponse.on("close", () => {
        if (!nodeResponse.writableEnded) {
          if (!nodeResponse.headersSent) {
            nodeResponse.writeHead(499)
          }
          nodeResponse.end()
          runFork(fiber.interruptAsFork(Error.clientAbortFiberId))
        }
      })
    }
  })
}

/** @internal */
export const makeUpgradeHandler = <R, E>(
  lazyWss: Effect.Effect<WS.WebSocketServer>,
  httpApp: App.Default<R, E>,
  middleware?: Middleware.Middleware
) => {
  const handledApp = Effect.scoped(
    middleware
      ? middleware(App.withDefaultMiddleware(respond(httpApp)))
      : App.withDefaultMiddleware(respond(httpApp))
  )
  return Effect.map(Effect.runtime<R>(), (runtime) => {
    const runFork = Runtime.runFork(runtime)
    return function handler(
      nodeRequest: Http.IncomingMessage,
      socket: Duplex,
      head: Buffer
    ) {
      let nodeResponse_: Http.ServerResponse | undefined = undefined
      const nodeResponse = () => {
        if (nodeResponse_ === undefined) {
          nodeResponse_ = new Http.ServerResponse(nodeRequest)
          nodeResponse_.assignSocket(socket as any)
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
          ServerRequest.ServerRequest,
          new ServerRequestImpl(nodeRequest, nodeResponse, upgradeEffect)
        )
      )
      socket.on("close", () => {
        const res = nodeResponse()
        if (!socket.writableEnded) {
          if (!res.headersSent) {
            res.writeHead(499)
          }
          res.end()
          runFork(fiber.interruptAsFork(Error.clientAbortFiberId))
        }
      })
    }
  })
}

const respond = Middleware.make((httpApp) =>
  Effect.uninterruptibleMask((restore) =>
    Effect.flatMap(ServerRequest.ServerRequest, (request) =>
      Effect.tapErrorCause(
        restore(
          Effect.tap(
            Effect.flatMap(
              httpApp,
              (response) => Effect.flatMap(App.preResponseHandler, (f) => f(request, response))
            ),
            (response) => handleResponse(request, response)
          )
        ),
        (cause) =>
          Effect.sync(() => {
            const nodeResponse = (request as ServerRequestImpl).resolvedResponse
            if (!nodeResponse.headersSent) {
              nodeResponse.writeHead(Cause.isInterruptedOnly(cause) ? 503 : 500)
            }
            if (!nodeResponse.writableEnded) {
              nodeResponse.end()
            }
          })
      ))
  )
)

class ServerRequestImpl extends IncomingMessageImpl<Error.RequestError> implements ServerRequest.ServerRequest {
  readonly [ServerRequest.TypeId]: ServerRequest.TypeId

  constructor(
    readonly source: Http.IncomingMessage,
    readonly response: Http.ServerResponse | LazyArg<Http.ServerResponse>,
    private upgradeEffect?: Effect.Effect<Socket.Socket, Error.RequestError>,
    readonly url = source.url!,
    private headersOverride?: Headers.Headers,
    remoteAddressOverride?: string
  ) {
    super(source, (_) =>
      new Error.RequestError({
        request: this,
        reason: "Decode",
        error: _
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

  get method(): Method {
    return this.source.method!.toUpperCase() as Method
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
        error: "not an upgradeable ServerRequest"
      })
    )
  }

  toString(): string {
    return `ServerRequest(${this.method} ${this.url})`
  }

  toJSON(): unknown {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/Http/ServerRequest",
      method: this.method,
      url: this.originalUrl
    })
  }
}

/** @internal */
export const layerServer = (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) => Layer.scoped(Server.Server, make(evaluate, options))

/** @internal */
export const layer = (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) =>
  Layer.mergeAll(
    Layer.scoped(Server.Server, make(evaluate, options)),
    internalPlatform.layer,
    Etag.layerWeak,
    NodeContext.layer
  )

/** @internal */
export const layerConfig = (
  evaluate: LazyArg<Http.Server>,
  options: Config.Config.Wrap<Net.ListenOptions>
) =>
  Layer.mergeAll(
    Layer.scoped(
      Server.Server,
      Effect.flatMap(Config.unwrap(options), (options) => make(evaluate, options))
    ),
    internalPlatform.layer,
    Etag.layerWeak,
    NodeContext.layer
  )

const handleResponse = (request: ServerRequest.ServerRequest, response: ServerResponse.ServerResponse) =>
  Effect.suspend((): Effect.Effect<void, Error.ResponseError> => {
    const nodeResponse = (request as ServerRequestImpl).resolvedResponse
    if (nodeResponse.writableEnded) {
      return Effect.unit
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
      nodeResponse.end()
      return Effect.unit
    }
    const body = response.body
    switch (body._tag) {
      case "Empty": {
        nodeResponse.writeHead(response.status, headers)
        nodeResponse.end()
        return Effect.unit
      }
      case "Raw": {
        nodeResponse.writeHead(response.status, headers)
        if (
          typeof body.body === "object" && body.body !== null && "pipe" in body.body &&
          typeof body.body.pipe === "function"
        ) {
          return Effect.tryPromise({
            try: (signal) => pipeline(body.body as any, nodeResponse, { signal, end: true }),
            catch: (error) =>
              new Error.ResponseError({
                request,
                response,
                reason: "Decode",
                error
              })
          })
        }
        nodeResponse.end(body.body)
        return Effect.unit
      }
      case "Uint8Array": {
        nodeResponse.writeHead(response.status, headers)
        nodeResponse.end(body.body)
        return Effect.unit
      }
      case "FormData": {
        return Effect.async<void, Error.ResponseError>((resume) => {
          const r = new Response(body.formData)
          nodeResponse.writeHead(response.status, {
            ...headers,
            ...Object.fromEntries(r.headers)
          })
          Readable.fromWeb(r.body as any)
            .pipe(nodeResponse)
            .on("error", (error) => {
              resume(Effect.fail(
                new Error.ResponseError({
                  request,
                  response,
                  reason: "Decode",
                  error
                })
              ))
            })
            .once("finish", () => {
              resume(Effect.unit)
            })
        })
      }
      case "Stream": {
        nodeResponse.writeHead(response.status, headers)
        return Stream.run(
          Stream.mapError(
            body.stream,
            (error) =>
              new Error.ResponseError({
                request,
                response,
                reason: "Decode",
                error
              })
          ),
          NodeSink.fromWritable(() => nodeResponse, (error) =>
            new Error.ResponseError({
              request,
              response,
              reason: "Decode",
              error
            }))
        )
      }
    }
  })

/** @internal */
export const requestSource = (self: ServerRequest.ServerRequest): Http.IncomingMessage =>
  (self as ServerRequestImpl).source
