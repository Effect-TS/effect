/**
 * @since 1.0.0
 */

import { unsafeGuardFor } from "@fp-ts/codec/Guard"
import type { Declarations, Meta } from "@fp-ts/codec/Meta"
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

/**
 * @since 1.0.0
 */
export const unsafeShowFor = (declarations: Declarations) =>
  <A>(schema: Schema<A>): Show<A> => {
    const f = (meta: Meta): Show<any> => {
      switch (meta._tag) {
        case "Apply": {
          const declaration = S.unsafeGet(meta.symbol)(declarations)
          if (declaration.showFor !== undefined) {
            return O.isSome(meta.config) ?
              declaration.showFor(meta.config.value, ...meta.metas.map(f)) :
              declaration.showFor(...meta.metas.map(f))
          }
          throw new Error(`Missing "showFor" declaration for ${meta.symbol.description}`)
        }
        case "Never":
          return make<never>(S.never, () => {
            throw new Error("never")
          }) as any
        case "Unknown":
          return make(S.unknown, (a) => JSON.stringify(a))
        case "Any":
          return make(S.any, (a) => JSON.stringify(a))
        case "String":
          return make(S.string, (a) => JSON.stringify(a))
        case "Number":
          return make(S.number, (a) => JSON.stringify(a))
        case "Boolean":
          return make(S.boolean, (a) => JSON.stringify(a))
        case "Of":
          return make(S.of(meta.value), (a) => JSON.stringify(a))
        case "Tuple": {
          const components: ReadonlyArray<Show<unknown>> = meta.components.map(f)
          return make(S.tuple(meta.readonly, ...components), (tuple: ReadonlyArray<unknown>) =>
            "[" +
            tuple.map((c, i) =>
              i < components.length ?
                components[i].show(c) :
                O.isSome(meta.restElement) ?
                f(meta.restElement.value).show(c) :
                ""
            ).join(
              ", "
            ) + "]")
        }
        case "Union": {
          const members: ReadonlyArray<Show<unknown>> = meta.members.map(f)
          const guards = meta.members.map((member) => unsafeGuardFor(S.make(member)))
          return make(S.union(...members), (a) => {
            const index = guards.findIndex((guard) => guard.is(a))
            return members[index].show(a)
          })
        }
        case "Struct": {
          const fields = meta.fields.map((field) => f(field.value))
          const schemas = {}
          meta.fields.forEach((field, i) => {
            schemas[field.key] = fields[i]
          })
          return make(S.struct(schemas), (a: { [_: PropertyKey]: unknown }) =>
            `{ ${
              meta.fields.map((field, i) =>
                `${String(field.key)}: ${fields[i].show(a[field.key])}`
              )
                .join(", ")
            } }`)
        }
        case "IndexSignature": {
          const value = f(meta.value)
          return make(S.indexSignature(value), (a) =>
            `{ ${
              Object.keys(a).map((key) => `${String(key)}: ${value.show(a[key])}`).join(", ")
            } }`)
        }
        case "Array": {
          const item = f(meta.item)
          return make(S.array(meta.readonly, item), (a: ReadonlyArray<unknown>) =>
            "[" + a.map((elem) =>
              item.show(elem)
            ).join(", ") + "]")
        }
        case "Lazy":
          return lazy(meta.symbol, () =>
            f(meta.f()))
      }
    }
    return f(schema.meta)
  }
