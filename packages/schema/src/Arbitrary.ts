/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as AST from "@fp-ts/schema/AST"
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
            P.findHandler(I.ArbitraryId, ast.id),
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
        case "UndefinedKeyword":
          return make(I._undefined, (fc) => fc.constant(undefined))
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
        case "OptionalType":
          return go(AST.union([AST.undefinedKeyword, ast.type]))
        case "Tuple":
          return _tuple(
            ast,
            ast.elements.map(go),
            pipe(ast.rest, O.map(go))
          )
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
        case "Lazy":
          return _lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const arbitraryFor: <A>(schema: Schema<A>) => Arbitrary<A> = provideArbitraryFor(P.empty)

const _tuple = (
  ast: AST.Tuple,
  elements: ReadonlyArray<Arbitrary<any>>,
  rest: O.Option<Arbitrary<any>>
): Arbitrary<any> =>
  make(
    I.makeSchema(ast),
    (fc) => {
      // ---------------------------------------------
      // handle elements
      // ---------------------------------------------
      let output = fc.tuple(...elements.map((c) => c.arbitrary(fc)))

      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(rest)) {
        output = output.chain((as) =>
          fc.array(rest.value.arbitrary(fc)).map((rest) => [...as, ...rest])
        )
      }

      return output
    }
  )

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
        if (!AST.isOptionalType(field.value)) {
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
