/**
 * @since 1.0.0
 */
import type { Declaration, Declarations, Meta } from "@fp-ts/codec/Meta"
import * as M from "@fp-ts/codec/Meta"
import type { Either } from "@fp-ts/data/Either"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Schema<in out A> {
  readonly A: (_: A) => A
  readonly meta: Meta
}

/**
 * @since 1.0.0
 */
export const make = <A>(meta: Meta): Schema<A> => ({ meta }) as any

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
export const apply = <Schemas extends ReadonlyArray<Schema<any>>>(
  symbol: symbol,
  config: Option<unknown>,
  declaration: Declaration,
  ...schemas: Schemas
): Schema<any> => make(M.apply(symbol, config, declaration, schemas.map((s) => s.meta)))

/**
 * @since 1.0.0
 */
export const string: Schema<string> = make(M.string({}))

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <A extends { length: number }>(
    schema: Schema<A>
  ): Schema<A> => {
    if (M.isString(schema.meta)) {
      return make(
        M.string({
          minLength,
          maxLength: schema.meta.maxLength
        })
      )
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
    if (M.isString(schema.meta)) {
      return make(
        M.string({
          minLength: schema.meta.minLength,
          maxLength
        })
      )
    }
    throw new Error("cannot `maxLength` non-String schemas")
  }

/**
 * @since 1.0.0
 */
export const number: Schema<number> = make(M.number({}))

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number) =>
  <A extends number>(
    schema: Schema<A>
  ): Schema<A> => {
    if (M.isNumber(schema.meta)) {
      return make(
        M.number({
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
    if (M.isNumber(schema.meta)) {
      return make(
        M.number({
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
export const boolean: Schema<boolean> = make(M.boolean)

/**
 * @since 1.0.0
 */
export const of = <A>(
  value: A
): Schema<A> => make(M.of(value))

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Schema<Parameters<Members[number]["A"]>[0]> => make(M.union(members.map((m) => m.meta)))

/**
 * @since 1.0.0
 */
export const tuple = <
  B extends boolean,
  Components extends ReadonlyArray<Schema<any>>
>(
  readonly: B,
  ...components: Components
): Schema<
  B extends true ? { readonly [K in keyof Components]: Parameters<Components[K]["A"]>[0] }
    : { [K in keyof Components]: Parameters<Components[K]["A"]>[0] }
> => make(M.tuple(components.map((c) => c.meta), O.none, readonly))

/**
 * @since 1.0.0
 */
export const nonEmptyArray = <B extends boolean, H, T>(
  readonly: B,
  head: Schema<H>,
  tail: Schema<T>
): Schema<B extends true ? readonly [H, ...Array<T>] : [H, ...Array<T>]> =>
  make(M.tuple([head.meta], O.some(tail.meta), readonly))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
): Schema<{ readonly [K in keyof Fields]: Parameters<Fields[K]["A"]>[0] }> =>
  make(
    M.struct(
      Object.keys(fields).map((key) => M.field(key, fields[key].meta, false, true)),
      O.none
    )
  )

/**
 * @since 1.0.0
 */
export const indexSignature = <A>(
  value: Schema<A>
): Schema<{ readonly [_: string]: A }> =>
  make(M.struct([], O.some(M.indexSignature("string", value.meta, true))))

/**
 * @since 1.0.0
 */
export const array = <B extends boolean, A>(
  readonly: B,
  item: Schema<A>
): Schema<B extends true ? ReadonlyArray<A> : Array<A>> =>
  make(M.tuple([], O.some(item.meta), readonly))

/** @internal */
export const memoize = <A, B>(f: (a: A) => B, trace = false): (a: A) => B => {
  const cache = new Map()
  return (a) => {
    if (!cache.has(a)) {
      const b = f(a)
      cache.set(a, b)
      return b
    } else if (trace) {
      console.log("cache hit, key: ", a, ", value: ", cache.get(a))
    }
    return cache.get(a)
  }
}

/**
 * @since 1.0.0
 */
export const lazy = <A>(
  symbol: symbol,
  f: () => Schema<A>
): Schema<A> => {
  return make(M.lazy(symbol, () => f().meta))
}

/**
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) =>
  (schema: Schema<A>): Schema<{ [P in Keys[number]]: A[P] }> => {
    return make(M.struct(
      M.getFields(schema.meta).filter((f) => (keys as ReadonlyArray<PropertyKey>).includes(f.key)),
      O.none
    ))
  }

/**
 * @since 1.0.0
 */
export const keyOf = <A>(
  schema: Schema<A>
): Schema<keyof A> => {
  if (M.isStruct(schema.meta)) {
    return union(...schema.meta.fields.map((field) => of(field.key as keyof A)))
  }
  throw new Error("cannot `keyof` non-Struct schemas")
}

/**
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(
  ...keys: Keys
) =>
  (schema: Schema<A>): Schema<{ [P in Exclude<keyof A, Keys[number]>]: A[P] }> => {
    return make(M.struct(
      M.getFields(schema.meta).filter((f) => !(keys as ReadonlyArray<PropertyKey>).includes(f.key)),
      O.none
    ))
  }

/**
 * @since 1.0.0
 */
export const partial = <A>(
  schema: Schema<A>
): Schema<Partial<A>> => {
  if (M.isStruct(schema.meta)) {
    return make(
      M.struct(
        schema.meta.fields.map((f) => M.field(f.key, f.value, true, f.readonly)),
        schema.meta.indexSignature
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
): Schema<A | undefined> => union(of(undefined), schema)

/**
 * @since 1.0.0
 */
export const nullable = <A>(
  schema: Schema<A>
): Schema<A | null> => union(of(null), schema)

/**
 * @since 1.0.0
 */
export const nullish = <A>(
  schema: Schema<A>
): Schema<A | null | undefined> => union(of(null), of(undefined), schema)

/**
 * @since 1.0.0
 */
export const required = <A>(
  schema: Schema<A>
): Schema<{ [P in keyof A]-?: A[P] }> => {
  if (M.isStruct(schema.meta)) {
    return make(
      M.struct(
        schema.meta.fields.map((f) => M.field(f.key, f.value, false, f.readonly)),
        schema.meta.indexSignature
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
    struct({ _tag: of("None" as const) }),
    struct({ _tag: of("Some" as const), value })
  )

/**
 * @since 1.0.0
 */
export const either = <E, A>(
  left: Schema<E>,
  right: Schema<A>
): Schema<Either<E, A>> =>
  union(
    struct({ _tag: of("Left" as const), left }),
    struct({ _tag: of("Right" as const), right })
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
  & { readonly [K in OptionalKeys<Fields> as K extends `${infer S}?` ? S : K]+?: Parameters<Fields[K]["A"]>[0] }
  & { readonly [K in RequiredKeys<Fields>]: Parameters<Fields[K]["A"]>[0] }
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
