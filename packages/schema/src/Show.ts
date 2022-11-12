/**
 * @since 1.0.0
 */

import { guardFor } from "@fp-ts/codec/Guard"
import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Show<A> {
  readonly show: (a: A) => string
}

/**
 * @since 1.0.0
 */
export const make = <A>(show: Show<A>["show"]): Show<A> => ({ show })

/**
 * @since 1.0.0
 */
export const empty: Show<unknown> = make(() => "")

/**
 * @since 1.0.0
 */
export const boolean: Show<boolean> = make((b) => JSON.stringify(b))

/**
 * @since 1.0.0
 */
export const showFor = (declarations: S.Declarations) =>
  <A>(schema: Schema<A>): Show<A> => {
    const g = guardFor(declarations)
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
        case "String":
        case "Number":
        case "Equal":
          return make((a) => JSON.stringify(a))
        case "Tuple": {
          const shows: ReadonlyArray<Show<unknown>> = meta.components.map(f)
          const restElement = pipe(meta.restElement, O.map(f), O.getOrElse(empty))
          return make((tuple: ReadonlyArray<unknown>) =>
            "[" +
            tuple.map((c, i) => i < shows.length ? shows[i].show(c) : restElement.show(c)).join(
              ", "
            ) + "]"
          )
        }
        case "Union": {
          const shows: ReadonlyArray<Show<unknown>> = meta.members.map(f)
          const guards = meta.members.map((member) => g(member as any))
          return make((a) => {
            const index = guards.findIndex((guard) => guard.is(a))
            return shows[index].show(a)
          })
        }
        case "Struct": {
          const shows: ReadonlyArray<Show<unknown>> = meta.fields.map((field) => f(field.value))
          return make((a: { [_: PropertyKey]: unknown }) =>
            `{ ${
              meta.fields.map((field, i) => `${String(field.key)}: ${shows[i].show(a[field.key])}`)
                .join(", ")
            } }`
          )
        }
        case "IndexSignature": {
          const show = f(meta.value)
          return make((a) =>
            `{ ${Object.keys(a).map((key) => `${String(key)}: ${show.show(a[key])}`).join(", ")} }`
          )
        }
        case "Array": {
          const show = f(meta.item)
          return make((a: ReadonlyArray<unknown>) =>
            "[" + a.map((elem) => show.show(elem)).join(", ") + "]"
          )
        }
      }
    }
    return f(schema)
  }
