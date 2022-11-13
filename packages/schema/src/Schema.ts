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
export interface Schema<A> {
  readonly A: A
  readonly meta: Meta
}

/**
 * @since 1.0.0
 */
export const make = <A>(meta: Meta): Schema<A> => ({ meta }) as any

/**
 * @since 1.0.0
 */
export interface Declaration {
  readonly [_: string]: Function
}

/**
 * @since 1.0.0
 */
export interface Declarations extends ReadonlyMap<symbol, Declaration> {}

/**
 * @since 1.0.0
 */
export const empty: Declarations = new Map()

/**
 * @since 1.0.0
 */
export const add = (
  symbol: symbol,
  declaration: Declaration
) =>
  (declarations: Declarations): Declarations => {
    const map = new Map(declarations)
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
export const mergeMany = (tail: ReadonlyArray<Declarations>) =>
  (head: Declarations): Declarations => {
    const map = new Map(head)
    for (const d of tail) {
      for (const [symbol, declaration] of d) {
        const found = d.get(symbol)
        if (found !== undefined) {
          map.set(symbol, { ...found, ...declaration })
        } else {
          map.set(symbol, declaration)
        }
      }
    }
    return map
  }

/**
 * @since 1.0.0
 */
export const apply = <Schemas extends ReadonlyArray<Schema<unknown>>>(
  symbol: symbol,
  config: Option<unknown>,
  ...schemas: Schemas
): Schema<never> => make(meta.apply(symbol, config, schemas.map((s) => s.meta)))

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
    if (meta.isString(schema.meta)) {
      return make(meta.string({
        minLength,
        maxLength: schema.meta.maxLength
      }))
    }
    throw new Error("cannot `minLength` non-String schemas")
  }

/**
 * @since 1.0.0
 */
export const maxLength = (maxLength: number) =>
  <A extends { length: number }>(
    schema: Schema<A>
  ): Schema<A> => {
    if (meta.isString(schema.meta)) {
      return make(meta.string({
        minLength: schema.meta.minLength,
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
    if (meta.isNumber(schema.meta)) {
      return make(
        meta.number({
          minimum,
          maximum: schema.meta.maximum,
          exclusiveMinimum: schema.meta.exclusiveMinimum,
          exclusiveMaximum: schema.meta.exclusiveMaximum
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
    if (meta.isNumber(schema.meta)) {
      return make(
        meta.number({
          minimum: schema.meta.minimum,
          maximum,
          exclusiveMinimum: schema.meta.exclusiveMinimum,
          exclusiveMaximum: schema.meta.exclusiveMaximum
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
): Schema<Members[number]["A"]> => make(meta.union(members.map((m) => m.meta)))

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
> => make(meta.tuple(components.map((c) => c.meta), O.none, readonly))

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <B extends boolean, H, T>(
  readonly: B,
  head: Schema<H>,
  tail: Schema<T>
): Schema<B extends true ? readonly [H, ...Array<T>] : [H, ...Array<T>]> =>
  make(meta.tuple([head.meta], O.some(tail.meta), readonly))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<unknown>>>(
  fields: Fields
): Schema<{ readonly [K in keyof Fields]: Fields[K]["A"] }> =>
  make(
    meta.struct(
      Object.keys(fields).map((key) => meta.field(key, fields[key].meta, false, true))
    )
  )

/**
 * @since 1.0.0
 */
export const indexSignature = <A>(
  value: Schema<A>
): Schema<{ readonly [_: string]: A }> => make(meta.indexSignature("string", value.meta, true))

/**
 * @since 1.0.0
 */
export const array = <B extends boolean, A>(
  readonly: B,
  item: Schema<A>
): Schema<B extends true ? ReadonlyArray<A> : Array<A>> => make(meta.array(item.meta, readonly))

/**
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) =>
  (schema: Schema<A>): Schema<{ [P in Keys[number]]: A[P] }> => {
    if (meta.isStruct(schema.meta)) {
      return make(
        meta.struct(
          schema.meta.fields.filter((f) => (keys as ReadonlyArray<PropertyKey>).includes(f.key))
        )
      )
    }
    throw new Error("cannot `pick` non-Struct schemas")
  }

/**
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) =>
  (schema: Schema<A>): Schema<{ [P in Exclude<keyof A, Keys[number]>]: A[P] }> => {
    if (meta.isStruct(schema.meta)) {
      return make(
        meta.struct(
          schema.meta.fields.filter((f) => !(keys as ReadonlyArray<PropertyKey>).includes(f.key))
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
  if (meta.isStruct(schema.meta)) {
    return make(
      meta.struct(
        schema.meta.fields.map((f) => meta.field(f.key, f.value, true, f.readonly))
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
  if (meta.isStruct(schema.meta)) {
    return make(
      meta.struct(
        schema.meta.fields.map((f) => meta.field(f.key, f.value, false, f.readonly))
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
