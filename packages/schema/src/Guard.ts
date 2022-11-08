/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import { make } from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export interface Guard<A> {
  readonly is: (input: unknown) => input is A
}

/**
 * @since 1.0.0
 */
export const guard = <A>(is: (input: unknown) => input is A): Guard<A> => ({ is })

/**
 * @since 1.0.0
 */
export const guardFor = <P extends string>(map: Record<P, any>) =>
  <E, A>(schema: Schema<P, E, A>): Guard<A> => {
    const dsl = schema.dsl
    switch (dsl._tag) {
      case "ConstructorDSL": {
        const constructor: (type: any) => any = map[dsl.name]
        return constructor(guardFor(map)(make(dsl.type)))
      }
      case "StringDSL":
        return guard<any>((input): input is string => typeof input === "string")
      case "NumberDSL":
        return guard<any>((input): input is number => typeof input === "number")
      case "UnionDSL": {
        const guards = dsl.members.map((dsl) => guardFor(map)(make(dsl)))
        return guard((input): input is any => guards.some((guard) => guard.is(input)))
      }
    }
    return null as any
  }
