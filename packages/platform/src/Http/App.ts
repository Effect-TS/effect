/**
 * @since 1.0.0
 */
import type * as ServerRequest from "@effect/platform/Http/ServerRequest"
import type * as ServerResponse from "@effect/platform/Http/ServerResponse"
import type * as Effect from "effect/Effect"

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
