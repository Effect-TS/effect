import type * as App from "@effect/platform/HttpApp"
import type * as Rpc from "@effect/rpc/Rpc"
import type * as RpcGroup from "@effect/rpc/RpcGroup"
import type * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import type * as FastifyTypes from "fastify"
import * as FastifyHttpAppServer from "./fastifyHttpAppServer.js"

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
    return yield* FastifyHttpAppServer.toHandlerEffect(finalApp)
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
      const buildEffect = Effect.gen(function*() {
        const runtime = yield* (options.memoMap
          ? Layer.toRuntimeWithMemoMap(fullLayer, options.memoMap)
          : Layer.toRuntime(fullLayer))
        return yield* Effect.provide(toFastifyHandlerEffect(group, options), runtime)
      }).pipe(
        Effect.tap((h) => Effect.sync(() => {
          handlerCache = h
        })),
        Scope.extend(scope)
      )
      handlerPromise = Effect.runPromise(buildEffect)
    }
    return handlerPromise.then((f) => f(request, reply))
  }

  return { handler, dispose } as const
}
