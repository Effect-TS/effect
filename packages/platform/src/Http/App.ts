/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
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
import * as internalMiddleware from "../internal/http/middleware.js"
import type { Middleware } from "./Middleware.js"
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
export const toHandled = <R, E, _, RH>(
  self: Default<R, E>,
  handleResponse: (
    request: ServerRequest.ServerRequest,
    exit: Exit.Exit<ServerResponse.ServerResponse, E | ServerError.ResponseError>
  ) => Effect.Effect<_, never, RH>,
  middleware?: Middleware | undefined
): Default<Exclude<R | RH, Scope.Scope>, E | ServerError.ResponseError> =>
  Effect.uninterruptibleMask((restore) => {
    const withTracer = internalMiddleware.tracer(restore(self))
    const responded = Effect.withFiberRuntime<
      ServerResponse.ServerResponse,
      E | ServerError.ResponseError,
      R | RH | ServerRequest.ServerRequest
    >((fiber) => {
      const request = Context.unsafeGet(fiber.getFiberRef(FiberRef.currentContext), ServerRequest.ServerRequest)
      const handler = fiber.getFiberRef(currentPreResponseHandlers)
      const preHandled = handler._tag === "Some"
        ? Effect.flatMap(withTracer, (response) => handler.value(request, response))
        : withTracer
      return Effect.flatMap(
        Effect.exit(preHandled),
        (exit) => {
          if (exit._tag === "Failure") {
            const dieOption = Cause.dieOption(exit.cause)
            if (dieOption._tag === "Some" && ServerResponse.isServerResponse(dieOption.value)) {
              exit = Exit.succeed(dieOption.value)
            }
          }
          return Effect.zipRight(handleResponse(request, exit), exit)
        }
      )
    })
    return Effect.scoped(middleware === undefined ? responded : middleware(responded))
  })

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
export const currentPreResponseHandlers: FiberRef.FiberRef<Option.Option<PreResponseHandler>> = globalValue(
  Symbol.for("@effect/platform/Http/App/preResponseHandlers"),
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
  (handler: PreResponseHandler) => <R, E, A>(self: HttpApp<R, E, A>) => HttpApp<R, E, A>,
  <R, E, A>(self: HttpApp<R, E, A>, handler: PreResponseHandler) => HttpApp<R, E, A>
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
  return <E>(self: Default<R | Scope.Scope, E>) => {
    const handled = Effect.scoped(toHandled(self, (request, exit) => {
      const webRequest = request.source as Request
      if (Exit.isSuccess(exit)) {
        ;(request as any)._resolve(ServerResponse.toWeb(exit.value, request.method === "HEAD"))
      } else if (Cause.isInterruptedOnly(exit.cause)) {
        ;(request as any)._resolve(new Response(null, { status: webRequest.signal.aborted ? 499 : 503 }))
      } else {
        ;(request as any)._reject(Cause.pretty(exit.cause))
      }
      return Effect.unit
    }))
    return (request: Request): Promise<Response> =>
      new Promise((resolve, reject) => {
        const req = ServerRequest.fromWeb(request)
        ;(req as any)._resolve = resolve
        ;(req as any)._reject = reject
        const fiber = run(
          Effect.provideService(handled, ServerRequest.ServerRequest, req)
        )
        request.signal.addEventListener("abort", () => {
          fiber.unsafeInterruptAsFork(ServerError.clientAbortFiberId)
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
