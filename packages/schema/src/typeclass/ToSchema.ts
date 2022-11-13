/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import type { Kind, TypeLambda } from "@fp-ts/core/HKT"

/**
 * @since 1.0.0
 */
export interface ToSchema<F extends TypeLambda> {
  readonly toSchema: <I, O, E, A>(self: Kind<F, I, O, E, A>) => Schema<A>
}
