/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
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
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.findHandler(I.ArbitraryId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Arbitrary compiler, data type ${String(ast.id.description)}`
          )
        }
        case "TypeAliasDeclaration":
          return pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.findHandler(I.ArbitraryId, ast.id),
            O.match(
              () => go(ast.type),
              (handler) => handler(...ast.typeParameters.map(go))
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
        case "Tuple":
          return _tuple(
            ast,
            ast.components.map((c) => go(c.value)),
            pipe(ast.rest, O.map(go))
          )
        case "Struct":
          return _struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.indexSignatures.string, O.map((is) => go(is.value))),
            pipe(ast.indexSignatures.symbol, O.map((is) => go(is.value)))
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
  components: ReadonlyArray<Arbitrary<any>>,
  oRest: O.Option<Arbitrary<any>>
): Arbitrary<any> =>
  make(
    I.makeSchema(ast),
    (fc) => {
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      let output = fc.tuple(...components.map((c, i) => {
        // ---------------------------------------------
        // handle optional components
        // ---------------------------------------------
        return ast.components[i].optional ?
          fc.oneof(fc.constant(undefined), c.arbitrary(fc)) :
          c.arbitrary(fc)
      }))

      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRest)) {
        output = output.chain((as) =>
          fc.array(oRest.value.arbitrary(fc)).map((rest) => [...as, ...rest])
        )
      }

      return output
    }
  )

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Arbitrary<any>>,
  oStringIndexSignature: O.Option<Arbitrary<any>>,
  oSymbolIndexSignature: O.Option<Arbitrary<any>>
): Arbitrary<any> =>
  make(
    I.makeSchema(ast),
    (fc) => {
      const arbs: any = {}
      const requiredKeys = []
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const field = ast.fields[i]
        const key = field.key
        const optional = field.optional
        if (optional) {
          // ---------------------------------------------
          // handle optional fields
          // ---------------------------------------------
          arbs[key] = fields[i].arbitrary(fc)
        } else {
          requiredKeys.push(key)
          // ---------------------------------------------
          // handle required fields
          // ---------------------------------------------
          arbs[key] = fields[i].arbitrary(fc)
        }
      }
      let output = fc.record<any, any>(arbs, { requiredKeys })
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature) || O.isSome(oSymbolIndexSignature)) {
        if (O.isSome(oStringIndexSignature)) {
          const arb = oStringIndexSignature.value.arbitrary(fc)
          output = output.chain((o) =>
            fc.dictionary(fc.string(), arb, { maxKeys: 10 }).map((d) => ({ ...o, ...d }))
          )
        }
        if (O.isSome(oSymbolIndexSignature)) {
          const arb = oSymbolIndexSignature.value.arbitrary(fc)
          output = output.chain((o) =>
            fc.dictionary(fc.string(), arb, { maxKeys: 10 }).map((d) => {
              const symbols: any = {}
              for (const s in d) {
                symbols[Symbol(s)] = d[s]
              }
              return ({ ...o, ...symbols })
            })
          )
        }
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
