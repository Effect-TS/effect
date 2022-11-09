/**
 * @since 1.0.0
 */
import type { DSL } from "@fp-ts/codec/DSL"
import type { Schema } from "@fp-ts/codec/Schema"
import type * as C from "@fp-ts/data/Context"
import type * as FastCheck from "fast-check"

/**
 * @since 1.0.0
 */
export interface Arbitrary<A> {
  readonly arbitrary: (fc: typeof FastCheck) => FastCheck.Arbitrary<A>
}

/**
 * @since 1.0.0
 */
export const make = <A>(arbitrary: Arbitrary<A>["arbitrary"]): Arbitrary<A> => ({ arbitrary })

/**
 * @since 1.0.0
 */
export const arbitraryFor = <P>(
  _ctx: C.Context<P>
): <E, A>(schema: Schema<P, E, A>) => Arbitrary<A> => {
  const f = (dsl: DSL): Arbitrary<any> => {
    switch (dsl._tag) {
      case "StringDSL":
        return make((fc) => fc.string())
      case "NumberDSL":
        return make((fc) => fc.float())
      case "BooleanDSL":
        return make((fc) => fc.boolean())
      case "LiteralDSL":
        return make((fc) => fc.constant(dsl.literal))
      case "TupleDSL": {
        const arbs = dsl.components.map(f)
        return make((fc) => fc.tuple(...arbs.map((arb) => arb.arbitrary(fc))))
      }
      case "UnionDSL": {
        const arbs = dsl.members.map(f)
        return make((fc) => fc.oneof(...arbs.map((arb) => arb.arbitrary(fc))))
      }
      case "StructDSL": {
        const arbs = dsl.fields.map((field) => f(field.value))
        return make((fc) => {
          const fields = {}
          arbs.forEach((arb, i) => {
            fields[dsl.fields[i].key] = arb.arbitrary(fc)
          })
          return fc.record(fields)
        })
      }
      case "IndexSignatureDSL": {
        const arb = f(dsl.value)
        return make((fc) => fc.dictionary(fc.string(), arb.arbitrary(fc)))
      }
      case "ArrayDSL": {
        const arb = f(dsl.item)
        return make((fc) => fc.array(arb.arbitrary(fc)))
      }
    }
    throw new Error(`Unhandled ${dsl._tag}`)
  }
  return f
}
