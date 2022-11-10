/**
 * @since 1.0.0
 */

import type { LiteralValue, Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Guard<out A> {
  readonly A: A
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export const make = <A>(is: Guard<A>["is"]): Guard<A> => ({ is }) as any

/**
 * @since 1.0.0
 */
export const string: Guard<string> = make((a): a is string => typeof a === "string")

/**
 * @since 1.0.0
 */
export const number: Guard<number> = make((a): a is number => typeof a === "number")

/**
 * @since 1.0.0
 */
export const boolean: Guard<boolean> = make((a): a is boolean => typeof a === "boolean")

/**
 * @since 1.0.0
 */
export const literal = <A extends LiteralValue>(
  literal: A
): Guard<A> => make((a): a is A => a === literal)

/**
 * @since 1.0.0
 */
export const tuple = <Components extends ReadonlyArray<Guard<unknown>>>(
  ...components: Components
): Guard<{ readonly [K in keyof Components]: Components[K]["A"] }> =>
  make((a): a is { readonly [K in keyof Components]: Components[K]["A"] } =>
    Array.isArray(a) &&
    components.every((guard, i) => guard.is(a[i]))
  )

/**
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Guard<unknown>>>(
  ...members: Members
): Guard<Members[number]["A"]> =>
  make((a): a is Members[number]["A"] => members.some((guard) => guard.is(a)))

/**
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Guard<unknown>>>(
  fields: Fields
): Guard<{ readonly [K in keyof Fields]: Fields[K]["A"] }> => {
  const keys = Object.keys(fields)
  const guards = keys.map((key) => fields[key])
  return make((a): a is { readonly [K in keyof Fields]: Fields[K]["A"] } =>
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
  make((a): a is { readonly [_: string]: A } =>
    typeof a === "object" && a != null && Object.keys(a).every((key) => value.is(a[key]))
  )

/**
 * @since 1.0.0
 */
export const array = <A>(
  item: Guard<A>
): Guard<ReadonlyArray<A>> =>
  make((a): a is ReadonlyArray<A> => Array.isArray(a) && a.every((elem) => item.is(elem)))

/**
 * @since 1.0.0
 */
export const refinement = <A, B extends A>(
  base: Guard<A>,
  refinement: (a: A) => a is B
): Guard<B> => make((a): a is B => base.is(a) && refinement(a))

/**
 * @since 1.0.0
 */
export const guardFor = <P>(
  ctx: C.Context<P>
): <E, A>(schema: Schema<P, E, A>) => Guard<A> => {
  const f = (meta: Meta): Guard<any> => {
    switch (meta._tag) {
      case "Constructor": {
        const service = pipe(ctx, C.get(meta.tag as any)) as any
        return service.guard(meta.metas.map(f))
      }
      case "String":
        return string
      case "Number":
        return number
      case "Boolean":
        return boolean
      case "Literal":
        return literal(meta.literal)
      case "Tuple": {
        const components = meta.components.map(f)
        if (O.isSome(meta.restElement)) {
          const restElement = f(meta.restElement.value)
          return make((a): a is any =>
            Array.isArray(a) &&
            a.every((a, i) => i < components.length ? components[i].is(a) : restElement.is(a))
          )
        }
        return tuple(...components)
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
      case "Refinement":
        return refinement(f(meta.meta), meta.refinement)
    }
  }
  return f
}
