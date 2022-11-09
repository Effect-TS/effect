/**
 * @since 1.0.0
 */

import type { DSL } from "@fp-ts/codec/DSL"
import type { Schema } from "@fp-ts/codec/Schema"

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
export const guardFor = <P extends string>(map: Record<P, any>) => {
  const f = <A>(dsl: DSL): Guard<A> => {
    switch (dsl._tag) {
      case "ConstructorDSL": {
        const constructor = map[dsl.name]
        return constructor(f(dsl.type))
      }
      case "StringDSL":
        return make<any>((input): input is string => typeof input === "string")
      case "NumberDSL":
        return make<any>((input): input is number => typeof input === "number")
      case "UnionDSL": {
        const guards = dsl.members.map((member) => f(member))
        return make<any>((input): input is any => guards.some((guard) => guard.is(input)))
      }
    }
    return null as any
  }
  return <E, A>(schema: Schema<P, E, A>): Guard<A> => f(schema)
}
