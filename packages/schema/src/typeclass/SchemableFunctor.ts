/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import type { FromSchema } from "@fp-ts/codec/typeclass/FromSchema"
import type { ToSchema } from "@fp-ts/codec/typeclass/ToSchema"
import type { Kind, TypeLambda } from "@fp-ts/core/HKT"
import { pipe } from "@fp-ts/data/Function"

/**
 * @since 1.0.0
 */
export interface SchemableFunctor<F extends TypeLambda> {
  readonly mapSchema: <A, B>(
    f: (schema: Schema<A>) => Schema<B>
  ) => <I, O, E>(self: Kind<F, I, O, E, A>) => Kind<F, I, O, E, B>
}

/**
 * @since 1.0.0
 */
export const getSchemableFunctor = <F extends TypeLambda>(
  F: FromSchema<F> & ToSchema<F>
): SchemableFunctor<F> => ({
  mapSchema: <A, B>(
    f: (schema: Schema<A>) => Schema<B>
  ) => <I, O, E>(self: Kind<F, I, O, E, A>) => F.fromSchema<I, O, E, B>(f(F.toSchema(self)))
})

/**
 * @since 1.0.0
 */
export const optional = <F extends TypeLambda>(
  F: SchemableFunctor<F>
): <I, O, E, A>(self: Kind<F, I, O, E, A>) => Kind<F, I, O, E, A | undefined> =>
  F.mapSchema(S.optional)

/**
 * @since 1.0.0
 */
export const pick = <F extends TypeLambda>(
  F: SchemableFunctor<F>
) =>
  <A, Keys extends ReadonlyArray<keyof A>>(
    ...keys: Keys
  ) =>
    <I, O, E>(self: Kind<F, I, O, E, A>): Kind<F, I, O, E, { [P in Keys[number]]: A[P] }> =>
      pipe(self, F.mapSchema(S.pick(...keys)))

/**
 * @since 1.0.0
 */
export const omit = <F extends TypeLambda>(
  F: SchemableFunctor<F>
) =>
  <A, Keys extends ReadonlyArray<keyof A>>(
    ...keys: Keys
  ) =>
    <I, O, E>(
      self: Kind<F, I, O, E, A>
    ): Kind<F, I, O, E, { [P in Exclude<keyof A, Keys[number]>]: A[P] }> =>
      pipe(self, F.mapSchema(S.omit(...keys)))
