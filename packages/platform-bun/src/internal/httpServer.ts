import * as Cookies from "@effect/platform/Cookies"
import * as Etag from "@effect/platform/Etag"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import type * as FileSystem from "@effect/platform/FileSystem"
import * as Headers from "@effect/platform/Headers"
import * as App from "@effect/platform/HttpApp"
import * as IncomingMessage from "@effect/platform/HttpIncomingMessage"
import type { HttpMethod } from "@effect/platform/HttpMethod"
import * as Server from "@effect/platform/HttpServer"
import * as Error from "@effect/platform/HttpServerError"
import * as ServerRequest from "@effect/platform/HttpServerRequest"
import type * as ServerResponse from "@effect/platform/HttpServerResponse"
import type * as Multipart from "@effect/platform/Multipart"
import type * as Path from "@effect/platform/Path"
import * as Socket from "@effect/platform/Socket"
import * as UrlParams from "@effect/platform/UrlParams"
import type { Server as BunServer, ServerWebSocket, WebSocketServeOptions } from "bun"
import * as Config from "effect/Config"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberSet from "effect/FiberSet"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { ReadonlyRecord } from "effect/Record"
import type * as Runtime from "effect/Runtime"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as BunContext from "../BunContext.js"
import * as Platform from "../BunHttpPlatform.js"
import type * as BunHttpServer from "../BunHttpServer.js"
import * as MultipartBun from "./multipart.js"

/** @internal */
export const make = <R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<Extract<K, string>> } = {}>(
  options: BunHttpServer.ServeOptions<R>
): Effect.Effect<Server.HttpServer, never, Scope.Scope> =>
  Effect.gen(function*() {
    const handlerStack: Array<(request: Request, server: BunServer) => Response | Promise<Response>> = [
      function(_request, _server) {
        return new Response("not found", { status: 404 })
      }
    ]
    const server = Bun.serve<WebSocketContext, R>({
      ...options as WebSocketServeOptions<WebSocketContext>,
      fetch: handlerStack[0],
      websocket: {
        open(ws) {
          Deferred.unsafeDone(ws.data.deferred, Exit.succeed(ws))
        },
        message(ws, message) {
          ws.data.run(message)
        },
        close(ws, code, closeReason) {
          Deferred.unsafeDone(
            ws.data.closeDeferred,
            Socket.defaultCloseCodeIsError(code)
              ? Exit.fail(new Socket.SocketCloseError({ reason: "Close", code, closeReason }))
              : Exit.void
          )
        }
      }
    })

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        server.stop()
      })
    )

    return Server.make({
      address: { _tag: "TcpAddress", port: server.port!, hostname: server.hostname! },
      serve(httpApp, middleware) {
        return Effect.gen(function*() {
          const runFork = yield* FiberSet.makeRuntime<never>()
          const runtime = yield* Effect.runtime<never>()
          const app = App.toHandled(httpApp, (request, response) =>
            Effect.sync(() => {
              ;(request as ServerRequestImpl).resolve(makeResponse(request, response, runtime))
            }), middleware)

          function handler(request: Request, server: BunServer) {
            return new Promise<Response>((resolve, _reject) => {
              const fiber = runFork(Effect.provideService(
                app,
                ServerRequest.HttpServerRequest,
                new ServerRequestImpl(request, resolve, removeHost(request.url), server)
              ))
              request.signal.addEventListener("abort", () => {
                runFork(fiber.interruptAsFork(Error.clientAbortFiberId))
              }, { once: true })
            })
          }

          yield* Effect.acquireRelease(
            Effect.sync(() => {
              handlerStack.push(handler)
              server.reload({ fetch: handler })
            }),
            () =>
              Effect.sync(() => {
                handlerStack.pop()
                server.reload({ fetch: handlerStack[handlerStack.length - 1] })
              })
          )
        })
      }
    })
  })

const makeResponse = (
  request: ServerRequest.HttpServerRequest,
  response: ServerResponse.HttpServerResponse,
  runtime: Runtime.Runtime<never>
): Response => {
  const fields: {
    headers: globalThis.Headers
    status?: number
    statusText?: string
  } = {
    headers: new globalThis.Headers(response.headers),
    status: response.status
  }

  if (!Cookies.isEmpty(response.cookies)) {
    for (const header of Cookies.toSetCookieHeaders(response.cookies)) {
      fields.headers.append("set-cookie", header)
    }
  }

  if (response.statusText !== undefined) {
    fields.statusText = response.statusText
  }

  if (request.method === "HEAD") {
    return new Response(undefined, fields)
  }
  response = App.unsafeEjectStreamScope(response)
  const body = response.body
  switch (body._tag) {
    case "Empty": {
      return new Response(undefined, fields)
    }
    case "Uint8Array":
    case "Raw": {
      if (body.body instanceof Response) {
        for (const [key, value] of fields.headers.entries()) {
          body.body.headers.set(key, value)
        }
        return body.body
      }
      return new Response(body.body as any, fields)
    }
    case "FormData": {
      return new Response(body.formData as any, fields)
    }
    case "Stream": {
      return new Response(
        Stream.toReadableStreamRuntime(body.stream, runtime),
        fields
      )
    }
  }
}

/** @internal */
export const layerServer = <R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<Extract<K, string>> } = {}>(
  options: BunHttpServer.ServeOptions<R>
) => Layer.scoped(Server.HttpServer, make(options))

/** @internal */
export const layerContext = Layer.mergeAll(
  Platform.layer,
  Etag.layerWeak,
  BunContext.layer
)

/** @internal */
export const layer = <R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<Extract<K, string>> } = {}>(
  options: BunHttpServer.ServeOptions<R>
) =>
  Layer.mergeAll(
    Layer.scoped(Server.HttpServer, make(options)),
    layerContext
  )

/** @internal */
export const layerTest = Server.layerTestClient.pipe(
  Layer.provide(FetchHttpClient.layer.pipe(
    Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { keepalive: false }))
  )),
  Layer.provideMerge(layer({ port: 0 }))
)

/** @internal */
export const layerConfig = <R extends { [K in keyof R]: Bun.RouterTypes.RouteValue<Extract<K, string>> } = {}>(
  options: Config.Config.Wrap<BunHttpServer.ServeOptions<R>>
) =>
  Layer.mergeAll(
    Layer.scoped(Server.HttpServer, Effect.flatMap(Config.unwrap(options), make)),
    layerContext
  )

interface WebSocketContext {
  readonly deferred: Deferred.Deferred<ServerWebSocket<WebSocketContext>>
  readonly closeDeferred: Deferred.Deferred<void, Socket.SocketError>
  readonly buffer: Array<Uint8Array | string>
  run: (_: Uint8Array | string) => void
}

function wsDefaultRun(this: WebSocketContext, _: Uint8Array | string) {
  this.buffer.push(_)
}

class ServerRequestImpl extends Inspectable.Class implements ServerRequest.HttpServerRequest {
  readonly [ServerRequest.TypeId]: ServerRequest.TypeId
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId
  constructor(
    readonly source: Request,
    public resolve: (response: Response) => void,
    readonly url: string,
    private bunServer: BunServer,
    public headersOverride?: Headers.Headers,
    private remoteAddressOverride?: string
  ) {
    super()
    this[ServerRequest.TypeId] = ServerRequest.TypeId
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId
  }
  toJSON(): unknown {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/HttpServerRequest",
      method: this.method,
      url: this.originalUrl
    })
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
      this.resolve,
      options.url ?? this.url,
      this.bunServer,
      options.headers ?? this.headersOverride,
      options.remoteAddress ?? this.remoteAddressOverride
    )
  }
  get method(): HttpMethod {
    return this.source.method.toUpperCase() as HttpMethod
  }
  get originalUrl() {
    return this.source.url
  }
  get remoteAddress(): Option.Option<string> {
    return this.remoteAddressOverride
      ? Option.some(this.remoteAddressOverride)
      : Option.fromNullable(this.bunServer.requestIP(this.source)?.address)
  }
  get headers(): Headers.Headers {
    this.headersOverride ??= Headers.fromInput(this.source.headers)
    return this.headersOverride
  }

  private cachedCookies: ReadonlyRecord<string, string> | undefined
  get cookies() {
    if (this.cachedCookies) {
      return this.cachedCookies
    }
    return this.cachedCookies = Cookies.parseHeader(this.headers.cookie ?? "")
  }

  get stream(): Stream.Stream<Uint8Array, Error.RequestError> {
    return this.source.body
      ? Stream.fromReadableStream(() => this.source.body as any, (cause) =>
        new Error.RequestError({
          request: this,
          reason: "Decode",
          cause
        }))
      : Stream.fail(
        new Error.RequestError({
          request: this,
          reason: "Decode",
          description: "can not create stream from empty body"
        })
      )
  }

  private textEffect: Effect.Effect<string, Error.RequestError> | undefined
  get text(): Effect.Effect<string, Error.RequestError> {
    if (this.textEffect) {
      return this.textEffect
    }
    this.textEffect = Effect.runSync(Effect.cached(
      Effect.tryPromise({
        try: () => this.source.text(),
        catch: (cause) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            cause
          })
      })
    ))
    return this.textEffect
  }

  get json(): Effect.Effect<unknown, Error.RequestError> {
    return Effect.tryMap(this.text, {
      try: (_) => JSON.parse(_) as unknown,
      catch: (cause) =>
        new Error.RequestError({
          request: this,
          reason: "Decode",
          cause
        })
    })
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, Error.RequestError> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: (cause) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            cause
          })
      }))
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
      MultipartBun.persisted(this.source)
    ))
    return this.multipartEffect
  }

  get multipartStream(): Stream.Stream<Multipart.Part, Multipart.MultipartError> {
    return MultipartBun.stream(this.source)
  }

  private arrayBufferEffect: Effect.Effect<ArrayBuffer, Error.RequestError> | undefined
  get arrayBuffer(): Effect.Effect<ArrayBuffer, Error.RequestError> {
    if (this.arrayBufferEffect) {
      return this.arrayBufferEffect
    }
    this.arrayBufferEffect = Effect.runSync(Effect.cached(
      Effect.tryPromise({
        try: () => this.source.arrayBuffer(),
        catch: (cause) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            cause
          })
      })
    ))
    return this.arrayBufferEffect
  }

  get upgrade(): Effect.Effect<Socket.Socket, Error.RequestError> {
    return Effect.flatMap(
      Effect.all([
        Deferred.make<ServerWebSocket<WebSocketContext>>(),
        Deferred.make<void, Socket.SocketError>(),
        Effect.makeSemaphore(1)
      ]),
      ([deferred, closeDeferred, semaphore]) =>
        Effect.async<Socket.Socket, Error.RequestError>((resume) => {
          const success = this.bunServer.upgrade<WebSocketContext>(this.source, {
            data: {
              deferred,
              closeDeferred,
              buffer: [],
              run: wsDefaultRun
            }
          })
          if (!success) {
            resume(Effect.fail(
              new Error.RequestError({
                request: this,
                reason: "Decode",
                description: "Not an upgradeable ServerRequest"
              })
            ))
            return
          }
          resume(Effect.map(Deferred.await(deferred), (ws) => {
            const write = (chunk: Uint8Array | string | Socket.CloseEvent) =>
              Effect.sync(() => {
                if (typeof chunk === "string") {
                  ws.sendText(chunk)
                } else if (Socket.isCloseEvent(chunk)) {
                  ws.close(chunk.code, chunk.reason)
                } else {
                  ws.sendBinary(chunk)
                }

                return true
              })
            const writer = Effect.succeed(write)
            const runRaw = Effect.fnUntraced(
              function*<R, E, _>(
                handler: (_: Uint8Array | string) => Effect.Effect<_, E, R> | void,
                opts?: { readonly onOpen?: Effect.Effect<void> | undefined }
              ) {
                const set = yield* FiberSet.make<any, E>()
                const run = yield* FiberSet.runtime(set)<R>()
                function runRaw(data: Uint8Array | string) {
                  const result = handler(data)
                  if (Effect.isEffect(result)) {
                    run(result)
                  }
                }
                ws.data.run = runRaw
                ws.data.buffer.forEach(runRaw)
                ws.data.buffer.length = 0
                if (opts?.onOpen) yield* opts.onOpen
                return yield* FiberSet.join(set)
              },
              Effect.scoped,
              Effect.onExit((exit) => {
                ws.close(exit._tag === "Success" ? 1000 : 1011)
                return Effect.void
              }),
              Effect.raceFirst(Deferred.await(closeDeferred)),
              semaphore.withPermits(1)
            )

            const encoder = new TextEncoder()
            const run = <R, E, _>(handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void, opts?: {
              readonly onOpen?: Effect.Effect<void> | undefined
            }) => runRaw((data) => typeof data === "string" ? handler(encoder.encode(data)) : handler(data), opts)

            return Socket.Socket.of({
              [Socket.TypeId]: Socket.TypeId,
              run,
              runRaw,
              writer
            })
          }))
        })
    )
  }
}

const removeHost = (url: string) => {
  if (url[0] === "/") {
    return url
  }
  const index = url.indexOf("/", url.indexOf("//") + 2)
  return index === -1 ? "/" : url.slice(index)
}

/** @internal */
export const requestSource = (self: ServerRequest.HttpServerRequest) => (self as ServerRequestImpl).source
