/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import * as internalMiddleware from "../internal/http/middleware.js"
import * as ServerError from "./ServerError.js"
import * as ServerRequest from "./ServerRequest.js"
import * as ServerResponse from "./ServerResponse.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpApp<R, E, A> extends Effect.Effect<A, E, R | ServerRequest.ServerRequest> {}

/**
 * @since 1.0.0
 * @category models
 */
export type Default<R, E> = HttpApp<R, E, ServerResponse.ServerResponse>

/**
 * @since 1.0.0
 * @category combinators
 */
export const withDefaultMiddleware = <R, E>(
  self: Default<R, E>
): Default<R, E> => internalMiddleware.tracer(self)

/**
 * @since 1.0.0
 * @category models
 */
export type PreResponseHandler = (
  request: ServerRequest.ServerRequest,
  response: ServerResponse.ServerResponse
) => Effect.Effect<ServerResponse.ServerResponse, ServerError.ResponseError>

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentPreResponseHandlers: FiberRef.FiberRef<ReadonlyArray<PreResponseHandler>> = globalValue(
  Symbol.for("@effect/platform/Http/App/preResponseHandlers"),
  () => FiberRef.unsafeMake<ReadonlyArray<PreResponseHandler>>([])
)

function noopHandler(_request: ServerRequest.ServerRequest, response: ServerResponse.ServerResponse) {
  return Effect.succeed(response)
}

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const preResponseHandler: Effect.Effect<PreResponseHandler> = Effect.map(
  FiberRef.get(currentPreResponseHandlers),
  (handlers): PreResponseHandler =>
    handlers.length === 0 ?
      noopHandler :
      handlers.reduce((acc, handler) => (function(request, response) {
        return Effect.flatMap(
          acc(request, response),
          function(response) {
            return handler(request, response)
          }
        )
      }))
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
    ReadonlyArray.append(handler)
  )

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withPreResponseHandler = dual<
  (handler: PreResponseHandler) => <R, E, A>(self: HttpApp<R, E, A>) => HttpApp<R, E, A>,
  <R, E, A>(self: HttpApp<R, E, A>, handler: PreResponseHandler) => HttpApp<R, E, A>
>(2, (self, handler) =>
  Effect.locallyWith(
    self,
    currentPreResponseHandlers,
    ReadonlyArray.append(handler)
  ))

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandlerRuntime = <R>(runtime: Runtime.Runtime<R>) => {
  const run = Runtime.runFork(runtime)
  return <E>(self: Default<R | Scope.Scope, E>) => {
    self = withDefaultMiddleware(self)
    return (request: Request): Promise<Response> =>
      new Promise((resolve, reject) => {
        const req = ServerRequest.fromWeb(request)
        const fiber = run(Effect.scoped(Effect.map(
          Effect.provideService(self, ServerRequest.ServerRequest, req),
          (res) => ServerResponse.toWeb(res, req.method === "HEAD")
        )))
        request.signal.addEventListener("abort", () => {
          Effect.runFork(fiber.interruptAsFork(ServerError.clientAbortFiberId))
        })
        fiber.addObserver((exit) => {
          if (Exit.isSuccess(exit)) {
            resolve(exit.value)
          } else if (Cause.isInterruptedOnly(exit.cause)) {
            resolve(new Response(null, { status: request.signal.aborted ? 499 : 503 }))
          } else {
            reject(Cause.pretty(exit.cause))
          }
        })
      })
  }
}

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandler: <E>(self: Default<Scope.Scope, E>) => (request: Request) => Promise<Response> =
  toWebHandlerRuntime(Runtime.defaultRuntime)

/**
 * @since 1.0.0
 * @category conversions
 */
export const toWebHandlerLayer = <R, E, RE>(
  self: Default<R | Scope.Scope, E>,
  layer: Layer.Layer<R, RE>
): {
  readonly close: () => Promise<void>
  readonly handler: (request: Request) => Promise<Response>
} => {
  const scope = Effect.runSync(Scope.make())
  const close = () => Effect.runPromise(Scope.close(scope, Exit.unit))
  const build = Effect.map(Layer.toRuntime(layer), (_) => toWebHandlerRuntime(_)(self))
  const runner = Effect.runPromise(Scope.extend(build, scope))
  const handler = (request: Request): Promise<Response> => runner.then((handler) => handler(request))
  return { close, handler } as const
}
