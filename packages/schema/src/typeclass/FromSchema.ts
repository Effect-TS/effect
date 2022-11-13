/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import type { Kind, TypeLambda } from "@fp-ts/core/HKT"
import type { Of } from "@fp-ts/core/typeclass/Of"

/**
 * @since 1.0.0
 */
export interface FromSchema<F extends TypeLambda> {
  readonly fromSchema: <I, O, E, A>(
    schema: Schema<A>
  ) => Kind<F, I, O, E, A>
}

/**
 * @since 1.0.0
 */
export const getOf = <F extends TypeLambda>(
  F: FromSchema<F>
): Of<F> => ({
  of: (a) => F.fromSchema(S.of(a))
})
