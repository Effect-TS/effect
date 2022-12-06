/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type * as AST from "@fp-ts/schema/AST"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"
import type * as FastCheck from "fast-check"

/**
 * @since 1.0.0
 */
export const ArbitraryId = I.ArbitraryId

/**
 * @since 1.0.0
 */
export interface Arbitrary<in out A> extends S.Schema<A> {
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
            Semigroup.combine(provider),
            findHandler(I.ArbitraryId, ast.id)
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
        case "Of":
          return make(S.make(ast), (fc) => fc.constant(ast.value))
        case "Tuple":
          return _tuple(ast, ast.components.map(go), pipe(ast.restElement, O.map(go)))
        case "Union": {
          const members = ast.members.map(go)
          return make(
            S.make(ast),
            (fc) => fc.oneof(...members.map((c) => c.arbitrary(fc)))
          )
        }
        case "Struct":
          return _struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.stringIndexSignature, O.map((is) => go(is.value))),
            pipe(ast.symbolIndexSignature, O.map((is) => go(is.value)))
          )
        case "Lazy":
          return _lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const arbitraryFor: <A>(schema: Schema<A>) => Arbitrary<A> = provideArbitraryFor(
  empty
)

// ---------------------------------------------
// internal
// ---------------------------------------------

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Arbitrary<any>>,
  oStringIndexSignature: O.Option<Arbitrary<any>>,
  oSymbolIndexSignature: O.Option<Arbitrary<any>>
): Arbitrary<any> =>
  make(
    S.make(ast),
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

const _tuple = (
  ast: AST.Tuple,
  components: ReadonlyArray<Arbitrary<any>>,
  oRestElement: O.Option<Arbitrary<any>>
): Arbitrary<any> =>
  make(
    S.make(ast),
    (fc) => {
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      let output = fc.tuple(...components.map((c) => c.arbitrary(fc)))

      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRestElement)) {
        output = output.chain((as) =>
          fc.array(oRestElement.value.arbitrary(fc)).map((rest) => [...as, ...rest])
        )
      }

      return output
    }
  )

const _lazy = <A>(
  f: () => Arbitrary<A>
): Arbitrary<A> => {
  const get = I.memoize<void, Arbitrary<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (fc) => fc.constant(null).chain(() => get().arbitrary(fc))
  )
}
