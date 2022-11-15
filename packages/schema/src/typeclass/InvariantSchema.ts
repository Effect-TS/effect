/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import type { Kind, TypeClass, TypeLambda } from "@fp-ts/core/HKT"

/**
 * @since 1.0.0
 */
export interface InvariantSchema<F extends TypeLambda> extends TypeClass<F> {
  readonly imapSchema: <A, B>(
    to: (a: Schema<A>) => Schema<B>,
    from: (b: Schema<B>) => Schema<A>
  ) => <R, O, E>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, E, B>
}
