/**
 * @since 1.0.0
 */

import type { DSL, Literal } from "@fp-ts/codec/DSL"
import type { Schema } from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * @since 1.0.0
 */
export interface Guard<A> {
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export const make = <A>(is: Guard<A>["is"]): Guard<A> => ({ is })

/**
 * @since 1.0.0
 */
export const guardFor = <P>(ctx: C.Context<P>): <E, A>(schema: Schema<P, E, A>) => Guard<A> => {
  const f = (dsl: DSL): Guard<any> => {
    switch (dsl._tag) {
      case "ConstructorDSL": {
        const service: any = pipe(ctx, C.get(dsl.tag as any))
        return service.is(f(dsl.type))
      }
      case "StringDSL":
        return make((a): a is string => typeof a === "string")
      case "NumberDSL":
        return make((a): a is number => typeof a === "number")
      case "BooleanDSL":
        return make((a): a is boolean => typeof a === "boolean")
      case "LiteralDSL":
        return make((a): a is Literal => a === dsl.literal)
      case "TupleDSL": {
        const guards: ReadonlyArray<Guard<unknown>> = dsl.components.map(f)
        return make((a: unknown): a is ReadonlyArray<unknown> =>
          Array.isArray(a) &&
          guards.every((guard, i) => guard.is(a[i]))
        )
      }
      case "UnionDSL": {
        const guards = dsl.members.map(f)
        return make((a: unknown): a is unknown => guards.some((guard) => guard.is(a)))
      }
      case "StructDSL": {
        const guards = dsl.fields.map((field) => f(field.value))
        return make((a: unknown): a is any =>
          typeof a === "object" && a != null &&
          guards.every((guard, i) => guard.is(a[dsl.fields[i].key]))
        )
      }
      case "IndexSignatureDSL": {
        const guard = f(dsl.value)
        return make((a: unknown): a is any =>
          typeof a === "object" && a != null && Object.keys(a).every((key) => guard.is(a[key]))
        )
      }
      case "ArrayDSL": {
        const guard = f(dsl.item)
        return make((a: unknown): a is any => Array.isArray(a) && a.every((elem) => guard.is(elem)))
      }
    }
  }
  return f
}
