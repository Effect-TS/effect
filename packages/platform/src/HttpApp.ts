/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import type { HttpMiddleware } from "./HttpMiddleware.js"
import * as ServerError from "./HttpServerError.js"
import * as ServerRequest from "./HttpServerRequest.js"
import * as ServerResponse from "./HttpServerResponse.js"
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
    void,
    never,
    R | RH | ServerRequest.HttpServerRequest
  >((fiber) => {
    let handled = false
    const request = Context.unsafeGet(fiber.getFiberRef(FiberRef.currentContext), ServerRequest.HttpServerRequest)
    const preprocessResponse = (response: ServerResponse.HttpServerResponse) => {
      const handler = fiber.getFiberRef(currentPreResponseHandlers)
      return handler._tag === "Some" ? handler.value(request, response) : Effect.succeed(response)
    }
    const responded = Effect.matchCauseEffect(self, {
      onFailure: (cause) =>
        Effect.flatMap(ServerError.causeResponse(cause), ([response, cause]) =>
          preprocessResponse(response).pipe(
            Effect.flatMap((response) => {
              handled = true
              return handleResponse(request, response)
            }),
            Effect.zipRight(Effect.failCause(cause))
          )),
      onSuccess: (response) =>
        Effect.tap(
          preprocessResponse(response),
          (response) => {
            handled = true
            return handleResponse(request, response)
          }
        )
    })
    const withTracer = internalMiddleware.tracer(responded)
    if (middleware === undefined) {
      return withTracer as any
    }
    return Effect.matchCauseEffect(middleware(withTracer), {
      onFailure: (cause): Effect.Effect<void, EH, RH> => {
        if (handled) {
          return Effect.void
        }
        return Effect.matchCauseEffect(ServerError.causeResponse(cause), {
          onFailure: (_cause) => handleResponse(request, ServerResponse.empty({ status: 500 })),
          onSuccess: ([response]) => handleResponse(request, response)
        })
      },
      onSuccess: (response): Effect.Effect<void, EH, RH> => handled ? Effect.void : handleResponse(request, response)
    })
  })
  return Effect.uninterruptible(Effect.scoped(responded))
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
export const currentPreResponseHandlers: FiberRef.FiberRef<Option.Option<PreResponseHandler>> = globalValue(
  Symbol.for("@effect/platform/HttpApp/preResponseHandlers"),
  () => FiberRef.unsafeMake<Option.Option<PreResponseHandler>>(Option.none())
)

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const appendPreResponseHandler: (handler: PreResponseHandler) => Effect.Effect<void> = (
  handler: PreResponseHandler
) =>
  FiberRef.update(
    currentPreResponseHandlers,
    Option.match({
      onNone: () => Option.some(handler),
      onSome: (prev) =>
        Option.some((request, response) =>
          Effect.flatMap(prev(request, response), (response) => handler(request, response))
        )
    })
  )

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withPreResponseHandler = dual<
  (handler: PreResponseHandler) => <A, E, R>(self: HttpApp<A, E, R>) => HttpApp<A, E, R>,
  <A, E, R>(self: HttpApp<A, E, R>, handler: PreResponseHandler) => HttpApp<A, E, R>
>(2, (self, handler) =>
  Effect.locallyWith(
    self,
    currentPreResponseHandlers,
    Option.match({
      onNone: () => Option.some(handler),
      onSome: (prev) =>
        Option.some((request, response) =>
          Effect.flatMap(prev(request, response), (response) => handler(request, response))
        )
    })
  ))

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandlerRuntime = <R>(runtime: Runtime.Runtime<R>) => {
  const run = Runtime.runFork(runtime)
  return <E>(self: Default<E, R | Scope.Scope>, middleware?: HttpMiddleware | undefined) =>
  (request: Request): Promise<Response> =>
    new Promise((resolve) => {
      const fiber = run(Effect.provideService(
        toHandled(self, (request, response) => {
          resolve(ServerResponse.toWeb(response, { withoutBody: request.method === "HEAD", runtime }))
          return Effect.void
        }, middleware),
        ServerRequest.HttpServerRequest,
        ServerRequest.fromWeb(request)
      ))
      request.signal.addEventListener("abort", () => {
        fiber.unsafeInterruptAsFork(ServerError.clientAbortFiberId)
      }, { once: true })
    })
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
