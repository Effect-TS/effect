/**
 * @since 1.0.0
 */

import * as G from "@fp-ts/codec/Guard"
import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
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
      const fields = {}
      for (const field of meta.fields) {
        fields[field.key] = go(field.value)
      }
      const oIndexSignature = pipe(meta.indexSignature, O.map((is) => go(is.value)))
      return make(
        S.make(meta),
        (struct: { [_: PropertyKey]: unknown }) => {
          const keys = Object.keys(struct)
          let out = "{"
          for (const key of keys) {
            if (key in fields) {
              out += `${JSON.stringify(key)}:${fields[key].show(struct[key])},`
            }
          }
          if (O.isSome(oIndexSignature)) {
            const indexSignature = oIndexSignature.value
            for (const key of keys) {
              if (!(key in fields)) {
                out += `${JSON.stringify(key)}:${indexSignature.show(struct[key])},`
              }
            }
          }
          out = out.substring(0, out.length - 1)
          out += "}"
          return out
        }
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
