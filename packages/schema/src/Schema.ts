/**
 * @since 1.0.0
 */
import type { Meta } from "@fp-ts/codec/Meta"
import * as meta from "@fp-ts/codec/Meta"
import type * as C from "@fp-ts/data/Context"
import type { Either } from "@fp-ts/data/Either"
import * as O from "@fp-ts/data/Option"
import type { Option } from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export type Schema<P, A> = Meta & {
  readonly P: P
  readonly A: A
}

/**
 * @since 1.0.0
 */
export const make = <P, A>(meta: Meta): Schema<P, A> => meta as any

/**
 * @since 1.0.0
 */
export const primitive = <S>(
  tag: C.Tag<S>
): Schema<S, never> => make(meta.constructor(tag, []))

/**
 * @since 1.0.0
 */
export const constructor = <S, P, A>(
  tag: C.Tag<S>,
  schema: Schema<P, A>
): Schema<P | S, never> => make(meta.constructor(tag, [schema]))

/**
 * @since 1.0.0
 */
export const string: Schema<never, string> = make(meta.string({}))

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <P, A extends { length: number }>(
    schema: Schema<P, A>
  ): Schema<P, A> => {
    switch (schema._tag) {
      case "String":
        return make(meta.string({
          minLength,
          maxLength: schema.maxLength
        }))
      default:
        return schema
    }
  }

/**
 * @since 1.0.0
 */
export const maxLength = (maxLength: number) =>
  <P, A extends { length: number }>(
    schema: Schema<P, A>
  ): Schema<P, A> => {
    switch (schema._tag) {
      case "String":
        return make(meta.string({
          minLength: schema.minLength,
          maxLength
        }))
      default:
        return schema
    }
  }

/**
 * @since 1.0.0
 */
export const number: Schema<never, number> = make(meta.number({}))

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number) =>
  <P, A extends number>(
    schema: Schema<P, A>
  ): Schema<P, A> => {
    switch (schema._tag) {
      case "Number":
        return make(
          meta.number({
            minimum,
            maximum: schema.maximum,
            exclusiveMinimum: schema.exclusiveMinimum,
            exclusiveMaximum: schema.exclusiveMaximum
          })
        )
      default:
        return schema
    }
  }

/**
 * @since 1.0.0
 */
export const maximum = (maximum: number) =>
  <P, A extends number>(
    schema: Schema<P, A>
  ): Schema<P, A> => {
    switch (schema._tag) {
      case "Number":
        return make(
          meta.number({
            minimum: schema.minimum,
            maximum,
            exclusiveMinimum: schema.exclusiveMinimum,
            exclusiveMaximum: schema.exclusiveMaximum
          })
        )
      default:
        return schema
    }
  }

/**
 * @since 1.0.0
 */
export const boolean: Schema<never, boolean> = make(meta.boolean)

/**
 * @since 1.0.0
 */
export const literal = <A extends meta.LiteralValue>(
  literal: A
): Schema<never, A> => make(meta.literal(literal))

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<unknown, unknown>>>(
  ...members: Members
): Schema<Members[number]["P"], Members[number]["A"]> => make(meta.union(members))

/**
 * @since 1.0.0
 */
export const tuple = <
  B extends boolean,
  Components extends ReadonlyArray<Schema<unknown, unknown>>
>(
  readonly: B,
  ...components: Components
): Schema<
  Components[number]["P"],
  B extends true ? { readonly [K in keyof Components]: Components[K]["A"] }
    : { [K in keyof Components]: Components[K]["A"] }
> => make(meta.tuple(components, O.none, readonly))

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <B extends boolean, HP, HA, TP, TA>(
  readonly: B,
  head: Schema<HP, HA>,
  tail: Schema<TP, TA>
): Schema<
  HP | TP,
  B extends true ? readonly [HA, ...Array<TA>] : [HA, ...Array<TA>]
> => make(meta.tuple([head], O.some(tail), readonly))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<unknown, unknown>>>(
  fields: Fields
): Schema<
  Fields[keyof Fields]["P"],
  { readonly [K in keyof Fields]: Fields[K]["A"] }
> =>
  make(
    meta.struct(
      Object.keys(fields).map((name) => meta.field(name, fields[name], false, true))
    )
  )

/**
 * @since 1.0.0
 */
export const indexSignature = <P, A>(
  value: Schema<P, A>
): Schema<P, { readonly [_: string]: A }> => make(meta.indexSignature("string", value, true))

/**
 * @since 1.0.0
 */
export const array = <B extends boolean, P, A>(
  readonly: B,
  item: Schema<P, A>
): Schema<P, B extends true ? ReadonlyArray<A> : Array<A>> => make(meta.array(item, readonly))

/**
 * @since 1.0.0
 */
export const option = <P, A>(
  value: Schema<P, A>
): Schema<P, Option<A>> =>
  union(
    struct({ _tag: literal("None") }),
    struct({ _tag: literal("Some"), value })
  )

/**
 * @since 1.0.0
 */
export const either = <PL, L, PR, R>(
  left: Schema<PL, L>,
  right: Schema<PR, R>
): Schema<PR | PL, Either<L, R>> =>
  union(
    struct({ _tag: literal("Left"), left }),
    struct({ _tag: literal("Right"), right })
  )
