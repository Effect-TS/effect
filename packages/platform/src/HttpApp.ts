/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type * as FiberRef from "effect/FiberRef"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import { unify } from "effect/Unify"
import type { HttpMiddleware } from "./HttpMiddleware.js"
import * as ServerError from "./HttpServerError.js"
import * as ServerRequest from "./HttpServerRequest.js"
import * as ServerResponse from "./HttpServerResponse.js"
import * as internal from "./internal/httpApp.js"
import * as internalMiddleware from "./internal/httpMiddleware.js"

/**
 * @since 1.0.0
 * @category models
 */
export type HttpApp<A = ServerResponse.HttpServerResponse, E = never, R = never> = Effect.Effect<
  A,
  E,
  R | ServerRequest.HttpServerRequest
>

/**
 * @since 1.0.0
 * @category models
 */
export type Default<E = never, R = never> = HttpApp<ServerResponse.HttpServerResponse, E, R>

const handledSymbol = Symbol.for("@effect/platform/HttpApp/handled")

/**
 * @since 1.0.0
 * @category combinators
 */
export const toHandled = <E, R, _, EH, RH>(
  self: Default<E, R>,
  handleResponse: (
    request: ServerRequest.HttpServerRequest,
    response: ServerResponse.HttpServerResponse
  ) => Effect.Effect<_, EH, RH>,
  middleware?: HttpMiddleware | undefined
): Effect.Effect<void, never, Exclude<R | RH | ServerRequest.HttpServerRequest, Scope.Scope>> => {
  const responded = Effect.withFiberRuntime<
    ServerResponse.HttpServerResponse,
    E | EH | ServerError.ResponseError,
    R | RH | ServerRequest.HttpServerRequest
  >((fiber) =>
    Effect.flatMap(self, (response) => {
      const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
      const handler = fiber.getFiberRef(currentPreResponseHandlers)
      if (handler._tag === "None") {
        ;(request as any)[handledSymbol] = true
        return Effect.as(handleResponse(request, response), response)
      }
      return Effect.tap(handler.value(request, response), (response) => {
        ;(request as any)[handledSymbol] = true
        return handleResponse(request, response)
      })
    })
  )

  const withErrorHandling = Effect.catchAllCause(
    responded,
    (cause) =>
      Effect.withFiberRuntime<
        ServerResponse.HttpServerResponse,
        E | EH | ServerError.ResponseError,
        ServerRequest.HttpServerRequest | RH
      >((fiber) =>
        Effect.flatMap(ServerError.causeResponse(cause), ([response, cause]) => {
          const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
          const handler = fiber.getFiberRef(currentPreResponseHandlers)
          if (handler._tag === "None") {
            ;(request as any)[handledSymbol] = true
            return Effect.zipRight(handleResponse(request, response), Effect.failCause(cause))
          }
          return Effect.zipRight(
            Effect.tap(handler.value(request, response), (response) => {
              ;(request as any)[handledSymbol] = true
              return handleResponse(request, response)
            }),
            Effect.failCause(cause)
          )
        })
      )
  )

  const withMiddleware = unify(
    middleware === undefined ?
      internalMiddleware.tracer(withErrorHandling) :
      Effect.matchCauseEffect(middleware(internalMiddleware.tracer(withErrorHandling)), {
        onFailure: (cause): Effect.Effect<void, EH, RH> =>
          Effect.withFiberRuntime((fiber) => {
            const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
            if (handledSymbol in request) {
              return Effect.void
            }
            return Effect.matchCauseEffect(ServerError.causeResponse(cause), {
              onFailure: (_cause) => handleResponse(request, ServerResponse.empty({ status: 500 })),
              onSuccess: ([response]) => handleResponse(request, response)
            })
          }),
        onSuccess: (response): Effect.Effect<void, EH, RH> =>
          Effect.withFiberRuntime((fiber) => {
            const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest)
            return handledSymbol in request ? Effect.void : handleResponse(request, response)
          })
      })
  )

  return Effect.uninterruptible(Effect.scoped(withMiddleware)) as any
}

/**
 * @since 1.0.0
 * @category models
 */
export type PreResponseHandler = (
  request: ServerRequest.HttpServerRequest,
  response: ServerResponse.HttpServerResponse
) => Effect.Effect<ServerResponse.HttpServerResponse, ServerError.ResponseError>

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentPreResponseHandlers: FiberRef.FiberRef<Option.Option<PreResponseHandler>> =
  internal.currentPreResponseHandlers

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const appendPreResponseHandler: (handler: PreResponseHandler) => Effect.Effect<void> =
  internal.appendPreResponseHandler
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withPreResponseHandler = internal.withPreResponseHandler

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandlerRuntime = <R>(runtime: Runtime.Runtime<R>) => {
  const run = Runtime.runFork(runtime)
  return <E>(self: Default<E, R | Scope.Scope>, middleware?: HttpMiddleware | undefined) => {
    const resolveSymbol = Symbol.for("@effect/platform/HttpApp/resolve")
    const httpApp = toHandled(self, (request, response) => {
      ;(request as any)[resolveSymbol](
        ServerResponse.toWeb(response, { withoutBody: request.method === "HEAD", runtime })
      )
      return Effect.void
    }, middleware)
    return (request: Request): Promise<Response> =>
      new Promise((resolve) => {
        const httpServerRequest = ServerRequest.fromWeb(request)
        ;(httpServerRequest as any)[resolveSymbol] = resolve
        const fiber = run(Effect.provideService(httpApp, ServerRequest.HttpServerRequest, httpServerRequest))
        request.signal?.addEventListener("abort", () => {
          fiber.unsafeInterruptAsFork(ServerError.clientAbortFiberId)
        }, { once: true })
      })
  }
}

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandler: <E>(
  self: Default<E, Scope.Scope>,
  middleware?: HttpMiddleware | undefined
) => (request: Request) => Promise<Response> = toWebHandlerRuntime(Runtime.defaultRuntime)

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandlerLayer = <E, R, RE>(
  self: Default<E, R | Scope.Scope>,
  layer: Layer.Layer<R, RE>,
  middleware?: HttpMiddleware | undefined
): {
  readonly close: () => Promise<void>
  readonly handler: (request: Request) => Promise<Response>
} => {
  const scope = Effect.runSync(Scope.make())
  const close = () => Effect.runPromise(Scope.close(scope, Exit.void))
  const build = Effect.map(Layer.toRuntime(layer), (_) => toWebHandlerRuntime(_)(self, middleware))
  const runner = Effect.runPromise(Scope.extend(build, scope))
  const handler = (request: Request): Promise<Response> => runner.then((handler) => handler(request))
  return { close, handler } as const
}
