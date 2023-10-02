/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as ServerRequest from "./ServerRequest"
import type * as ServerResponse from "./ServerResponse"

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpApp<R, E, A> extends Effect.Effect<R | ServerRequest.ServerRequest, E, A> {
}

/**
 * @since 1.0.0
 * @category models
 */
export type Default<R, E> = HttpApp<R, E, ServerResponse.ServerResponse>
