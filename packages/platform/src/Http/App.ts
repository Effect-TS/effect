/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as internalMiddleware from "../internal/http/middleware.js"
import type * as ServerError from "./ServerError.js"
import type * as ServerRequest from "./ServerRequest.js"
import type * as ServerResponse from "./ServerResponse.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpApp<R, E, A> extends Effect.Effect<R | ServerRequest.ServerRequest, E, A> {}

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
) => Effect.Effect<never, ServerError.ResponseError, ServerResponse.ServerResponse>

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentPreResponseHandlers: FiberRef.FiberRef<ReadonlyArray<PreResponseHandler>> = globalValue(
  Symbol.for("@effect/platform/Http/App/preResponseHandlers"),
  () => FiberRef.unsafeMake([])
)

function noopHandler(_request: ServerRequest.ServerRequest, response: ServerResponse.ServerResponse) {
  return Effect.succeed(response)
}

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const preResponseHandler: Effect.Effect<never, never, PreResponseHandler> = Effect.map(
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
export const appendPreResponseHandler: (handler: PreResponseHandler) => Effect.Effect<never, never, void> = (
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
