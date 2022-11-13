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
export interface Guard<out A> {
  readonly A: A
  readonly declarations: S.Declarations
  readonly schema: Schema<A>
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export const make = <A>(
  declarations: S.Declarations,
  schema: Schema<A>,
  is: Guard<A>["is"]
): Guard<A> => ({ declarations, schema, is }) as any

/**
 * @since 1.0.0
 */
export const alias = (symbol: symbol) =>
  <A>(guard: Guard<A>): Guard<A> => {
    const schema = S.apply(symbol, O.none)
    const declarations = pipe(
      guard.declarations,
      S.add(symbol, {
        guardFor: (): Guard<A> => out
      })
    )
    const out = make(declarations, schema, guard.is)
    return out
  }

/**
 * @since 1.0.0
 */
export const mapSchema = <A, B>(
  f: (schema: Schema<A>) => Schema<B>
) => (guard: Guard<A>): Guard<B> => guardFor(guard.declarations)(f(guard.schema))

/**
 * @since 1.0.0
 */
export const string: Guard<string> = make(
  S.empty,
  S.string,
  (u: unknown): u is string => typeof u === "string"
)

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <A extends { length: number }>(self: Guard<A>): Guard<A> =>
    make(
      self.declarations,
      S.minLength(minLength)(self.schema),
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
      self.declarations,
      S.maxLength(maxLength)(self.schema),
      (a): a is A => self.is(a) && a.length <= maxLength
    )

/**
 * @since 1.0.0
 */
export const number: Guard<number> = make(
  S.empty,
  S.number,
  (u: unknown): u is number => typeof u === "number"
)

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number) =>
  <A extends number>(self: Guard<A>): Guard<A> =>
    make(
      self.declarations,
      S.minimum(minimum)(self.schema),
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
      self.declarations,
      S.maximum(maximum)(self.schema),
      (a): a is A => self.is(a) && a <= maximum
    )

/**
 * @since 1.0.0
 */
export const boolean: Guard<boolean> = make(
  S.empty,
  S.boolean,
  (u: unknown): u is boolean => typeof u === "boolean"
)

/**
 * @since 1.0.0
 */
export const equal = <A>(
  value: A
): Guard<A> => make(S.empty, S.equal(value), (u: unknown): u is A => u === value)

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Guard<unknown>>>(
  ...components: Components
): Guard<{ readonly [K in keyof Components]: Components[K]["A"] }> =>
  make(
    S.mergeMany(components.map((c) => c.declarations))(S.empty),
    S.tuple(true, ...components.map((c) => c.schema)) as any,
    (a): a is { readonly [K in keyof Components]: Components[K]["A"] } =>
      Array.isArray(a) &&
      components.every((guard, i) => guard.is(a[i]))
  )

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Guard<unknown>>>(
  ...members: Members
): Guard<Members[number]["A"]> =>
  make(
    S.mergeMany(members.map((c) => c.declarations))(S.empty),
    S.union(...members.map((m) => m.schema)),
    (a): a is Members[number]["A"] => members.some((guard) => guard.is(a))
  )

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Guard<unknown>>>(
  fields: Fields
): Guard<{ readonly [K in keyof Fields]: Fields[K]["A"] }> => {
  const keys = Object.keys(fields)
  const guards = keys.map((key) => fields[key])
  const schemas = {}
  keys.forEach((key) => {
    schemas[key] = fields[key].schema
  })
  return make(
    S.mergeMany(keys.map((key) => fields[key].declarations))(S.empty),
    S.struct(schemas) as any,
    (a): a is { readonly [K in keyof Fields]: Fields[K]["A"] } =>
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
    value.declarations,
    S.indexSignature(value.schema),
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
    item.declarations,
    S.array(true, item.schema),
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
export const guardFor = (declarations: S.Declarations) =>
  <A>(schema: Schema<A>): Guard<A> => {
    const f = (meta: Meta): Guard<any> => {
      switch (meta._tag) {
        case "Apply": {
          const declaration = S.unsafeGet(meta.symbol)(declarations)
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
        case "Equal":
          return equal(meta.value)
        case "Tuple": {
          const components = meta.components.map(f)
          const out = tuple(...components)
          if (O.isSome(meta.restElement)) {
            const restElement = f(meta.restElement.value)
            return make(
              S.mergeMany(components.map((c) => c.declarations))(S.empty),
              S.make(meta),
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
    return f(schema)
  }
