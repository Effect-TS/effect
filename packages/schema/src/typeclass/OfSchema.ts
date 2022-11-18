/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import type { Kind, TypeClass, TypeLambda } from "@fp-ts/core/HKT"

/**
 * @since 1.0.0
 */
export interface OfSchema<F extends TypeLambda> extends TypeClass<F> {
  readonly ofSchema: <I, O, E, A>(
    schema: Schema<A>
  ) => Kind<F, I, O, E, A>
}

/**
 * @since 1.0.0
 */
export const of = <F extends TypeLambda>(
  F: OfSchema<F>
) => <A>(a: A): Kind<F, unknown, never, never, A> => F.ofSchema(S.of(a))

/**
 * @since 1.0.0
 */
export const unit = <F extends TypeLambda>(
  F: OfSchema<F>
): Kind<F, unknown, never, never, void> => of(F)<void>(undefined)

/**
 * @since 1.0.0
 */
export const Do = <F extends TypeLambda>(
  F: OfSchema<F>
): Kind<F, unknown, never, never, {}> => of(F)({})

/**
 * @since 1.0.0
 */
export const tuple = <F extends TypeLambda>(
  F: OfSchema<F>
) =>
  <I, O, E, Components extends ReadonlyArray<Schema<any>>>(
    ...components: Components
  ): Kind<F, I, O, E, { readonly [K in keyof Components]: S.Infer<Components[K]> }> =>
    F.ofSchema(S.tuple<true, Components>(true, ...components))

/**
 * @since 1.0.0
 */
export const union = <F extends TypeLambda>(
  F: OfSchema<F>
) =>
  <I, O, E, Members extends ReadonlyArray<Schema<any>>>(
    ...members: Members
  ): Kind<F, I, O, E, S.Infer<Members[number]>> => F.ofSchema(S.union(...members))

/**
 * @since 1.0.0
 */
export const struct = <F extends TypeLambda>(
  F: OfSchema<F>
) =>
  <I, O, E, Fields extends Record<PropertyKey, Schema<any>>>(
    fields: Fields
  ): Kind<F, I, O, E, { readonly [K in keyof Fields]: S.Infer<Fields[K]> }> =>
    F.ofSchema(S.struct(fields))

/**
 * @since 1.0.0
 */
export const indexSignature = <F extends TypeLambda>(
  F: OfSchema<F>
) =>
  <I, O, E, A>(
    value: Schema<A>
  ): Kind<F, I, O, E, { readonly [_: string]: A }> => F.ofSchema(S.indexSignature(value))

/**
 * @since 1.0.0
 */
export const readonlyArray = <F extends TypeLambda>(
  F: OfSchema<F>
) =>
  <I, O, E, A>(
    item: Schema<A>
  ): Kind<F, I, O, E, ReadonlyArray<A>> => F.ofSchema(S.array(true, item))

/**
 * @since 1.0.0
 */
export const nativeEnum = <F extends TypeLambda>(
  F: OfSchema<F>
) =>
  <I, O, E, A extends { [_: string]: string | number }>(
    nativeEnum: A
  ): Kind<F, I, O, E, A> => F.ofSchema(S.nativeEnum(nativeEnum))
