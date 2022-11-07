/**
 * @since 1.0.0
 */
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
export type Schema<A> = DSL & {
  readonly [schemaSym]: A
}

/**
 * @since 1.0.0
 */
export const make = <A>(dsl: DSL): Schema<A> => dsl as any

/**
 * @since 1.0.0
 */
export const string: Schema<string> = make(dsl.stringDSL)

/**
 * @since 1.0.0
 */
export const number: Schema<number> = make(dsl.numberDSL)

/**
 * @since 1.0.0
 */
export const boolean: Schema<boolean> = make(dsl.booleanDSL)

/**
 * @since 1.0.0
 */
export const literal = <A extends dsl.Literal>(
  literal: A
): Schema<A> => make(dsl.literalDSL(literal))

/**
 * @since 1.0.0
 */
export const array = <A, B extends boolean>(
  item: Schema<A>,
  readonly: B
): Schema<B extends true ? ReadonlyArray<A> : Array<A>> => make(dsl.arrayDSL(item, readonly))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
): Schema<{ readonly [K in keyof Fields]: Fields[K][typeof schemaSym] }> =>
  make(
    dsl.structDSL(Object.keys(fields).map((name) => dsl.fieldDSL(name, fields[name], false, true)))
  )

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Schema<Members[number][typeof schemaSym]> => make(dsl.unionDSL(members))

/**
 * @since 1.0.0
 */
export const indexSignature = <A>(
  value: Schema<A>
): Schema<{ readonly [_: string]: A }> => make(dsl.indexSignatureDSL("string", value, true))

/**
 * @since 1.0.0
 */
export const option = <A>(
  value: Schema<A>
): Schema<Option<A>> =>
  union(
    struct({ _tag: literal("None") }),
    struct({ _tag: literal("Some"), value })
  )

/**
 * @since 1.0.0
 */
export const either = <E, A>(
  left: Schema<E>,
  right: Schema<A>
): Schema<Either<E, A>> =>
  union(
    struct({ _tag: literal("Left"), left }),
    struct({ _tag: literal("Right"), right })
  )
