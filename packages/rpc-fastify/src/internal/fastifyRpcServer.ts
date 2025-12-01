import * as Cookies from "@effect/platform/Cookies"
import type * as Headers from "@effect/platform/Headers"
import * as App from "@effect/platform/HttpApp"
import * as IncomingMessage from "@effect/platform/HttpIncomingMessage"
import type { HttpMethod } from "@effect/platform/HttpMethod"
import * as Error from "@effect/platform/HttpServerError"
import * as ServerRequest from "@effect/platform/HttpServerRequest"
import type * as ServerResponse from "@effect/platform/HttpServerResponse"
import * as Multipart from "@effect/platform/Multipart"
import type * as UrlParams from "@effect/platform/UrlParams"
import type * as Rpc from "@effect/rpc/Rpc"
import type * as RpcGroup from "@effect/rpc/RpcGroup"
import type * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as FastifyTypes from "fastify"
import type * as Http from "node:http"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

const resolveSymbol = Symbol.for("@effect/rpc-fastify/resolve")

/** @internal */
export const toFastifyHandlerEffect = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
    readonly middleware?: (
      httpApp: App.Default<never, Scope.Scope>
    ) => App.Default<never, Scope.Scope>
  }
): Effect.Effect<
  (request: FastifyTypes.FastifyRequest, reply: FastifyTypes.FastifyReply) => Promise<void>,
  never,
  | Scope.Scope
  | RpcSerialization.RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
> =>
  Effect.gen(function*() {
    const httpApp = yield* RpcServer.toHttpApp(group, options)
    const finalApp = options?.middleware ? options.middleware(httpApp) : httpApp
    const handledApp: Effect.Effect<void, never, ServerRequest.HttpServerRequest> = App.toHandled(
      finalApp as any,
      handleResponse
    ) as any
    const runtime = yield* Effect.runtime<never>()
    const runFork = Runtime.runFork(runtime)

    return (
      req: FastifyTypes.FastifyRequest,
      rep: FastifyTypes.FastifyReply
    ): Promise<void> =>
      new Promise((resolve) => {
        const serverRequest = new FastifyServerRequest(req, rep, resolve)

        const fiber = runFork(
          Effect.scoped(
            Effect.provideService(
              handledApp,
              ServerRequest.HttpServerRequest,
              serverRequest
            )
          )
        )

        // Handle client disconnection
        rep.raw.on("close", () => {
          if (!rep.raw.writableEnded) {
            fiber.unsafeInterruptAsFork(Error.clientAbortFiberId)
          }
        })
      })
  })

/** @internal */
export const registerEffect = <Rpcs extends Rpc.Any>(
  fastify: FastifyTypes.FastifyInstance,
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly path: string
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
    readonly middleware?: (
      httpApp: App.Default<never, Scope.Scope>
    ) => App.Default<never, Scope.Scope>
  }
): Effect.Effect<
  void,
  never,
  | Scope.Scope
  | RpcSerialization.RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
> =>
  Effect.gen(function*() {
    const handler = yield* toFastifyHandlerEffect(group, options)

    fastify.register((instance, _opts, done) => {
      instance.removeAllContentTypeParsers()
      instance.addContentTypeParser("*", (_req, _payload, parserDone) => {
        parserDone(null)
      })
      instance.post(options.path, handler)
      done()
    })
  })

/** @internal */
export const register = <Rpcs extends Rpc.Any, LE>(
  fastify: FastifyTypes.FastifyInstance,
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly path: string
    readonly layer: Layer.Layer<
      | Rpc.ToHandler<Rpcs>
      | Rpc.Middleware<Rpcs>
      | RpcSerialization.RpcSerialization,
      LE
    >
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
    readonly middleware?: (
      httpApp: App.Default<never, Scope.Scope>
    ) => App.Default<never, Scope.Scope>
    readonly memoMap?: Layer.MemoMap
  }
): { readonly dispose: () => Promise<void> } => {
  const { dispose, handler } = toFastifyHandler(group, options)

  fastify.register((instance, _opts, done) => {
    instance.removeAllContentTypeParsers()
    instance.addContentTypeParser("*", (_req, _payload, parserDone) => {
      parserDone(null)
    })
    instance.post(options.path, handler)
    done()
  })

  return { dispose }
}

/** @internal */
export const toFastifyHandler = <Rpcs extends Rpc.Any, LE>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly layer: Layer.Layer<
      | Rpc.ToHandler<Rpcs>
      | Rpc.Middleware<Rpcs>
      | RpcSerialization.RpcSerialization,
      LE
    >
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
    readonly middleware?: (
      httpApp: App.Default<never, Scope.Scope>
    ) => App.Default<never, Scope.Scope>
    readonly memoMap?: Layer.MemoMap
  }
): {
  readonly handler: (
    request: FastifyTypes.FastifyRequest,
    reply: FastifyTypes.FastifyReply
  ) => Promise<void>
  readonly dispose: () => Promise<void>
} => {
  const scope = Effect.runSync(Scope.make())
  const dispose = () => Effect.runPromise(Scope.close(scope, Exit.void))

  // Include Layer.scope so that scoped resources in the layer are properly managed
  const fullLayer = Layer.mergeAll(options.layer, Layer.scope)

  type Handler = (request: FastifyTypes.FastifyRequest, reply: FastifyTypes.FastifyReply) => Promise<void>

  let handlerCache: Handler | undefined
  let handlerPromise: Promise<Handler> | undefined

  function handler(
    request: FastifyTypes.FastifyRequest,
    reply: FastifyTypes.FastifyReply
  ): Promise<void> {
    if (handlerCache) {
      return handlerCache(request, reply)
    }
    if (!handlerPromise) {
      // Build the handler by:
      // 1. Building a runtime from the layer (with memoMap if provided)
      // 2. Using that runtime to provide services to toFastifyHandlerEffect
      // 3. Extending the scope we created so resources are tied to our dispose()
      handlerPromise = Effect.gen(function*() {
        const runtime = yield* (options.memoMap
          ? Layer.toRuntimeWithMemoMap(fullLayer, options.memoMap)
          : Layer.toRuntime(fullLayer))
        return yield* Effect.provide(toFastifyHandlerEffect(group, options), runtime)
      }).pipe(
        Effect.tap((h) => Effect.sync(() => handlerCache = h)),
        Scope.extend(scope),
        Effect.runPromise
      )
    }
    return handlerPromise.then((f) => f(request, reply))
  }

  return { handler, dispose } as const
}

const handleResponse = (
  request: ServerRequest.HttpServerRequest,
  response: ServerResponse.HttpServerResponse
): Effect.Effect<void, Error.ResponseError> =>
  Effect.suspend(() => {
    const req = request as FastifyServerRequest
    const fastifyReply = req.reply
    const resolve = (req as any)[resolveSymbol] as () => void

    if (fastifyReply.sent) {
      resolve()
      return Effect.void
    }

    // Set headers
    let headers: Record<string, string | Array<string>> = response.headers
    if (!Cookies.isEmpty(response.cookies)) {
      headers = { ...headers }
      const toSet = Cookies.toSetCookieHeaders(response.cookies)
      if (headers["set-cookie"] !== undefined) {
        toSet.push(headers["set-cookie"] as string)
      }
      headers["set-cookie"] = toSet
    }

    // Set status and headers
    fastifyReply.status(response.status)
    for (const [key, value] of Object.entries(headers)) {
      fastifyReply.header(key, value)
    }

    // Handle HEAD requests
    if (request.method === "HEAD") {
      fastifyReply.send()
      resolve()
      return Effect.void
    }

    const body = response.body

    switch (body._tag) {
      case "Empty": {
        fastifyReply.send()
        resolve()
        return Effect.void
      }
      case "Raw": {
        // Handle Node.js streams
        if (
          typeof body.body === "object" && body.body !== null && "pipe" in body.body &&
          typeof body.body.pipe === "function"
        ) {
          return Effect.tryPromise({
            try: (signal) => pipeline(body.body as Readable, fastifyReply.raw, { signal, end: true }),
            catch: (cause) =>
              new Error.ResponseError({
                request,
                response,
                reason: "Decode",
                cause
              })
          }).pipe(
            Effect.tap(() => Effect.sync(() => resolve())),
            Effect.interruptible
          )
        }
        fastifyReply.send(body.body)
        resolve()
        return Effect.void
      }
      case "Uint8Array": {
        fastifyReply.send(Buffer.from(body.body))
        resolve()
        return Effect.void
      }
      case "FormData": {
        return Effect.suspend(() => {
          const r = new Response(body.formData)
          for (const [key, value] of r.headers) {
            fastifyReply.header(key, value)
          }
          return Effect.async<void, Error.ResponseError>((resume, signal) => {
            const nodeStream = Readable.fromWeb(r.body as any, { signal })
            nodeStream.pipe(fastifyReply.raw)
            nodeStream.on("error", (cause) => {
              resume(Effect.fail(
                new Error.ResponseError({
                  request,
                  response,
                  reason: "Decode",
                  cause
                })
              ))
            })
            nodeStream.on("end", () => {
              resolve()
              resume(Effect.void)
            })
          }).pipe(Effect.interruptible)
        })
      }
      case "Stream": {
        const drainLatch = Effect.unsafeMakeLatch()
        fastifyReply.raw.on("drain", () => drainLatch.unsafeOpen())
        return body.stream.pipe(
          Stream.orDie,
          Stream.runForEachChunk((chunk) => {
            const array = Chunk.toReadonlyArray(chunk)
            if (array.length === 0) return Effect.void
            let needDrain = false
            for (let i = 0; i < array.length; i++) {
              const written = fastifyReply.raw.write(array[i])
              if (!written && !needDrain) {
                needDrain = true
              }
            }
            return needDrain ? Effect.suspend(() => drainLatch.await) : Effect.void
          }),
          Effect.ensuring(
            Effect.sync(() => {
              fastifyReply.raw.end()
              resolve()
            })
          ),
          Effect.interruptible
        )
      }
    }
  })

class FastifyServerRequest extends Inspectable.Class implements ServerRequest.HttpServerRequest {
  readonly [ServerRequest.TypeId]: ServerRequest.TypeId = ServerRequest.TypeId
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId = IncomingMessage.TypeId
  readonly [resolveSymbol]: () => void

  constructor(
    readonly request: FastifyTypes.FastifyRequest,
    readonly reply: FastifyTypes.FastifyReply,
    resolve: () => void
  ) {
    super()
    this[resolveSymbol] = resolve
  }

  get source(): Http.IncomingMessage {
    return this.request.raw
  }

  get url(): string {
    return this.request.url
  }

  get originalUrl(): string {
    return this.request.url
  }

  get method(): HttpMethod {
    return this.request.method.toUpperCase() as HttpMethod
  }

  private headersCache: Headers.Headers | undefined
  get headers(): Headers.Headers {
    if (this.headersCache) {
      return this.headersCache
    }
    return this.headersCache = this.request.headers as Headers.Headers
  }

  get remoteAddress(): Option.Option<string> {
    return Option.fromNullable(this.request.ip)
  }

  private cookiesCache: Record<string, string> | undefined
  get cookies(): Record<string, string> {
    if (this.cookiesCache) {
      return this.cookiesCache
    }
    return this.cookiesCache = Cookies.parseHeader(this.headers.cookie ?? "")
  }

  private onError = (cause: unknown): Error.RequestError =>
    new Error.RequestError({
      request: this,
      reason: "Decode",
      cause
    })

  private bodyData: ArrayBuffer | undefined
  private bodyError: unknown | undefined
  private bodyReading = false
  private bodyWaiters: Array<{
    resolve: (value: ArrayBuffer) => void
    reject: (error: unknown) => void
  }> = []

  private readBody(): void {
    if (this.bodyData !== undefined || this.bodyError !== undefined || this.bodyReading) {
      return
    }

    this.bodyReading = true
    const body = this.request.body

    // If Fastify parsed the body, use it immediately
    if (body !== undefined && body !== null) {
      if (body instanceof ArrayBuffer) {
        this.bodyData = body
      } else if (Buffer.isBuffer(body)) {
        this.bodyData = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
      } else {
        const str = typeof body === "string" ? body : JSON.stringify(body)
        this.bodyData = new TextEncoder().encode(str).buffer
      }
      // Resolve all waiters
      for (const waiter of this.bodyWaiters) {
        waiter.resolve(this.bodyData)
      }
      this.bodyWaiters = []
      return
    }

    // Otherwise, read from raw stream
    const chunks: Array<Buffer> = []
    const req = this.request.raw

    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })

    req.on("end", () => {
      const result = Buffer.concat(chunks)
      this.bodyData = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength)
      // Resolve all waiters
      for (const waiter of this.bodyWaiters) {
        waiter.resolve(this.bodyData)
      }
      this.bodyWaiters = []
    })

    req.on("error", (error) => {
      this.bodyError = error
      // Reject all waiters
      for (const waiter of this.bodyWaiters) {
        waiter.reject(error)
      }
      this.bodyWaiters = []
    })
  }

  get arrayBuffer(): Effect.Effect<ArrayBuffer, Error.RequestError> {
    const onError = this.onError
    return Effect.async<ArrayBuffer, Error.RequestError>((resume) => {
      // If we already have the data, return it
      if (this.bodyData !== undefined) {
        resume(Effect.succeed(this.bodyData))
        return
      }

      // If we already have an error, return it
      if (this.bodyError !== undefined) {
        resume(Effect.fail(onError(this.bodyError)))
        return
      }

      // Otherwise, queue up and start reading if needed
      this.bodyWaiters.push({
        resolve: (value) => resume(Effect.succeed(value)),
        reject: (error) => resume(Effect.fail(onError(error)))
      })
      this.readBody()
    })
  }

  get text(): Effect.Effect<string, Error.RequestError> {
    const body = this.request.body
    // If Fastify parsed the body and it's a string, return directly
    if (body !== undefined && body !== null && typeof body === "string") {
      return Effect.succeed(body)
    }

    // Otherwise, get arrayBuffer and decode it
    const onError = this.onError
    return Effect.async<string, Error.RequestError>((resume) => {
      // If we already have the data, return it
      if (this.bodyData !== undefined) {
        const result = new TextDecoder().decode(this.bodyData)
        resume(Effect.succeed(result))
        return
      }

      // If we already have an error, return it
      if (this.bodyError !== undefined) {
        resume(Effect.fail(onError(this.bodyError)))
        return
      }

      // Otherwise, queue up and start reading if needed
      this.bodyWaiters.push({
        resolve: (arrayBuffer) => {
          const result = new TextDecoder().decode(arrayBuffer)
          resume(Effect.succeed(result))
        },
        reject: (error) => resume(Effect.fail(onError(error)))
      })
      this.readBody()
    })
  }

  get json(): Effect.Effect<unknown, Error.RequestError> {
    return Effect.sync(() => this.request.body ?? null)
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, Error.RequestError> {
    return Effect.sync(() => this.request.query as UrlParams.UrlParams)
  }

  get stream(): Stream.Stream<Uint8Array, Error.RequestError> {
    // Use arrayBuffer as the source since we can't read the raw stream twice
    return Stream.fromEffect(
      Effect.map(this.arrayBuffer, (buffer) => new Uint8Array(buffer))
    )
  }

  get multipart(): ServerRequest.HttpServerRequest["multipart"] {
    return Effect.fail(
      new Multipart.MultipartError({
        reason: "InternalError",
        cause: "Multipart not implemented in @effect/rpc-fastify"
      })
    )
  }

  get multipartStream(): ServerRequest.HttpServerRequest["multipartStream"] {
    return Stream.fail(
      new Multipart.MultipartError({
        reason: "InternalError",
        cause: "Multipart stream not implemented in @effect/rpc-fastify"
      })
    )
  }

  get upgrade(): ServerRequest.HttpServerRequest["upgrade"] {
    return Effect.fail(
      new Error.RequestError({
        request: this,
        reason: "Decode",
        description: "Upgrade not implemented in @effect/rpc-fastify"
      })
    )
  }

  modify(
    _options: {
      readonly url?: string
      readonly headers?: Headers.Headers
      readonly remoteAddress?: string
    }
  ): ServerRequest.HttpServerRequest {
    return this
  }

  toString(): string {
    return `FastifyServerRequest(${this.method} ${this.url})`
  }

  toJSON(): unknown {
    return IncomingMessage.inspect(this, {
      _id: "@effect/rpc-fastify/FastifyServerRequest",
      method: this.method,
      url: this.originalUrl
    })
  }
}
