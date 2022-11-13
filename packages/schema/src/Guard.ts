/**
 * @since 1.0.0
 */

import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { flow, pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Guard<in out A> extends Schema<A> {
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export const make = <A>(
  schema: Schema<A>,
  is: Guard<A>["is"]
): Guard<A> => ({ declarations: schema.declarations, meta: schema.meta, is }) as any

/**
 * @since 1.0.0
 */
export const alias = (symbol: symbol) =>
  <A>(guard: Guard<A>): Guard<A> => {
    const declarations = pipe(
      guard.declarations,
      S.add(symbol, {
        guardFor: (): Guard<A> => out
      })
    )
    const schema = S.apply(symbol, O.none, declarations)
    const out = make(schema, guard.is)
    return out
  }

/**
 * @since 1.0.0
 */
export const mapSchema = <A, B>(
  f: (schema: Schema<A>) => Schema<B>
) => (guard: Guard<A>): Guard<B> => guardFor(f(guard))

/**
 * @since 1.0.0
 */
export const string: Guard<string> = make(
  S.string,
  (u: unknown): u is string => typeof u === "string"
)

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <A extends { length: number }>(self: Guard<A>): Guard<A> =>
    make(
      S.minLength(minLength)(self),
      (a): a is A => self.is(a) && a.length >= minLength
    )

/**
 * @since 1.0.0
 */
export const maxLength = (
  maxLength: number
) =>
  <A extends { length: number }>(self: Guard<A>): Guard<A> =>
    make(
      S.maxLength(maxLength)(self),
      (a): a is A => self.is(a) && a.length <= maxLength
    )

/**
 * @since 1.0.0
 */
export const number: Guard<number> = make(
  S.number,
  (u: unknown): u is number => typeof u === "number"
)

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number) =>
  <A extends number>(self: Guard<A>): Guard<A> =>
    make(
      S.minimum(minimum)(self),
      (a): a is A => self.is(a) && a >= minimum
    )

/**
 * @since 1.0.0
 */
export const maximum = (
  maximum: number
) =>
  <A extends number>(self: Guard<A>): Guard<A> =>
    make(
      S.maximum(maximum)(self),
      (a): a is A => self.is(a) && a <= maximum
    )

/**
 * @since 1.0.0
 */
export const boolean: Guard<boolean> = make(
  S.boolean,
  (u: unknown): u is boolean => typeof u === "boolean"
)

/**
 * @since 1.0.0
 */
export const of = <A>(
  value: A
): Guard<A> => make(S.of(value), (u: unknown): u is A => u === value)

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Guard<any>>>(
  ...components: Components
): Guard<{ readonly [K in keyof Components]: Parameters<Components[K]["A"]>[0] }> =>
  make(
    S.tuple(true, ...components) as any,
    (a): a is { readonly [K in keyof Components]: Parameters<Components[K]["A"]>[0] } =>
      Array.isArray(a) &&
      components.every((guard, i) => guard.is(a[i]))
  )

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Guard<any>>>(
  ...members: Members
): Guard<Parameters<Members[number]["A"]>[0]> =>
  make(
    S.union(...members),
    (a): a is Parameters<Members[number]["A"]>[0] => members.some((guard) => guard.is(a))
  )

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Guard<any>>>(
  fields: Fields
): Guard<{ readonly [K in keyof Fields]: Parameters<Fields[K]["A"]>[0] }> => {
  const keys = Object.keys(fields)
  const guards = keys.map((key) => fields[key])
  const schemas = {}
  keys.forEach((key) => {
    schemas[key] = fields[key]
  })
  return make(
    S.struct(schemas) as any,
    (a): a is { readonly [K in keyof Fields]: Parameters<Fields[K]["A"]>[0] } =>
      typeof a === "object" && a != null &&
      guards.every((guard, i) => guard.is(a[keys[i]]))
  )
}

/**
 * @since 1.0.0
 */
export const indexSignature = <A>(
  value: Guard<A>
): Guard<{ readonly [_: string]: A }> =>
  make(
    S.indexSignature(value),
    (a): a is { readonly [_: string]: A } =>
      typeof a === "object" && a != null && Object.keys(a).every((key) => value.is(a[key]))
  )

/**
 * @since 1.0.0
 */
export const array = <A>(
  item: Guard<A>
): Guard<ReadonlyArray<A>> =>
  make(
    S.array(true, item),
    (a): a is ReadonlyArray<A> => Array.isArray(a) && a.every((elem) => item.is(elem))
  )

/**
 * @since 1.0.0
 */
export const optional = mapSchema(S.optional)

/**
 * @since 1.0.0
 */
export const pick = flow(S.pick, mapSchema)

/**
 * @since 1.0.0
 */
export const omit = flow(S.omit, mapSchema)

/**
 * @since 1.0.0
 */
export const guardFor = <A>(schema: Schema<A>): Guard<A> => {
  const f = (meta: Meta): Guard<any> => {
    switch (meta._tag) {
      case "Apply": {
        const declaration = S.unsafeGet(meta.symbol)(schema.declarations)
        if (declaration.guardFor !== undefined) {
          return O.isSome(meta.config) ?
            declaration.guardFor(meta.config.value, ...meta.metas.map(f)) :
            declaration.guardFor(...meta.metas.map(f))
        }
        throw new Error(`Missing "guardFor" declaration for ${meta.symbol.description}`)
      }
      case "String": {
        let out = string
        if (meta.minLength !== undefined) {
          out = minLength(meta.minLength)(out)
        }
        if (meta.maxLength !== undefined) {
          out = maxLength(meta.maxLength)(out)
        }
        return out
      }
      case "Number": {
        let out = number
        if (meta.minimum !== undefined) {
          out = minimum(meta.minimum)(out)
        }
        if (meta.maximum !== undefined) {
          out = maximum(meta.maximum)(out)
        }
        return out
      }
      case "Boolean":
        return boolean
      case "Of":
        return of(meta.value)
      case "Tuple": {
        const components = meta.components.map(f)
        const out = tuple(...components)
        if (O.isSome(meta.restElement)) {
          const restElement = f(meta.restElement.value)
          return make(
            S.make(S.mergeMany(components.map((c) => c.declarations))(S.empty), meta),
            (a): a is any =>
              out.is(a) &&
              a.slice(components.length).every(restElement.is)
          )
        }
        return out
      }
      case "Union":
        return union(...meta.members.map(f))
      case "Struct": {
        const fields = {}
        meta.fields.forEach((field) => {
          fields[field.key] = field.optional ? optional(f(field.value)) : f(field.value)
        })
        return struct(fields)
      }
      case "IndexSignature":
        return indexSignature(f(meta.value))
      case "Array":
        return array(f(meta.item))
    }
  }
  return f(schema.meta)
}
