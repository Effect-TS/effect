/**
 * @since 1.0.0
 */

import type { DSL } from "@fp-ts/codec/DSL"
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
export const make = <A>(is: (input: unknown) => input is A): Guard<A> => ({ is })

/**
 * @since 1.0.0
 */
export const guardFor = <P>(ctx: C.Context<P>) => {
  const f = (dsl: DSL): Guard<any> => {
    switch (dsl._tag) {
      case "ConstructorDSL": {
        const service: any = pipe(ctx, C.get(dsl.tag as any))
        return service.guard(f(dsl.type))
      }
      case "StringDSL":
        return make((input): input is string => typeof input === "string")
      case "NumberDSL":
        return make((input): input is number => typeof input === "number")
      case "UnionDSL": {
        const guards = dsl.members.map((member) => f(member))
        return make((input): input is any => guards.some((guard) => guard.is(input)))
      }
    }
    return null as any
  }
  return <E, A>(schema: Schema<P, E, A>): Guard<A> => f(schema)
}
