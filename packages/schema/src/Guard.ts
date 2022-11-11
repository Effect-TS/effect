/**
 * @since 1.0.0
 */

import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Guard<out P, out A> {
  readonly schema: Schema<P, A>
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export const make = <P, A>(schema: Schema<P, A>, is: Guard<P, A>["is"]): Guard<P, A> => ({
  schema,
  is
})

const isString = (u: unknown): u is string => typeof u === "string"

/**
 * @since 1.0.0
 */
export const string: Guard<never, string> = make(S.string, isString)

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number) =>
  <P, A extends { length: number }>(self: Guard<P, A>): Guard<P, A> =>
    make(S.minLength(minLength)(self.schema), (a): a is A => self.is(a) && a.length >= minLength)

/**
 * @since 1.0.0
 */
export const maxLength = (
  maxLength: number
) =>
  <P, A extends { length: number }>(self: Guard<P, A>): Guard<P, A> =>
    make(S.maxLength(maxLength)(self.schema), (a): a is A => self.is(a) && a.length <= maxLength)

const isNumber = (u: unknown): u is number => typeof u === "number"

/**
 * @since 1.0.0
 */
export const number: Guard<never, number> = make(S.number, isNumber)

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number) =>
  <P, A extends number>(self: Guard<P, A>): Guard<P, A> =>
    make(S.minimum(minimum)(self.schema), (a): a is A => self.is(a) && a >= minimum)

/**
 * @since 1.0.0
 */
export const maximum = (
  maximum: number
) =>
  <P, A extends number>(self: Guard<P, A>): Guard<P, A> =>
    make(S.maximum(maximum)(self.schema), (a): a is A => self.is(a) && a <= maximum)

const isBoolean = (u: unknown): u is boolean => typeof u === "boolean"

/**
 * @since 1.0.0
 */
export const boolean: Guard<never, boolean> = make(S.boolean, isBoolean)

const isEqual = <A>(
  value: A
) => (u: unknown): u is A => u === value

/**
 * @since 1.0.0
 */
export const equal = <A>(
  value: A
): Guard<never, A> => make(S.equal(value), isEqual(value))

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Guard<unknown, unknown>>>(
  ...components: Components
): Guard<
  Components[number]["schema"]["P"],
  { readonly [K in keyof Components]: Components[K]["schema"]["A"] }
> =>
  make(
    S.tuple(
      true,
      ...components.map((c) => c.schema)
    ) as any,
    (a): a is { readonly [K in keyof Components]: Components[K]["schema"]["A"] } =>
      Array.isArray(a) &&
      components.every((guard, i) => guard.is(a[i]))
  )

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Guard<unknown, unknown>>>(
  ...members: Members
): Guard<Members[number]["schema"]["P"], Members[number]["schema"]["A"]> =>
  make(
    S.union(...members.map((m) => m.schema)),
    (a): a is Members[number]["schema"]["A"] => members.some((guard) => guard.is(a))
  )

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Guard<unknown, unknown>>>(
  fields: Fields
): Guard<
  Fields[keyof Fields]["schema"]["P"],
  { readonly [K in keyof Fields]: Fields[K]["schema"]["A"] }
> => {
  const keys = Object.keys(fields)
  const guards = keys.map((key) => fields[key])
  const schemas = {}
  keys.forEach((key) => {
    schemas[key] = fields[key].schema
  })
  return make(
    S.struct(schemas) as any,
    (a): a is { readonly [K in keyof Fields]: Fields[K]["schema"]["A"] } =>
      typeof a === "object" && a != null &&
      guards.every((guard, i) => guard.is(a[keys[i]]))
  )
}

/**
 * @since 1.0.0
 */
export const indexSignature = <P, A>(
  value: Guard<P, A>
): Guard<P, { readonly [_: string]: A }> =>
  make(
    S.indexSignature(value.schema),
    (a): a is { readonly [_: string]: A } =>
      typeof a === "object" && a != null && Object.keys(a).every((key) => value.is(a[key]))
  )

/**
 * @since 1.0.0
 */
export const array = <P, A>(
  item: Guard<P, A>
): Guard<P, ReadonlyArray<A>> =>
  make(
    S.array(true, item.schema),
    (a): a is ReadonlyArray<A> => Array.isArray(a) && a.every((elem) => item.is(elem))
  )

/**
 * @since 1.0.0
 */
export const guardFor = <P>(
  ctx: C.Context<P>
): <A>(schema: Schema<P, A>) => Guard<P, A> => {
  const f = (meta: Meta): Guard<P, any> => {
    switch (meta._tag) {
      case "Tag": {
        const service = pipe(ctx, C.unsafeGet(meta.tag))
        return service.guardFor(meta.metas.map(f))
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
          return make(meta as any, (a): a is any =>
            out.is(a) &&
            a.slice(components.length).every(restElement.is))
        }
        return out
      }
      case "Union":
        return union(...meta.members.map(f))
      case "Struct": {
        const fields = {}
        meta.fields.forEach((field) => {
          fields[field.key] = f(field.value)
        })
        return struct(fields)
      }
      case "IndexSignature":
        return indexSignature(f(meta.value))
      case "Array":
        return array(f(meta.item))
    }
  }
  return f
}
