/**
 * @since 1.0.0
 */
import type * as HttpApp from "@effect/platform/HttpApp"
import type * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as FastifyTypes from "fastify"
import * as internal from "./internal/fastifyHttpAppServer.js"

/**
 * Create a Fastify handler from an `HttpApp` as an Effect, allowing the context
 * to be provided externally.
 *
 * This is useful when you want to integrate an HttpApp into an existing Effect
 * application and manage the context yourself.
 *
 * Note: When using this function, you need to configure Fastify's content type
 * parser to not parse the request body if your HttpApp needs to read the raw body.
 *
 * @since 1.0.0
 * @category constructors
 * @example
 * import { FastifyHttpAppServer } from "@effect/platform-fastify"
 * import { HttpServerResponse } from "@effect/platform"
 * import { Effect } from "effect"
 * import Fastify from "fastify"
 *
 * const httpApp = Effect.succeed(HttpServerResponse.text("Hello, World!"))
 *
 * const program = Effect.gen(function* () {
 *   const handler = yield* FastifyHttpAppServer.toHandlerEffect(httpApp)
 *
 *   const fastify = Fastify()
 *   fastify.get("/hello", handler)
 *
 *   yield* Effect.acquireRelease(
 *     Effect.promise(() => fastify.listen({ port: 3000 })),
 *     () => Effect.promise(() => fastify.close())
 *   )
 * })
 *
 * program.pipe(Effect.scoped, Effect.runPromise)
 */
export const toHandlerEffect: <E, R>(
  httpApp: HttpApp.Default<E, R>
) => Effect.Effect<
  (request: FastifyTypes.FastifyRequest, reply: FastifyTypes.FastifyReply) => Promise<void>,
  never,
  Exclude<R, HttpServerRequest.HttpServerRequest> | Scope.Scope
> = internal.toHandlerEffect

/**
 * Create a Fastify handler from an `HttpApp` with a layer that provides the
 * required context.
 *
 * This function returns a handler that can be registered with Fastify routes,
 * along with a dispose function to clean up resources.
 *
 * Note: When using this function, you need to configure Fastify's content type
 * parser to not parse the request body if your HttpApp needs to read the raw body.
 *
 * @since 1.0.0
 * @category constructors
 * @example
 * import { FastifyHttpAppServer } from "@effect/platform-fastify"
 * import { HttpServerResponse } from "@effect/platform"
 * import { Effect, Layer, Context } from "effect"
 * import Fastify from "fastify"
 *
 * class Greeter extends Context.Tag("Greeter")<Greeter, { greet: (name: string) => string }>() {}
 *
 * const httpApp = Effect.gen(function* () {
 *   const greeter = yield* Greeter
 *   return HttpServerResponse.text(greeter.greet("World"))
 * })
 *
 * const GreeterLive = Layer.succeed(Greeter, { greet: (name) => `Hello, ${name}!` })
 *
 * const { handler, dispose } = FastifyHttpAppServer.toHandler(httpApp, GreeterLive)
 *
 * const fastify = Fastify()
 * fastify.get("/hello", handler)
 *
 * await fastify.listen({ port: 3000 })
 *
 * // Cleanup
 * await dispose()
 * await fastify.close()
 */
export const toHandler: <E, R, LE>(
  httpApp: HttpApp.Default<E, R>,
  layer: Layer.Layer<Exclude<R, HttpServerRequest.HttpServerRequest | Scope.Scope>, LE>,
  options?: {
    readonly memoMap?: Layer.MemoMap
  }
) => {
  readonly handler: (
    request: FastifyTypes.FastifyRequest,
    reply: FastifyTypes.FastifyReply
  ) => Promise<void>
  readonly dispose: () => Promise<void>
} = internal.toHandler
