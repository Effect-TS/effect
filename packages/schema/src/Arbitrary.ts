/**
 * @since 1.0.0
 */
import type { Meta } from "@fp-ts/codec/Meta"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import type * as FastCheck from "fast-check"

/**
 * @since 1.0.0
 */
export interface Arbitrary<out A> {
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
export const boolean: Arbitrary<boolean> = make((fc) => fc.boolean())

S.addDeclaration(S.booleanSym, {
  arbitraryFor: () => boolean
})

/**
 * @since 1.0.0
 */
export const arbitraryFor = <A>(schema: Schema<A>): Arbitrary<A> => {
  const f = (meta: Meta): Arbitrary<any> => {
    switch (meta._tag) {
      case "Apply": {
        const declaration = S.getDeclaration(meta.symbol)
        if (declaration !== undefined && declaration.arbitraryFor != null) {
          return declaration.arbitraryFor(...meta.metas.map(f))
        }
        throw new Error(`Missing "arbitraryFor" declaration for ${meta.symbol.description}`)
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
      case "Equal":
        return make((fc) => fc.constant(meta.value))
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
  return f(schema)
}
