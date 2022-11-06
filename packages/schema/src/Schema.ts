/**
 * @since 1.0.0
 */
import type * as DE from "@fp-ts/codec/DecodeError"
import type { DSL } from "@fp-ts/codec/DSL"
import * as dsl from "@fp-ts/codec/DSL"
import type { Either } from "@fp-ts/data/Either"
import type { Option } from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export declare const schemaSym: unique symbol

/**
 * @since 1.0.0
 */
export type Schema<I, O, E, A> = DSL & {
  readonly [schemaSym]: [I, O, E, A]
}

/**
 * @since 1.0.0
 */
export const make = <I, O, E, A>(dsl: DSL): Schema<I, O, E, A> => dsl as any

/**
 * @since 1.0.0
 */
export const string: Schema<unknown, string, DE.NotType, string> = make(dsl.stringDSL)

/**
 * @since 1.0.0
 */
export const number: Schema<unknown, number, DE.NotType, number> = make(dsl.numberDSL)

/**
 * @since 1.0.0
 */
export const boolean: Schema<unknown, boolean, DE.NotType, boolean> = make(dsl.booleanDSL)

/**
 * @since 1.0.0
 */
export const literal = <A extends dsl.Literal>(
  literal: A
): Schema<unknown, A, DE.NotEqual<A>, A> => make(dsl.literalDSL(literal))

/**
 * @since 1.0.0
 */
export const readonlyArray = <I, O, E, A>(
  item: Schema<I, O, E, A>
): Schema<ReadonlyArray<I>, ReadonlyArray<A>, E, ReadonlyArray<A>> => make(dsl.arrayDSL(item, true))

/**
 * @since 1.0.0
 */
export const array = <I, O, E, A>(
  item: Schema<I, O, E, A>
): Schema<Array<I>, Array<A>, E, Array<A>> => make(dsl.arrayDSL(item, false))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<any, any, any, any>>>(
  fields: Fields
): Schema<
  { readonly [K in keyof Fields]: Fields[K][typeof schemaSym][0] },
  { readonly [K in keyof Fields]: Fields[K][typeof schemaSym][1] },
  Fields[keyof Fields][typeof schemaSym][2],
  { readonly [K in keyof Fields]: Fields[K][typeof schemaSym][3] }
> =>
  make(
    dsl.structDSL(Object.keys(fields).map((name) => dsl.fieldDSL(name, fields[name], false, true)))
  )

/**
 * @since 1.0.0
 */
export const union = <I, Members extends ReadonlyArray<Schema<I, any, any, any>>>(
  ...members: Members
): Schema<
  I,
  Members[number][typeof schemaSym][1],
  Members[number][typeof schemaSym][2],
  Members[number][typeof schemaSym][3]
> => make(dsl.unionDSL(members))

/**
 * @since 1.0.0
 */
export const indexSignature = <I, O, E, A>(
  value: Schema<I, O, E, A>
): Schema<
  { readonly [_: string]: I },
  { readonly [_: string]: O },
  E,
  { readonly [_: string]: A }
> => make(dsl.indexSignatureDSL("string", value, true))

/**
 * @since 1.0.0
 */
export const or = <I, O2, E2, B>(that: Schema<I, O2, E2, B>) =>
  <O1, E1, A>(self: Schema<I, O1, E1, A>): Schema<I, O1 | O2, E1 | E2, A | B> => union(self, that)

/**
 * @since 1.0.0
 */
export const field = <N extends PropertyKey, I, O, E, A>(
  key: N,
  value: Schema<I, O, E, A>
): Schema<{ readonly [K in N]: I }, { readonly [K in N]: O }, E, { readonly [K in N]: A }> =>
  make(dsl.structDSL([dsl.fieldDSL(key, value, false, true)]))

/**
 * @since 1.0.0
 */
export const option = <I, O, E, A>(
  value: Schema<I, O, E, A>
): Schema<
  { readonly _tag: unknown },
  Option<O>,
  E | DE.NotEqual<"None"> | DE.NotEqual<"Some">,
  Option<A>
> =>
  union(
    struct({ _tag: literal("None") }),
    struct({ _tag: literal("Some"), value })
  )

/**
 * @since 1.0.0
 */
export const either = <IL, OL, EL, L, IR, OR, ER, R>(
  left: Schema<IL, OL, EL, L>,
  right: Schema<IR, OR, ER, R>
): Schema<
  { readonly _tag: unknown },
  Either<OL, OR>,
  EL | ER | DE.NotEqual<"Left"> | DE.NotEqual<"Right">,
  Either<L, R>
> =>
  union(
    struct({ _tag: literal("Left"), left }),
    struct({ _tag: literal("Right"), right })
  )
