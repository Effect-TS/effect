/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import type * as AST from "@fp-ts/schema/AST"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"
import type * as FastCheck from "fast-check"

/**
 * @category model
 * @since 1.0.0
 */
export interface Arbitrary<A> extends Schema<A> {
  readonly arbitrary: (fc: typeof FastCheck) => FastCheck.Arbitrary<A>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, arbitrary: Arbitrary<A>["arbitrary"]) => Arbitrary<A> =
  I.makeArbitrary

const record = <K extends PropertyKey, V>(
  fc: typeof FastCheck,
  key: FastCheck.Arbitrary<K>,
  value: FastCheck.Arbitrary<V>
): FastCheck.Arbitrary<{ readonly [k in K]: V }> =>
  fc.array(fc.tuple(key, value), { maxLength: 10 }).map((tuples) => {
    const out: { [k in K]: V } = {} as any
    for (const [k, v] of tuples) {
      out[k] = v
    }
    return out
  })

const getTypeAliasHook = H.getTypeAliasHook<H.TypeAliasHook<Arbitrary<any>>>(
  H.ArbitraryTypeAliasHookId
)

/**
 * @since 1.0.0
 */
export const arbitraryFor = <A>(schema: Schema<A>): Arbitrary<A> => {
  const go = (ast: AST.AST): Arbitrary<any> => {
    switch (ast._tag) {
      case "TypeAlias":
        return pipe(
          getTypeAliasHook(ast),
          O.match(
            () => go(ast.type),
            ({ handler }) => handler(...ast.typeParameters.map(go))
          )
        )
      case "Literal":
        return make(I.makeSchema(ast), (fc) => fc.constant(ast.literal))
      case "UniqueSymbol":
        return make(I.makeSchema(ast), (fc) => fc.constant(ast.symbol))
      case "UndefinedKeyword":
        return make(I.makeSchema(ast), (fc) => fc.constant(undefined))
      case "VoidKeyword":
        return make(I.makeSchema(ast), (fc) => fc.constant(undefined))
      case "NeverKeyword":
        return make(I.makeSchema(ast), () => {
          throw new Error("cannot build an Arbitrary for `never`")
        }) as any
      case "UnknownKeyword":
        return make(I.makeSchema(ast), (fc) => fc.anything())
      case "AnyKeyword":
        return make(I.makeSchema(ast), (fc) => fc.anything())
      case "StringKeyword":
        return make(I.makeSchema(ast), (fc) => fc.string())
      case "NumberKeyword":
        return make(I.makeSchema(ast), (fc) => fc.float())
      case "BooleanKeyword":
        return make(I.makeSchema(ast), (fc) => fc.boolean())
      case "BigIntKeyword":
        return make(I.makeSchema(ast), (fc) => fc.bigInt())
      case "SymbolKeyword":
        return make(I.makeSchema(ast), (fc) => fc.string().map((s) => Symbol.for(s)))
      case "ObjectKeyword":
        return make(
          I.makeSchema(ast),
          (fc) => fc.oneof(fc.object(), fc.array(fc.anything()))
        )
      case "Tuple": {
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
        return make(
          I.makeSchema(ast),
          (fc) => {
            // ---------------------------------------------
            // handle elements
            // ---------------------------------------------
            let output = fc.tuple(...elements.map((e) => e.arbitrary(fc)))
            if (elements.length > 0 && O.isNone(rest)) {
              const firstOptionalIndex = ast.elements.findIndex((e) => e.isOptional)
              if (firstOptionalIndex !== -1) {
                output = output.chain((as) =>
                  fc.integer({ min: firstOptionalIndex, max: elements.length - 1 }).map((i) =>
                    as.slice(0, i)
                  )
                )
              }
            }

            // ---------------------------------------------
            // handle rest element
            // ---------------------------------------------
            if (O.isSome(rest)) {
              const head = RA.headNonEmpty(rest.value)
              const tail = RA.tailNonEmpty(rest.value)
              output = output.chain((as) =>
                fc.array(head.arbitrary(fc), { maxLength: 5 }).map((rest) => [...as, ...rest])
              )
              // ---------------------------------------------
              // handle post rest elements
              // ---------------------------------------------
              for (let j = 0; j < tail.length; j++) {
                output = output.chain((as) => tail[j].arbitrary(fc).map((a) => [...as, a]))
              }
            }

            return output
          }
        )
      }
      case "TypeLiteral": {
        const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
        const indexSignatures = ast.indexSignatures.map((is) =>
          [go(is.parameter), go(is.type)] as const
        )
        return make(
          I.makeSchema(ast),
          (fc) => {
            const arbs: any = {}
            const requiredKeys: Array<PropertyKey> = []
            // ---------------------------------------------
            // handle property signatures
            // ---------------------------------------------
            for (let i = 0; i < propertySignaturesTypes.length; i++) {
              const ps = ast.propertySignatures[i]
              const name = ps.name
              if (!ps.isOptional) {
                requiredKeys.push(name)
              }
              arbs[name] = propertySignaturesTypes[i].arbitrary(fc)
            }
            let output = fc.record<any, any>(arbs, { requiredKeys })
            // ---------------------------------------------
            // handle index signatures
            // ---------------------------------------------
            for (let i = 0; i < indexSignatures.length; i++) {
              const parameter = indexSignatures[i][0].arbitrary(fc)
              const type = indexSignatures[i][1].arbitrary(fc)
              output = output.chain((o) => {
                return record(fc, parameter, type).map((d) => ({ ...o, ...d }))
              })
            }

            return output
          }
        )
      }
      case "Union": {
        const types = ast.types.map(go)
        return make(
          I.makeSchema(ast),
          (fc) => fc.oneof(...types.map((c) => c.arbitrary(fc)))
        )
      }
      case "Lazy": {
        const f = () => go(ast.f())
        const get = I.memoize<void, Arbitrary<A>>(f)
        const schema = I.lazy(f)
        return make(
          schema,
          (fc) => fc.constant(null).chain(() => get().arbitrary(fc))
        )
      }
      case "Enums": {
        if (ast.enums.length === 0) {
          throw new Error("cannot build an Arbitrary for an empty enum")
        }
        return make(
          I.makeSchema(ast),
          (fc) => fc.oneof(...ast.enums.map(([_, value]) => fc.constant(value)))
        )
      }
      case "Refinement": {
        const type = go(ast.from)
        return make(
          I.makeSchema(ast),
          (fc) => type.arbitrary(fc).filter(ast.refinement)
        )
      }
      case "TemplateLiteral": {
        return make(
          I.makeSchema(ast),
          (fc) => {
            const components = [fc.constant(ast.head)]
            for (const span of ast.spans) {
              components.push(fc.string({ maxLength: 5 }))
              components.push(fc.constant(span.literal))
            }
            return fc.tuple(...components).map((spans) => spans.join(""))
          }
        )
      }
      case "Transform":
        return go(ast.to)
    }
  }

  return go(schema.ast)
}
