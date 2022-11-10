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
      case "Constructor": {
        const service = pipe(ctx, C.get(meta.tag as any)) as any
        return service.arbitrary(meta.metas.map(f))
      }
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
      case "Refinement": {
        const arb = f(meta.meta)
        return make((fc) => arb.arbitrary(fc).filter(meta.refinement))
      }
      case "JSONSchema": {
        const schema = meta.schema
        switch (schema.type) {
          case "string":
            return make((fc) => fc.string())
          case "number":
            return make((fc) => fc.float())
          case "boolean":
            return make((fc) => fc.boolean())
        }
      }
    }
  }
  return f
}
