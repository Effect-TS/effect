/// <reference types="bun-types" />
import * as Etag from "@effect/platform-node-shared/Http/Etag"
import * as MultipartNode from "@effect/platform-node-shared/Http/Multipart"
import type * as FileSystem from "@effect/platform/FileSystem"
import * as App from "@effect/platform/Http/App"
import * as Cookies from "@effect/platform/Http/Cookies"
import * as Headers from "@effect/platform/Http/Headers"
import * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import type { Method } from "@effect/platform/Http/Method"
import type * as Multipart from "@effect/platform/Http/Multipart"
import * as Server from "@effect/platform/Http/Server"
import * as Error from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import type * as ServerResponse from "@effect/platform/Http/ServerResponse"
import * as UrlParams from "@effect/platform/Http/UrlParams"
import type * as Path from "@effect/platform/Path"
import * as Socket from "@effect/platform/Socket"
import type { ServeOptions, Server as BunServer, ServerWebSocket } from "bun"
import * as Cause from "effect/Cause"
import * as Config from "effect/Config"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberSet from "effect/FiberSet"
import { pipe } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { ReadonlyRecord } from "effect/Record"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import { Readable } from "node:stream"
import * as BunContext from "../../BunContext.js"
import * as Platform from "../../Http/Platform.js"

/** @internal */
export const make = (
  options: Omit<ServeOptions, "fetch" | "error">
): Effect.Effect<Server.Server, never, Scope.Scope> =>
  Effect.gen(function*(_) {
    const handlerStack: Array<(request: Request, server: BunServer) => Response | Promise<Response>> = [
      function(_request, _server) {
        return new Response("not found", { status: 404 })
      }
    ]
    const server = Bun.serve<WebSocketContext>({
      ...options,
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

    yield* _(Effect.addFinalizer(() =>
      Effect.sync(() => {
        server.stop()
      })
    ))

    return Server.make({
      address: { _tag: "TcpAddress", port: server.port, hostname: server.hostname },
      serve(httpApp, middleware) {
        const app = App.toHandled(httpApp, (request, exit) =>
          Effect.sync(() => {
            const impl = request as ServerRequestImpl
            if (exit._tag === "Success") {
              impl.resolve(makeResponse(request, exit.value))
            } else if (Cause.isInterruptedOnly(exit.cause)) {
              impl.resolve(
                new Response(undefined, {
                  status: impl.source.signal.aborted ? 499 : 503
                })
              )
            } else {
              impl.reject(Cause.pretty(exit.cause))
            }
          }), middleware)

        return pipe(
          FiberSet.makeRuntime<never>(),
          Effect.flatMap((runFork) =>
            Effect.async<never>((_) => {
              function handler(request: Request, server: BunServer) {
                return new Promise<Response>((resolve, reject) => {
                  const fiber = runFork(Effect.provideService(
                    app,
                    ServerRequest.ServerRequest,
                    new ServerRequestImpl(request, resolve, reject, removeHost(request.url), server)
                  ))
                  request.signal.addEventListener("abort", () => {
                    runFork(fiber.interruptAsFork(Error.clientAbortFiberId))
                  })
                })
              }
              handlerStack.push(handler)
              server.reload({ fetch: handler } as ServeOptions)
              return Effect.sync(() => {
                handlerStack.pop()
                server.reload({ fetch: handlerStack[handlerStack.length - 1] } as ServeOptions)
              })
            })
          ),
          Effect.interruptible,
          Effect.forkScoped,
          Effect.asVoid
        )
      }
    })
  })

const makeResponse = (request: ServerRequest.ServerRequest, response: ServerResponse.ServerResponse): Response => {
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
  const body = response.body
  switch (body._tag) {
    case "Empty": {
      return new Response(undefined, fields)
    }
    case "Uint8Array":
    case "Raw": {
      return new Response(body.body as any, fields)
    }
    case "FormData": {
      return new Response(body.formData as any, fields)
    }
    case "Stream": {
      return new Response(Stream.toReadableStream(body.stream), fields)
    }
  }
}

/** @internal */
export const layerServer = (
  options: Omit<ServeOptions, "fetch" | "error">
) => Layer.scoped(Server.Server, make(options))

/** @internal */
export const layer = (
  options: Omit<ServeOptions, "fetch" | "error">
) =>
  Layer.mergeAll(
    Layer.scoped(Server.Server, make(options)),
    Platform.layer,
    Etag.layerWeak,
    BunContext.layer
  )

/** @internal */
export const layerConfig = (
  options: Config.Config.Wrap<Omit<ServeOptions, "fetch" | "error">>
) =>
  Layer.mergeAll(
    Layer.scoped(Server.Server, Effect.flatMap(Config.unwrap(options), make)),
    Platform.layer,
    Etag.layerWeak,
    BunContext.layer
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

class ServerRequestImpl extends Inspectable.Class implements ServerRequest.ServerRequest {
  readonly [ServerRequest.TypeId]: ServerRequest.TypeId
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId
  constructor(
    readonly source: Request,
    public resolve: (response: Response) => void,
    public reject: (reason: any) => void,
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
      _id: "@effect/platform/Http/ServerRequest",
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
      this.reject,
      options.url ?? this.url,
      this.bunServer,
      options.headers ?? this.headersOverride,
      options.remoteAddress ?? this.remoteAddressOverride
    )
  }
  get method(): Method {
    return this.source.method.toUpperCase() as Method
  }
  get originalUrl() {
    return this.source.url
  }
  get remoteAddress(): Option.Option<string> {
    return this.remoteAddressOverride ? Option.some(this.remoteAddressOverride) : Option.none()
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
      ? Stream.fromReadableStream(() => this.source.body as any, (_) =>
        new Error.RequestError({
          request: this,
          reason: "Decode",
          error: _
        }))
      : Stream.fail(
        new Error.RequestError({
          request: this,
          reason: "Decode",
          error: "can not create stream from empty body"
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
        catch: (error) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            error
          })
      })
    ))
    return this.textEffect
  }

  get json(): Effect.Effect<unknown, Error.RequestError> {
    return Effect.tryMap(this.text, {
      try: (_) => JSON.parse(_) as unknown,
      catch: (error) =>
        new Error.RequestError({
          request: this,
          reason: "Decode",
          error
        })
    })
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, Error.RequestError> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: (error) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            error
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
      MultipartNode.persisted(Readable.fromWeb(this.source.body! as any), this.headers)
    ))
    return this.multipartEffect
  }

  get multipartStream(): Stream.Stream<Multipart.Part, Multipart.MultipartError> {
    return MultipartNode.stream(Readable.fromWeb(this.source.body! as any), this.headers)
  }

  private arrayBufferEffect: Effect.Effect<ArrayBuffer, Error.RequestError> | undefined
  get arrayBuffer(): Effect.Effect<ArrayBuffer, Error.RequestError> {
    if (this.arrayBuffer) {
      return this.arrayBuffer
    }
    this.arrayBufferEffect = Effect.runSync(Effect.cached(
      Effect.tryPromise({
        try: () => this.source.arrayBuffer(),
        catch: (error) =>
          new Error.RequestError({
            request: this,
            reason: "Decode",
            error
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
                error: "Not an upgradeable ServerRequest"
              })
            ))
            return
          }
          resume(Effect.map(Deferred.await(deferred), (ws) => {
            const write = (chunk: Uint8Array | string | Socket.CloseEvent) =>
              Effect.sync(() =>
                typeof chunk === "string"
                  ? ws.sendText(chunk)
                  : Socket.isCloseEvent(chunk)
                  ? ws.close(chunk.code, chunk.reason)
                  : ws.sendBinary(chunk)
              )
            const writer = Effect.succeed(write)
            const runRaw = <R, E, _>(
              handler: (_: Uint8Array | string) => Effect.Effect<_, E, R>
            ): Effect.Effect<void, Socket.SocketError | E, R> =>
              FiberSet.make<any, E>().pipe(
                Effect.flatMap((set) =>
                  FiberSet.runtime(set)<R>().pipe(
                    Effect.flatMap((run) => {
                      ws.data.run = function(data: Uint8Array | string) {
                        run(handler(data))
                      }
                      ws.data.buffer.forEach((data) => run(handler(data)))
                      ws.data.buffer.length = 0
                      return FiberSet.join(set)
                    })
                  )
                ),
                Effect.scoped,
                Effect.onExit((exit) => Effect.sync(() => ws.close(exit._tag === "Success" ? 1000 : 1011))),
                Effect.raceFirst(Deferred.await(closeDeferred)),
                semaphore.withPermits(1)
              )

            const encoder = new TextEncoder()
            const run = <R, E, _>(handler: (_: Uint8Array) => Effect.Effect<_, E, R>) =>
              runRaw((data) => typeof data === "string" ? handler(encoder.encode(data)) : handler(data))

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
export const requestSource = (self: ServerRequest.ServerRequest) => (self as ServerRequestImpl).source
