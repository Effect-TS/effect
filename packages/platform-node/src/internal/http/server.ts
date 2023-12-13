import * as FileSystem from "@effect/platform/FileSystem"
import * as App from "@effect/platform/Http/App"
import type * as FormData from "@effect/platform/Http/FormData"
import type * as Headers from "@effect/platform/Http/Headers"
import * as IncomingMessage from "@effect/platform/Http/IncomingMessage"
import type { Method } from "@effect/platform/Http/Method"
import * as Middleware from "@effect/platform/Http/Middleware"
import * as Server from "@effect/platform/Http/Server"
import * as Error from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import type * as ServerResponse from "@effect/platform/Http/ServerResponse"
import type * as Path from "@effect/platform/Path"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Runtime from "effect/Runtime"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as Http from "node:http"
import type * as Net from "node:net"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import * as NodeSink from "../../Sink.js"
import * as internalFormData from "./formData.js"
import { IncomingMessageImpl } from "./incomingMessage.js"
import * as internalPlatform from "./platform.js"

/** @internal */
export const make = (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
): Effect.Effect<Scope.Scope, Error.ServeError, Server.Server> =>
  Effect.gen(function*(_) {
    const server = yield* _(Effect.acquireRelease(
      Effect.sync(evaluate),
      (server) =>
        Effect.async<never, never, void>((resume) => {
          server.close((error) => {
            if (error) {
              resume(Effect.die(error))
            } else {
              resume(Effect.unit)
            }
          })
        })
    ))

    yield* _(Effect.async<never, Error.ServeError, void>((resume) => {
      server.on("error", (error) => {
        resume(Effect.fail(Error.ServeError({ error })))
      })
      server.listen(options, () => {
        resume(Effect.unit)
      })
    }))

    const address = server.address()!

    return Server.make({
      address: typeof address === "string" ?
        {
          _tag: "UnixAddress",
          path: address
        } :
        {
          _tag: "TcpAddress",
          hostname: address.address,
          port: address.port
        },
      serve: (httpApp, middleware) =>
        makeHandler(httpApp, middleware!).pipe(
          Effect.flatMap((handler) =>
            Effect.async<never, never, never>((_resume) => {
              server.on("request", handler)
              return Effect.sync(() => {
                server.off("request", handler)
              })
            })
          ),
          Effect.forkScoped,
          Effect.asUnit
        )
    })
  }).pipe(
    Effect.locally(
      IncomingMessage.maxBodySize,
      Option.some(FileSystem.Size(1024 * 1024 * 10))
    )
  )

const respond = Middleware.make((httpApp) =>
  Effect.flatMap(ServerRequest.ServerRequest, (request) =>
    Effect.tapErrorCause(
      Effect.tap(
        Effect.flatMap(
          httpApp,
          (response) => Effect.flatMap(App.preResponseHandler, (f) => f(request, response))
        ),
        (response) => handleResponse(request, response)
      ),
      (_cause) =>
        Effect.sync(() => {
          const nodeResponse = (request as ServerRequestImpl).response
          if (!nodeResponse.headersSent) {
            nodeResponse.writeHead(500)
          }
          if (!nodeResponse.writableEnded) {
            nodeResponse.end()
          }
        })
    ))
)

/** @internal */
export const makeHandler: {
  <R, E>(httpApp: App.Default<R, E>): Effect.Effect<
    Exclude<R, ServerRequest.ServerRequest>,
    never,
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse) => void
  >
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<R, E>,
    middleware: Middleware.Middleware.Applied<R, E, App>
  ): Effect.Effect<
    Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>,
    never,
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse) => void
  >
} = <R, E>(httpApp: App.Default<R, E>, middleware?: Middleware.Middleware) => {
  const handledApp = middleware
    ? middleware(App.withDefaultMiddleware(respond(httpApp)))
    : App.withDefaultMiddleware(respond(httpApp))
  return Effect.map(
    Effect.zip(Effect.runtime<R>(), Effect.fiberId),
    ([runtime, fiberId]) => {
      const runFork = Runtime.runFork(runtime)
      return function handler(nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse) {
        const fiber = runFork(
          Effect.provideService(
            handledApp,
            ServerRequest.ServerRequest,
            new ServerRequestImpl(nodeRequest, nodeResponse)
          )
        )
        nodeResponse.on("close", () => {
          if (!nodeResponse.writableEnded) {
            runFork(fiber.interruptAsFork(fiberId))
          }
        })
      }
    }
  )
}

class ServerRequestImpl extends IncomingMessageImpl<Error.RequestError> implements ServerRequest.ServerRequest {
  readonly [ServerRequest.TypeId]: ServerRequest.TypeId

  constructor(
    readonly source: Http.IncomingMessage,
    readonly response: Http.ServerResponse,
    readonly url = source.url!,
    private headersOverride?: Headers.Headers,
    remoteAddressOverride?: string
  ) {
    super(source, (_) =>
      Error.RequestError({
        request: this,
        reason: "Decode",
        error: _
      }), remoteAddressOverride)
    this[ServerRequest.TypeId] = ServerRequest.TypeId
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

  private formDataEffect:
    | Effect.Effect<
      Scope.Scope | FileSystem.FileSystem | Path.Path,
      FormData.FormDataError,
      FormData.PersistedFormData
    >
    | undefined
  get formData(): Effect.Effect<
    Scope.Scope | FileSystem.FileSystem | Path.Path,
    FormData.FormDataError,
    FormData.PersistedFormData
  > {
    if (this.formDataEffect) {
      return this.formDataEffect
    }
    this.formDataEffect = Effect.runSync(Effect.cached(
      internalFormData.formData(this.source, this.source.headers)
    ))
    return this.formDataEffect
  }

  get formDataStream(): Stream.Stream<never, FormData.FormDataError, FormData.Part> {
    return internalFormData.stream(this.source, this.source.headers)
  }

  toString(): string {
    return `ServerRequest(${this.method} ${this.url})`
  }

  toJSON(): unknown {
    return {
      _tag: "ServerRequest",
      method: this.method,
      url: this.url,
      originalUrl: this.originalUrl,
      headers: this.headers
    }
  }
}

/** @internal */
export const layer = (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) =>
  Layer.merge(
    Layer.scoped(Server.Server, make(evaluate, options)),
    internalPlatform.layer
  )

/** @internal */
export const layerConfig = (
  evaluate: LazyArg<Http.Server>,
  options: Config.Config.Wrap<Net.ListenOptions>
) =>
  Layer.merge(
    Layer.scoped(
      Server.Server,
      Effect.flatMap(Config.unwrap(options), (options) => make(evaluate, options))
    ),
    internalPlatform.layer
  )

const handleResponse = (request: ServerRequest.ServerRequest, response: ServerResponse.ServerResponse) =>
  Effect.suspend((): Effect.Effect<never, Error.ResponseError, void> => {
    const nodeResponse = (request as ServerRequestImpl).response
    if (request.method === "HEAD") {
      nodeResponse.writeHead(response.status, response.headers)
      nodeResponse.end()
      return Effect.unit
    }
    const body = response.body
    switch (body._tag) {
      case "Empty": {
        nodeResponse.writeHead(response.status, response.headers)
        nodeResponse.end()
        return Effect.unit
      }
      case "Raw": {
        nodeResponse.writeHead(response.status, response.headers)
        if (
          typeof body.body === "object" && body.body !== null && "pipe" in body.body &&
          typeof body.body.pipe === "function"
        ) {
          return Effect.tryPromise({
            try: (signal) => pipeline(body.body as any, nodeResponse, { signal, end: true }),
            catch: (error) =>
              Error.ResponseError({
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
        nodeResponse.writeHead(response.status, response.headers)
        nodeResponse.end(body.body)
        return Effect.unit
      }
      case "FormData": {
        return Effect.async<never, Error.ResponseError, void>((resume) => {
          const r = new Response(body.formData)
          const headers = {
            ...response.headers,
            ...Object.fromEntries(r.headers)
          }
          nodeResponse.writeHead(response.status, headers)
          Readable.fromWeb(r.body as any)
            .pipe(nodeResponse)
            .on("error", (error) => {
              resume(Effect.fail(Error.ResponseError({
                request,
                response,
                reason: "Decode",
                error
              })))
            })
            .once("finish", () => {
              resume(Effect.unit)
            })
        })
      }
      case "Stream": {
        nodeResponse.writeHead(response.status, response.headers)
        return Stream.run(
          Stream.mapError(
            body.stream,
            (error) =>
              Error.ResponseError({
                request,
                response,
                reason: "Decode",
                error
              })
          ),
          NodeSink.fromWritable(() => nodeResponse, (error) =>
            Error.ResponseError({
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
