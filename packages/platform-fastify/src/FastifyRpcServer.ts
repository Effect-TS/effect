/**
 * @since 1.0.0
 */
import type * as HttpApp from "@effect/platform/HttpApp"
import type * as Rpc from "@effect/rpc/Rpc"
import type * as RpcGroup from "@effect/rpc/RpcGroup"
import type * as RpcSerialization from "@effect/rpc/RpcSerialization"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as FastifyTypes from "fastify"
import * as internal from "./internal/fastifyRpcServer.js"

/**
 * Register an RPC handler as a Fastify plugin with proper content type parser configuration.
 *
 * This is the recommended way to add RPC routes to a Fastify server as it properly
 * encapsulates the content type parser configuration to avoid affecting other routes.
 *
 * @since 1.0.0
 * @category constructors
 * @example
 * import { FastifyRpcServer } from "@effect/platform-fastify"
 * import { RpcSerialization } from "@effect/rpc"
 * import { Layer } from "effect"
 * import Fastify from "fastify"
 *
 * const fastify = Fastify({ logger: true })
 *
 * const { dispose } = FastifyRpcServer.register(fastify, UserRpcs, {
 *   path: "/rpc",
 *   layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
 * })
 *
 * await fastify.listen({ port: 3000 })
 */
export const register: <Rpcs extends Rpc.Any, LE>(
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
      httpApp: HttpApp.Default<never, Scope.Scope>
    ) => HttpApp.Default<never, Scope.Scope>
    readonly memoMap?: Layer.MemoMap
  }
) => {
  readonly dispose: () => Promise<void>
} = internal.register

/**
 * Register an RPC handler as a Fastify plugin, returning an Effect that extracts
 * context from the environment.
 *
 * This is useful when you want to integrate the RPC handler into an existing Effect
 * application and manage the context yourself, while still benefiting from automatic
 * content type parser configuration.
 *
 * @since 1.0.0
 * @category constructors
 * @example
 * import { FastifyRpcServer } from "@effect/platform-fastify"
 * import { RpcSerialization } from "@effect/rpc"
 * import { Effect, Layer } from "effect"
 * import Fastify from "fastify"
 *
 * const program = Effect.gen(function* () {
 *   const fastify = Fastify()
 *
 *   yield* FastifyRpcServer.registerEffect(fastify, UserRpcs, {
 *     path: "/rpc"
 *   })
 *
 *   yield* Effect.acquireRelease(
 *     Effect.promise(() => fastify.listen({ port: 3000 })),
 *     () => Effect.promise(() => fastify.close())
 *   )
 * })
 *
 * const MainLive = Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
 *
 * program.pipe(Effect.provide(MainLive), Effect.runPromise)
 */
export const registerEffect: <Rpcs extends Rpc.Any>(
  fastify: FastifyTypes.FastifyInstance,
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly path: string
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
    readonly middleware?: (
      httpApp: HttpApp.Default<never, Scope.Scope>
    ) => HttpApp.Default<never, Scope.Scope>
  }
) => Effect.Effect<
  void,
  never,
  | Scope.Scope
  | RpcSerialization.RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
> = internal.registerEffect

/**
 * Construct a Fastify handler from an `RpcGroup`.
 *
 * Note: When using this function directly, you need to configure Fastify's content type
 * parser to not parse the request body. Consider using `register` instead for a simpler setup.
 *
 * @since 1.0.0
 * @category constructors
 * @example
 * import { FastifyRpcServer } from "@effect/platform-fastify"
 * import { RpcSerialization } from "@effect/rpc"
 * import { Layer } from "effect"
 * import Fastify from "fastify"
 *
 * const { handler, dispose } = FastifyRpcServer.toFastifyHandler(UserRpcs, {
 *   layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
 * })
 *
 * const fastify = Fastify({ logger: true })
 * // Required: disable body parsing for RPC routes
 * fastify.removeAllContentTypeParsers()
 * fastify.addContentTypeParser("*", (_req, _payload, done) => done(null))
 * fastify.post('/rpc', handler)
 * await fastify.listen({ port: 3000 })
 */
export const toFastifyHandler: <Rpcs extends Rpc.Any, LE>(
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
      httpApp: HttpApp.Default<never, Scope.Scope>
    ) => HttpApp.Default<never, Scope.Scope>
    readonly memoMap?: Layer.MemoMap
  }
) => {
  readonly handler: (
    request: FastifyTypes.FastifyRequest,
    reply: FastifyTypes.FastifyReply
  ) => Promise<void>
  readonly dispose: () => Promise<void>
} = internal.toFastifyHandler

/**
 * Create a Fastify handler as an Effect, allowing the context to be provided externally.
 *
 * This is useful when you want to integrate the RPC handler into an existing Effect application
 * and manage the context yourself.
 *
 * Note: When using this function, you need to configure Fastify's content type
 * parser to not parse the request body.
 *
 * @since 1.0.0
 * @category constructors
 * @example
 * import { FastifyRpcServer } from "@effect/platform-fastify"
 * import { RpcSerialization } from "@effect/rpc"
 * import { Effect, Layer } from "effect"
 * import Fastify from "fastify"
 *
 * const program = Effect.gen(function* () {
 *   const handler = yield* FastifyRpcServer.toFastifyHandlerEffect(UserRpcs)
 *
 *   const fastify = Fastify()
 *   fastify.removeAllContentTypeParsers()
 *   fastify.addContentTypeParser("*", (_req, _payload, done) => done(null))
 *   fastify.post("/rpc", handler)
 *
 *   yield* Effect.acquireRelease(
 *     Effect.promise(() => fastify.listen({ port: 3000 })),
 *     () => Effect.promise(() => fastify.close())
 *   )
 * })
 *
 * const MainLive = Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
 *
 * program.pipe(Effect.provide(MainLive), Effect.runPromise)
 */
export const toFastifyHandlerEffect: <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean | undefined
    readonly spanPrefix?: string | undefined
    readonly spanAttributes?: Record<string, unknown> | undefined
    readonly disableFatalDefects?: boolean | undefined
    readonly middleware?: (
      httpApp: HttpApp.Default<never, Scope.Scope>
    ) => HttpApp.Default<never, Scope.Scope>
  }
) => Effect.Effect<
  (request: FastifyTypes.FastifyRequest, reply: FastifyTypes.FastifyReply) => Promise<void>,
  never,
  | Scope.Scope
  | RpcSerialization.RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
> = internal.toFastifyHandlerEffect
