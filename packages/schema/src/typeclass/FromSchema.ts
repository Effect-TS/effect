/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import type { Kind, TypeLambda } from "@fp-ts/core/HKT"

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
export const of = <F extends TypeLambda>(
  F: FromSchema<F>
) => <I, O, E, A>(a: A): Kind<F, I, O, E, A> => F.fromSchema(S.of(a))

/**
 * @since 1.0.0
 */
export const tuple = <F extends TypeLambda>(
  F: FromSchema<F>
) =>
  <I, O, E, Components extends ReadonlyArray<Schema<any>>>(
    ...components: Components
  ): Kind<F, I, O, E, { readonly [K in keyof Components]: Parameters<Components[K]["A"]>[0] }> =>
    F.fromSchema(S.tuple<true, Components>(true, ...components))

/**
 * @since 1.0.0
 */
export const union = <F extends TypeLambda>(
  F: FromSchema<F>
) =>
  <I, O, E, Members extends ReadonlyArray<Schema<any>>>(
    ...members: Members
  ): Kind<F, I, O, E, Parameters<Members[number]["A"]>[0]> => F.fromSchema(S.union(...members))
