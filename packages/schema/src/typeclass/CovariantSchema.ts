/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import type { Kind, TypeClass, TypeLambda } from "@fp-ts/core/HKT"
import { pipe } from "@fp-ts/data/Function"

/**
 * @since 1.0.0
 */
export interface CovariantSchema<F extends TypeLambda> extends TypeClass<F> {
  readonly mapSchema: <A, B>(
    f: (schema: Schema<A>) => Schema<B>
  ) => <I, O, E>(self: Kind<F, I, O, E, A>) => Kind<F, I, O, E, B>
}

/**
 * @since 1.0.0
 */
export const optional = <F extends TypeLambda>(
  F: CovariantSchema<F>
): <I, O, E, A>(self: Kind<F, I, O, E, A>) => Kind<F, I, O, E, A | undefined> =>
  F.mapSchema(S.optional)

/**
 * @since 1.0.0
 */
export const nullable = <F extends TypeLambda>(
  F: CovariantSchema<F>
): <I, O, E, A>(self: Kind<F, I, O, E, A>) => Kind<F, I, O, E, A | null> => F.mapSchema(S.nullable)

/**
 * @since 1.0.0
 */
export const nullish = <F extends TypeLambda>(
  F: CovariantSchema<F>
): <I, O, E, A>(self: Kind<F, I, O, E, A>) => Kind<F, I, O, E, A | null | undefined> =>
  F.mapSchema(S.nullish)

/**
 * @since 1.0.0
 */
export const pick = <F extends TypeLambda>(
  F: CovariantSchema<F>
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
  F: CovariantSchema<F>
) =>
  <A, Keys extends ReadonlyArray<keyof A>>(
    ...keys: Keys
  ) =>
    <I, O, E>(
      self: Kind<F, I, O, E, A>
    ): Kind<F, I, O, E, { [P in Exclude<keyof A, Keys[number]>]: A[P] }> =>
      pipe(self, F.mapSchema(S.omit(...keys)))
