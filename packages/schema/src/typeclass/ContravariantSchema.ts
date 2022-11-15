/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import type { InvariantSchema } from "@fp-ts/codec/typeclass/InvariantSchema"
import type { Kind, TypeLambda } from "@fp-ts/core/HKT"

/**
 * @since 1.0.0
 */
export interface ContravariantSchema<F extends TypeLambda> extends InvariantSchema<F> {
  readonly contramapSchema: <B, A>(
    f: (schema: Schema<B>) => Schema<A>
  ) => <I, O, E>(self: Kind<F, I, O, E, A>) => Kind<F, I, O, E, B>
}

/**
 * Returns a default `imapSchema` implementation.
 *
 * @since 1.0.0
 */
export const imap = <F extends TypeLambda>(
  contramapSchema: ContravariantSchema<F>["contramapSchema"]
): InvariantSchema<F>["imapSchema"] => (_, from) => contramapSchema(from)
