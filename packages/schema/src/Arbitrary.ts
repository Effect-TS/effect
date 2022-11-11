/**
 * @since 1.0.0
 */
import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import type * as FastCheck from "fast-check"

/**
 * @since 1.0.0
 */
export interface Arbitrary<A> {
  readonly A: A
  readonly arbitrary: (fc: typeof FastCheck) => FastCheck.Arbitrary<A>
}

/**
 * @since 1.0.0
 */
export const make = <A>(arbitrary: Arbitrary<A>["arbitrary"]): Arbitrary<A> =>
  ({ arbitrary }) as any

/**
 * @since 1.0.0
 */
export const arbitraryFor = <P>(
  ctx: C.Context<P>
): <A>(schema: Schema<P, A>) => Arbitrary<A> => {
  const f = (meta: Meta): Arbitrary<any> => {
    switch (meta._tag) {
      case "Tag": {
        const service = pipe(ctx, C.unsafeGet(meta.tag))
        return service.arbitrary(meta.metas.map(f))
      }
      case "String":
        return make((fc) => {
          let out = fc.string()
          if (meta.minLength !== undefined) {
            const minLength = meta.minLength
            out = out.filter((s) => s.length >= minLength)
          }
          if (meta.maxLength !== undefined) {
            const maxLength = meta.maxLength
            out = out.filter((s) => s.length <= maxLength)
          }
          return out
        })
      case "Number":
        return make((fc) => {
          let out = fc.float()
          if (meta.minimum !== undefined) {
            const minimum = meta.minimum
            out = out.filter((n) => n >= minimum)
          }
          if (meta.maximum !== undefined) {
            const maximum = meta.maximum
            out = out.filter((n) => n <= maximum)
          }
          return out
        })
      case "Boolean":
        return make((fc) => fc.boolean())
      case "Literal":
        return make((fc) => fc.constant(meta.literal))
      case "Tuple": {
        const arbs = meta.components.map(f)
        return make((fc) => fc.tuple(...arbs.map((arb) => arb.arbitrary(fc))))
      }
      case "Union": {
        const arbs = meta.members.map(f)
        return make((fc) => fc.oneof(...arbs.map((arb) => arb.arbitrary(fc))))
      }
      case "Struct": {
        const arbs = meta.fields.map((field) => f(field.value))
        return make((fc) => {
          const fields = {}
          arbs.forEach((arb, i) => {
            fields[meta.fields[i].key] = arb.arbitrary(fc)
          })
          return fc.record(fields)
        })
      }
      case "IndexSignature": {
        const arb = f(meta.value)
        return make((fc) => fc.dictionary(fc.string(), arb.arbitrary(fc)))
      }
      case "Array": {
        const arb = f(meta.item)
        return make((fc) => fc.array(arb.arbitrary(fc)))
      }
    }
  }
  return f
}
