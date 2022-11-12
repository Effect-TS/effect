/**
 * @since 1.0.0
 */
import type { Meta } from "@fp-ts/codec/Meta"
import * as meta from "@fp-ts/codec/Meta"
import type { Either } from "@fp-ts/data/Either"
import * as O from "@fp-ts/data/Option"
import type { Option } from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export type Schema<A> = Meta & {
  readonly A: A
}

/**
 * @since 1.0.0
 */
export const make = <A>(meta: Meta): Schema<A> => meta as any

/**
 * @since 1.0.0
 */
export const addDeclaration = meta.addDeclaration

/**
 * @since 1.0.0
 */
export const getDeclaration = meta.getDeclaration

/**
 * @since 1.0.0
 */
export const apply = <Schemas extends ReadonlyArray<Schema<unknown>>>(
  symbol: symbol,
  config: Option<unknown>,
  ...schemas: Schemas
): Schema<never> => make(meta.apply(symbol, config, schemas))

/**
 * @since 1.0.0
 */
export const string: Schema<string> = make(meta.string({}))

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <A extends { length: number }>(
    schema: Schema<A>
  ): Schema<A> => {
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
  <A extends { length: number }>(
    schema: Schema<A>
  ): Schema<A> => {
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
export const number: Schema<number> = make(meta.number({}))

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number) =>
  <A extends number>(
    schema: Schema<A>
  ): Schema<A> => {
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
  <A extends number>(
    schema: Schema<A>
  ): Schema<A> => {
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
export const boolean: Schema<boolean> = make(meta.boolean)

/**
 * @since 1.0.0
 */
export const equal = <A>(
  value: A
): Schema<A> => make(meta.equal(value))

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<unknown>>>(
  ...members: Members
): Schema<Members[number]["A"]> => make(meta.union(members))

/**
 * @since 1.0.0
 */
export const tuple = <
  B extends boolean,
  Components extends ReadonlyArray<Schema<unknown>>
>(
  readonly: B,
  ...components: Components
): Schema<
  B extends true ? { readonly [K in keyof Components]: Components[K]["A"] }
    : { [K in keyof Components]: Components[K]["A"] }
> => make(meta.tuple(components, O.none, readonly))

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <B extends boolean, H, T>(
  readonly: B,
  head: Schema<H>,
  tail: Schema<T>
): Schema<B extends true ? readonly [H, ...Array<T>] : [H, ...Array<T>]> =>
  make(meta.tuple([head], O.some(tail), readonly))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<unknown>>>(
  fields: Fields
): Schema<{ readonly [K in keyof Fields]: Fields[K]["A"] }> =>
  make(
    meta.struct(
      Object.keys(fields).map((name) => meta.field(name, fields[name], false, true))
    )
  )

/**
 * @since 1.0.0
 */
export const indexSignature = <A>(
  value: Schema<A>
): Schema<{ readonly [_: string]: A }> => make(meta.indexSignature("string", value, true))

/**
 * @since 1.0.0
 */
export const array = <B extends boolean, A>(
  readonly: B,
  item: Schema<A>
): Schema<B extends true ? ReadonlyArray<A> : Array<A>> => make(meta.array(item, readonly))

/**
 * @since 1.0.0
 */
export const option = <A>(
  value: Schema<A>
): Schema<Option<A>> =>
  union(
    struct({ _tag: equal("None" as const) }),
    struct({ _tag: equal("Some" as const), value })
  )

/**
 * @since 1.0.0
 */
export const either = <E, A>(
  left: Schema<E>,
  right: Schema<A>
): Schema<Either<E, A>> =>
  union(
    struct({ _tag: equal("Left" as const), left }),
    struct({ _tag: equal("Right" as const), right })
  )
