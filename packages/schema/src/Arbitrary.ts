/**
 * @since 1.0.0
 */

import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"
import * as AST from "@effect/schema/AST"
import * as I from "@effect/schema/internal/common"
import type { Schema } from "@effect/schema/Schema"
import type * as FastCheck from "fast-check"

/**
 * @category model
 * @since 1.0.0
 */
export interface Arbitrary<A> {
  (fc: typeof FastCheck): FastCheck.Arbitrary<A>
}

/**
 * @category hooks
 * @since 1.0.0
 */
export const ArbitraryHookId = I.ArbitraryHookId

/**
 * @category arbitrary
 * @since 1.0.0
 */
export const to = <I, A>(
  schema: Schema<I, A>
): (fc: typeof FastCheck) => FastCheck.Arbitrary<A> => go(schema.ast)

/**
 * @category arbitrary
 * @since 1.0.0
 */
export const from = <I, A>(
  schema: Schema<I, A>
): (fc: typeof FastCheck) => FastCheck.Arbitrary<I> => go(AST.getFrom(schema.ast))

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

const getHook = AST.getAnnotation<
  (...args: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
>(ArbitraryHookId)

const go = I.memoize((ast: AST.AST): Arbitrary<any> => {
  switch (ast._tag) {
    case "Declaration":
      return pipe(
        getHook(ast),
        O.match(
          () => go(ast.type),
          (handler) => handler(...ast.typeParameters.map(go))
        )
      )
    case "Literal":
      return (fc) => fc.constant(ast.literal)
    case "UniqueSymbol":
      return (fc) => fc.constant(ast.symbol)
    case "UndefinedKeyword":
      return (fc) => fc.constant(undefined)
    case "VoidKeyword":
      return (fc) => fc.constant(undefined)
    case "NeverKeyword":
      return () => {
        throw new Error("cannot build an Arbitrary for `never`")
      }
    case "UnknownKeyword":
      return (fc) => fc.anything()
    case "AnyKeyword":
      return (fc) => fc.anything()
    case "StringKeyword":
      return (fc) => fc.string()
    case "NumberKeyword":
      return (fc) => fc.float()
    case "BooleanKeyword":
      return (fc) => fc.boolean()
    case "BigIntKeyword":
      return (fc) => fc.bigInt()
    case "SymbolKeyword":
      return (fc) => fc.string().map((s) => Symbol.for(s))
    case "ObjectKeyword":
      return (fc) => fc.oneof(fc.object(), fc.array(fc.anything()))
    case "TemplateLiteral": {
      return (fc) => {
        const components = [fc.constant(ast.head)]
        for (const span of ast.spans) {
          components.push(fc.string({ maxLength: 5 }))
          components.push(fc.constant(span.literal))
        }
        return fc.tuple(...components).map((spans) => spans.join(""))
      }
    }
    case "Tuple": {
      const elements = ast.elements.map((e) => go(e.type))
      const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
      return (fc) => {
        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        let output = fc.tuple(...elements.map((arb) => arb(fc)))
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
            fc.array(head(fc), { maxLength: 5 }).map((rest) => [...as, ...rest])
          )
          // ---------------------------------------------
          // handle post rest elements
          // ---------------------------------------------
          for (let j = 0; j < tail.length; j++) {
            output = output.chain((as) => tail[j](fc).map((a) => [...as, a]))
          }
        }

        return output
      }
    }
    case "TypeLiteral": {
      const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
      const indexSignatures = ast.indexSignatures.map((is) =>
        [go(is.parameter), go(is.type)] as const
      )
      return (fc) => {
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
          arbs[name] = propertySignaturesTypes[i](fc)
        }
        let output = fc.record<any, any>(arbs, { requiredKeys })
        // ---------------------------------------------
        // handle index signatures
        // ---------------------------------------------
        for (let i = 0; i < indexSignatures.length; i++) {
          const parameter = indexSignatures[i][0](fc)
          const type = indexSignatures[i][1](fc)
          output = output.chain((o) => {
            return record(fc, parameter, type).map((d) => ({ ...d, ...o }))
          })
        }

        return output
      }
    }
    case "Union": {
      const types = ast.types.map(go)
      return (fc) => fc.oneof(...types.map((arb) => arb(fc)))
    }
    case "Lazy":
      return pipe(
        getHook(ast),
        O.match(
          () => {
            const f = () => go(ast.f())
            const get = I.memoize<typeof f, Arbitrary<any>>(f)
            return (fc) => fc.constant(null).chain(() => get(f)(fc))
          },
          (handler) => handler()
        )
      )
    case "Enums": {
      if (ast.enums.length === 0) {
        throw new Error("cannot build an Arbitrary for an empty enum")
      }
      return (fc) => fc.oneof(...ast.enums.map(([_, value]) => fc.constant(value)))
    }
    case "Refinement": {
      const from = go(ast.from)
      return pipe(
        getHook(ast),
        O.match(
          () => (fc) => from(fc).filter((a) => E.isRight(ast.decode(a))),
          (handler) => handler(from)
        )
      )
    }
    case "Transform":
      return go(ast.to)
  }
})
