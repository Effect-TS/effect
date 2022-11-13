/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import type { Kind, TypeLambda } from "@fp-ts/core/HKT"

/**
 * @since 1.0.0
 */
export interface FromSchema<F extends TypeLambda> {
  readonly fromSchema: <I, O, E, A>(
    schema: Schema<A>
  ) => Kind<F, I, O, E, A>
}
