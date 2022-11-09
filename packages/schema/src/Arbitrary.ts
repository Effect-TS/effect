/**
 * @since 1.0.0
 */
import type { Meta } from "@fp-ts/codec/Meta"
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
  const f = (dsl: Meta): Arbitrary<any> => {
    switch (dsl._tag) {
      case "String":
        return make((fc) => fc.string())
      case "Number":
        return make((fc) => fc.float())
      case "Boolean":
        return make((fc) => fc.boolean())
      case "Literal":
        return make((fc) => fc.constant(dsl.literal))
      case "Tuple": {
        const arbs = dsl.components.map(f)
        return make((fc) => fc.tuple(...arbs.map((arb) => arb.arbitrary(fc))))
      }
      case "Union": {
        const arbs = dsl.members.map(f)
        return make((fc) => fc.oneof(...arbs.map((arb) => arb.arbitrary(fc))))
      }
      case "Struct": {
        const arbs = dsl.fields.map((field) => f(field.value))
        return make((fc) => {
          const fields = {}
          arbs.forEach((arb, i) => {
            fields[dsl.fields[i].key] = arb.arbitrary(fc)
          })
          return fc.record(fields)
        })
      }
      case "IndexSignature": {
        const arb = f(dsl.value)
        return make((fc) => fc.dictionary(fc.string(), arb.arbitrary(fc)))
      }
      case "Array": {
        const arb = f(dsl.item)
        return make((fc) => fc.array(arb.arbitrary(fc)))
      }
    }
    throw new Error(`Unhandled ${dsl._tag}`)
  }
  return f
}
