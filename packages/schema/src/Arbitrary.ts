/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"
import type * as AST from "@fp-ts/schema/AST"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import type * as FastCheck from "fast-check"

/**
 * @since 1.0.0
 */
export const ArbitraryId = I.ArbitraryId

/**
 * @since 1.0.0
 */
export interface Arbitrary<A> extends Schema<A> {
  readonly arbitrary: (fc: typeof FastCheck) => FastCheck.Arbitrary<A>
}

/**
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, arbitrary: Arbitrary<A>["arbitrary"]) => Arbitrary<A> =
  I.makeArbitrary

/**
 * @since 1.0.0
 */
export const provideArbitraryFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Arbitrary<A> => {
    const go = (ast: AST.AST): Arbitrary<any> => {
      switch (ast._tag) {
        case "TypeAliasDeclaration":
          return pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.find(I.ArbitraryId, ast.id),
            O.match(
              () => go(ast.type),
              (handler) =>
                O.isSome(ast.config) ?
                  handler(ast.config.value)(...ast.typeParameters.map(go)) :
                  handler(...ast.typeParameters.map(go))
            )
          )
        case "LiteralType":
          return make(I.makeSchema(ast), (fc) => fc.constant(ast.literal))
        case "UniqueSymbol":
          return make(I.makeSchema(ast), (fc) => fc.constant(ast.symbol))
        case "UndefinedKeyword":
          return make(I._undefined, (fc) => fc.constant(undefined))
        case "VoidKeyword":
          return make(I._void, (fc) => fc.constant(undefined))
        case "NeverKeyword":
          return make(I.never, () => {
            throw new Error("cannot build an Arbitrary for `never`")
          }) as any
        case "UnknownKeyword":
          return make(I.unknown, (fc) => fc.anything())
        case "AnyKeyword":
          return make(I.any, (fc) => fc.anything())
        case "StringKeyword":
          return make(I.string, (fc) => fc.string())
        case "NumberKeyword":
          return make(I.number, (fc) => fc.float())
        case "BooleanKeyword":
          return make(I.boolean, (fc) => fc.boolean())
        case "BigIntKeyword":
          return make(I.bigint, (fc) => fc.bigInt())
        case "SymbolKeyword":
          return make(I.symbol, (fc) => fc.string().map((s) => Symbol.for(s)))
        case "Tuple": {
          const elements = ast.elements.map((e) => go(e.type))
          const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
          return make(
            I.makeSchema(ast),
            (fc) => {
              // ---------------------------------------------
              // handle elements
              // ---------------------------------------------
              let output = fc.tuple(...elements.map((c) => c.arbitrary(fc)))
              if (elements.length > 0) {
                const optionalIndex = ast.elements.findIndex((e) => e.isOptional)
                if (optionalIndex !== -1) {
                  output = output.chain((as) =>
                    fc.integer({ min: optionalIndex, max: elements.length - 1 }).map((i) => {
                      return ast.elements[i].isOptional ? as.slice(0, i - 1) : as
                    })
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
                  fc.array(head.arbitrary(fc)).map((rest) => [...as, ...rest])
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
        case "Struct":
          return _struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            ast.indexSignatures.map((is) => go(is.value))
          )
        case "Union": {
          const members = ast.members.map(go)
          return make(
            I.makeSchema(ast),
            (fc) => fc.oneof(...members.map((c) => c.arbitrary(fc)))
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
        case "Lazy":
          return _lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const arbitraryFor: <A>(schema: Schema<A>) => Arbitrary<A> = provideArbitraryFor(P.empty())

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Arbitrary<any>>,
  indexSignatures: ReadonlyArray<Arbitrary<any>>
): Arbitrary<any> =>
  make(
    I.makeSchema(ast),
    (fc) => {
      const arbs: any = {}
      const requiredKeys: Array<PropertyKey> = []
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const field = ast.fields[i]
        const key = field.key
        if (!field.isOptional) {
          requiredKeys.push(key)
        }
        arbs[key] = fields[i].arbitrary(fc)
      }
      let output = fc.record<any, any>(arbs, { requiredKeys })
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      for (let i = 0; i < indexSignatures.length; i++) {
        const key = ast.indexSignatures[i].key
        const value = indexSignatures[i].arbitrary(fc)
        output = output.chain((o) => {
          if (key === "string") {
            return fc.dictionary(fc.string(), value, { maxKeys: 10 }).map((d) => ({ ...o, ...d }))
          } else if (key === "symbol") {
            return fc.dictionary(fc.string(), value, { maxKeys: 10 }).map((d) => {
              const sd = {}
              for (const s in d) {
                sd[Symbol(s)] = d[s]
              }
              return ({ ...o, ...sd })
            })
          } else {
            return fc.dictionary(fc.integer().map(String), value, { maxKeys: 10 }).map((d) => {
              const nd = {}
              for (const s in d) {
                nd[Number(s)] = d[s]
              }
              return ({ ...o, ...nd })
            })
          }
        })
      }

      return output
    }
  )

const _lazy = <A>(
  f: () => Arbitrary<A>
): Arbitrary<A> => {
  const get = I.memoize<void, Arbitrary<A>>(f)
  const schema = I.lazy(f)
  return make(
    schema,
    (fc) => fc.constant(null).chain(() => get().arbitrary(fc))
  )
}
