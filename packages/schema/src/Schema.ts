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
export interface Declaration {
  [_: string]: Function
}

/**
 * @since 1.0.0
 */
export interface Declarations extends Map<symbol, Declaration> {}

/**
 * @since 1.0.0
 */
export const empty = (): Declarations => new Map()

/**
 * @since 1.0.0
 */
export const add = (
  symbol: symbol,
  declaration: Declaration
) =>
  (declarations: Declarations): Declarations => {
    const map: Declarations = new Map(declarations)
    const found = declarations.get(symbol)
    if (found !== undefined) {
      map.set(symbol, { ...found, ...declaration })
    } else {
      map.set(symbol, declaration)
    }
    return map
  }

/**
 * @since 1.0.0
 */
export const unsafeGet = (
  symbol: symbol
) =>
  (declarations: Declarations): Declaration => {
    if (!declarations.has(symbol)) {
      throw new Error(`Declaration for ${symbol.description} not found`)
    }
    return declarations.get(symbol)!
  }

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
  <A extends string>(
    schema: Schema<A>
  ): Schema<A> => {
    if (meta.isString(schema)) {
      return make(meta.string({
        minLength,
        maxLength: schema.maxLength
      }))
    }
    throw new Error("cannot `minLength` non-String schemas")
  }

/**
 * @since 1.0.0
 */
export const maxLength = (maxLength: number) =>
  <A extends string>(
    schema: Schema<A>
  ): Schema<A> => {
    if (meta.isString(schema)) {
      return make(meta.string({
        minLength: schema.minLength,
        maxLength
      }))
    }
    throw new Error("cannot `maxLength` non-String schemas")
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
    if (meta.isNumber(schema)) {
      return make(
        meta.number({
          minimum,
          maximum: schema.maximum,
          exclusiveMinimum: schema.exclusiveMinimum,
          exclusiveMaximum: schema.exclusiveMaximum
        })
      )
    }
    throw new Error("cannot `minimum` non-Number schemas")
  }

/**
 * @since 1.0.0
 */
export const maximum = (maximum: number) =>
  <A extends number>(
    schema: Schema<A>
  ): Schema<A> => {
    if (meta.isNumber(schema)) {
      return make(
        meta.number({
          minimum: schema.minimum,
          maximum,
          exclusiveMinimum: schema.exclusiveMinimum,
          exclusiveMaximum: schema.exclusiveMaximum
        })
      )
    }
    throw new Error("cannot `maximum` non-Number schemas")
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
      Object.keys(fields).map((key) => meta.field(key, fields[key], false, true))
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
export const pick = <A, K extends keyof A>(
  schema: Schema<A>,
  ...keys: ReadonlyArray<K>
): Schema<Pick<A, K>> => {
  if (meta.isStruct(schema)) {
    return make(
      meta.struct(schema.fields.filter((f) => (keys as ReadonlyArray<PropertyKey>).includes(f.key)))
    )
  }
  throw new Error("cannot `pick` non-Struct schemas")
}

/**
 * @since 1.0.0
 */
export const omit = <A, K extends keyof A>(
  schema: Schema<A>,
  ...keys: ReadonlyArray<K>
): Schema<Pick<A, K>> => {
  if (meta.isStruct(schema)) {
    return make(
      meta.struct(
        schema.fields.filter((f) => !(keys as ReadonlyArray<PropertyKey>).includes(f.key))
      )
    )
  }
  throw new Error("cannot `omit` non-Struct schemas")
}

/**
 * @since 1.0.0
 */
export const partial = <A>(
  schema: Schema<A>
): Schema<Partial<A>> => {
  if (meta.isStruct(schema)) {
    return make(
      meta.struct(
        schema.fields.map((f) => meta.field(f.key, f.value, true, f.readonly))
      )
    )
  }
  throw new Error("cannot `partial` non-Struct schemas")
}

/**
 * @since 1.0.0
 */
export const optional = <A>(
  schema: Schema<A>
): Schema<A | undefined> => union(equal(undefined), schema)

/**
 * @since 1.0.0
 */
export const nullable = <A>(
  schema: Schema<A>
): Schema<A | null> => union(equal(null), schema)

/**
 * @since 1.0.0
 */
export const nullish = <A>(
  schema: Schema<A>
): Schema<A | null | undefined> => union(equal(null), equal(undefined), schema)

/**
 * @since 1.0.0
 */
export const required = <A>(
  schema: Schema<A>
): Schema<Required<A>> => {
  if (meta.isStruct(schema)) {
    return make(
      meta.struct(
        schema.fields.map((f) => meta.field(f.key, f.value, false, f.readonly))
      )
    )
  }
  throw new Error("cannot `required` non-Struct schemas")
}

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

/*
type OptionalKeys<A> = {
  [K in keyof A]: K extends `${string}?` ? K : never
}[keyof A]

type RequiredKeys<A> = {
  [K in keyof A]: K extends `${string}?` ? never : K
}[keyof A]

 export const crazyStruct = <Fields extends Record<PropertyKey, Schema<unknown>>>(
  fields: Fields
): Schema<
  & { readonly [K in OptionalKeys<Fields> as K extends `${infer S}?` ? S : K]+?: Fields[K]["A"] }
  & { readonly [K in RequiredKeys<Fields>]: Fields[K]["A"] }
> =>
  make(
    meta.struct(
      Object.keys(fields).map((key) => {
        const isOptional = key.endsWith("?")
        return meta.field(
          isOptional ? key.substring(0, key.length - 1) : key,
          fields[key],
          isOptional,
          true
        )
      })
    )
  )
*/
