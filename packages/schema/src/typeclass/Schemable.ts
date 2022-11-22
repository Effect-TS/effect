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
export interface Schemable<F extends TypeLambda> extends TypeClass<F> {
  readonly fromSchema: <I, O, E, A>(
    schema: Schema<A>
  ) => Kind<F, I, O, E, A>
}

/**
 * @since 1.0.0
 */
export const of = <F extends TypeLambda>(
  F: Schemable<F>
) => <I, O, E, A>(a: A): Kind<F, I, O, E, A> => F.fromSchema(S.of(a))

/**
 * @since 1.0.0
 */
export const tuple = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <I, O, E, Components extends ReadonlyArray<Schema<any>>>(
    ...components: Components
  ): Kind<F, I, O, E, { readonly [K in keyof Components]: S.Infer<Components[K]> }> =>
    F.fromSchema(S.tuple<Components>(...components))

/**
 * @since 1.0.0
 */
export const union = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <I, O, E, Members extends ReadonlyArray<Schema<any>>>(
    ...members: Members
  ): Kind<F, I, O, E, S.Infer<Members[number]>> => F.fromSchema(S.union(...members))

/**
 * @since 1.0.0
 */
export const literal = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <I, O, E, A extends ReadonlyArray<S.Literal>>(
    ...a: A
  ): Kind<F, I, O, E, A[number]> => F.fromSchema<I, O, E, A[number]>(S.literal(...a))

/**
 * @since 1.0.0
 */
export const struct = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <I, O, E, Fields extends Record<PropertyKey, Schema<any>>>(
    fields: Fields
  ): Kind<F, I, O, E, { readonly [K in keyof Fields]: S.Infer<Fields[K]> }> =>
    F.fromSchema(S.struct(fields))

/**
 * @since 1.0.0
 */
export const indexSignature = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <I, O, E, A>(
    value: Schema<A>
  ): Kind<F, I, O, E, { readonly [_: string]: A }> => F.fromSchema(S.indexSignature(value))

/**
 * @since 1.0.0
 */
export const array = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <I, O, E, A>(
    item: Schema<A>
  ): Kind<F, I, O, E, ReadonlyArray<A>> => F.fromSchema(S.array(item))

/**
 * @since 1.0.0
 */
export const nativeEnum = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <I, O, E, A extends { [_: string]: string | number }>(
    nativeEnum: A
  ): Kind<F, I, O, E, A> => F.fromSchema(S.nativeEnum(nativeEnum))

/**
 * @since 1.0.0
 */
export const optional = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <I, O, E, A>(self: Schema<A>): Kind<F, I, O, E, A | undefined> => F.fromSchema(S.optional(self))

/**
 * @since 1.0.0
 */
export const nullable = <F extends TypeLambda>(
  F: Schemable<F>
) => <I, O, E, A>(self: Schema<A>): Kind<F, I, O, E, A | null> => F.fromSchema(S.nullable(self))

/**
 * @since 1.0.0
 */
export const nullish = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <I, O, E, A>(self: Schema<A>): Kind<F, I, O, E, A | null | undefined> =>
    F.fromSchema(S.nullish(self))

/**
 * @since 1.0.0
 */
export const pick = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <A, Keys extends ReadonlyArray<keyof A>>(
    ...keys: Keys
  ) =>
    <I, O, E>(self: Schema<A>): Kind<F, I, O, E, { [P in Keys[number]]: A[P] }> =>
      F.fromSchema(pipe(self, S.pick(...keys)))

/**
 * @since 1.0.0
 */
export const omit = <F extends TypeLambda>(
  F: Schemable<F>
) =>
  <A, Keys extends ReadonlyArray<keyof A>>(
    ...keys: Keys
  ) =>
    <I, O, E>(
      self: Schema<A>
    ): Kind<F, I, O, E, { [P in Exclude<keyof A, Keys[number]>]: A[P] }> =>
      F.fromSchema(pipe(self, S.omit(...keys)))
