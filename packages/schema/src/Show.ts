/**
 * @since 1.0.0
 */

import * as G from "@fp-ts/codec/Guard"
import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Show<in out A> extends Schema<A> {
  readonly show: (a: A) => string
}

/**
 * @since 1.0.0
 */
export const make = <A>(schema: Schema<A>, show: Show<A>["show"]): Show<A> =>
  ({ meta: schema.meta, show }) as any

/**
 * @since 1.0.0
 */
export const lazy = <A>(
  symbol: symbol,
  f: () => Show<A>
): Show<A> => {
  const get = S.memoize<void, Show<A>>(f)
  const schema = S.lazy(symbol, f)
  return make(
    schema,
    (a) => get().show(a)
  )
}

const go = S.memoize((meta: Meta): Show<any> => {
  switch (meta._tag) {
    case "Apply": {
      const declaration = meta.declaration
      if (declaration.showFor !== undefined) {
        return O.isSome(meta.config) ?
          declaration.showFor(meta.config.value, ...meta.metas.map(go)) :
          declaration.showFor(...meta.metas.map(go))
      }
      throw new Error(`Missing "showFor" declaration for ${meta.symbol.description}`)
    }
    case "String":
      return make(S.string, (a) => JSON.stringify(a))
    case "Number":
      return make(S.number, (a) => JSON.stringify(a))
    case "Boolean":
      return make(S.boolean, (a) => JSON.stringify(a))
    case "Of":
      return make(S.make(meta), (a) => JSON.stringify(a))
    case "Tuple": {
      const components: ReadonlyArray<Show<unknown>> = meta.components.map(go)
      return make(S.make(meta), (tuple: ReadonlyArray<unknown>) =>
        "[" +
        tuple.map((c, i) =>
          i < components.length ?
            components[i].show(c) :
            O.isSome(meta.restElement) ?
            go(meta.restElement.value).show(c) :
            ""
        ).join(
          ","
        ) + "]")
    }
    case "Union": {
      const members = meta.members.map(go)
      const guards = meta.members.map((member) => G.unsafeGuardFor(S.make(member)))
      return make(S.make(meta), (a) => {
        const index = guards.findIndex((guard) => guard.is(a))
        return members[index].show(a)
      })
    }
    case "Struct": {
      const fields = meta.fields.map((field) => go(field.value))
      return make(
        S.make(meta),
        (a: { [_: PropertyKey]: unknown }) =>
          `{${
            meta.fields.map((field, i) =>
              `${JSON.stringify(field.key)}:${fields[i].show(a[field.key])}`
            )
              .join(",")
          }}`
      )
    }
    case "IndexSignature": {
      const value = go(meta.value)
      return make(
        S.make(meta),
        (a) =>
          `{${
            Object.keys(a).map((key) => `${JSON.stringify(key)}:${value.show(a[key])}`).join(",")
          }}`
      )
    }
    case "Array": {
      const item = go(meta.item)
      return make(
        S.make(meta),
        (a: ReadonlyArray<unknown>) =>
          "[" + a.map((elem) => item.show(elem)).join(",") +
          "]"
      )
    }
    case "Lazy":
      return lazy(meta.symbol, () => go(meta.f()))
  }
})

/**
 * @since 1.0.0
 */
export const unsafeShowFor = <A>(schema: Schema<A>): Show<A> => go(schema.meta)
