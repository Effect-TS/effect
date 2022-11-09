/**
 * @since 1.0.0
 */

import type { DSL, Literal } from "@fp-ts/codec/DSL"
import { guardFor } from "@fp-ts/codec/Guard"
import type { Schema } from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

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
export const showFor = <P>(ctx: C.Context<P>): <E, A>(schema: Schema<P, E, A>) => Show<A> => {
  const g = guardFor(ctx)
  const f = (dsl: DSL): Show<any> => {
    switch (dsl._tag) {
      case "ConstructorDSL": {
        const service: any = pipe(ctx, C.get(dsl.tag as any))
        return make((a) => service.show(f(dsl.type)).show(a))
      }
      case "StringDSL":
        return make((a) => JSON.stringify(a))
      case "NumberDSL":
        return make((a) => JSON.stringify(a))
      case "BooleanDSL":
        return make((a) => JSON.stringify(a))
      case "LiteralDSL":
        return make((literal: Literal) => JSON.stringify(literal))
      case "TupleDSL": {
        const shows: ReadonlyArray<Show<unknown>> = dsl.components.map(f)
        return make((tuple: ReadonlyArray<unknown>) =>
          "[" + tuple.map((c, i) => shows[i].show(c)).join(", ") + "]"
        )
      }
      case "UnionDSL": {
        const shows: ReadonlyArray<Show<unknown>> = dsl.members.map(f)
        const guards = dsl.members.map((member) => g(member as any))
        return make((a) => {
          const index = guards.findIndex((guard) => guard.is(a))
          return shows[index].show(a)
        })
      }
      case "StructDSL": {
        const shows: ReadonlyArray<Show<unknown>> = dsl.fields.map((field) => f(field.value))
        return make((a: { [_: PropertyKey]: unknown }) =>
          `{ ${
            dsl.fields.map((field, i) => `${String(field.key)}: ${shows[i].show(a[field.key])}`)
              .join(", ")
          } }`
        )
      }
      case "IndexSignatureDSL": {
        const show = f(dsl.value)
        return make((a) =>
          `{ ${Object.keys(a).map((key) => `${String(key)}: ${show.show(a[key])}`).join(", ")} }`
        )
      }
      case "ArrayDSL": {
        const show = f(dsl.item)
        return make((a: ReadonlyArray<unknown>) =>
          "[" + a.map((elem) => show.show(elem)).join(", ") + "]"
        )
      }
    }
  }
  return f
}
