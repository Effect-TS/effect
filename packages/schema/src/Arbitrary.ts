/**
 * @since 1.0.0
 */

import type { AST } from "@fp-ts/codec/AST"
import * as I from "@fp-ts/codec/internal/common"
import type { Provider } from "@fp-ts/codec/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
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
export const lazy = <A>(
  f: () => Arbitrary<A>
): Arbitrary<A> => {
  const get = S.memoize<void, Arbitrary<A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (fc) => get().arbitrary(fc)
  )
}

/**
 * @since 1.0.0
 */
export const provideUnsafeArbitraryFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Arbitrary<A> => {
    const go = (ast: AST): Arbitrary<any> => {
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
            `Missing support for Arbitrary interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return make(S.make(ast), (fc) => fc.constant(ast.value))
        case "Tuple": {
          const components = ast.components.map(go)
          const restElement = pipe(ast.restElement, O.map(go))
          if (O.isSome(restElement)) {
            return make(
              S.make(ast),
              (fc) =>
                fc.tuple(...components.map((c) => c.arbitrary(fc))).chain((as) =>
                  fc.array(restElement.value.arbitrary(fc)).map((rest) => [...as, ...rest])
                )
            )
          }
          return make(
            S.make(ast),
            (fc) => fc.tuple(...components.map((c) => c.arbitrary(fc)))
          )
        }
        case "Union": {
          const members = ast.members.map(go)
          return make(
            S.make(ast),
            (fc) => fc.oneof(...members.map((c) => c.arbitrary(fc)))
          )
        }
        case "Struct": {
          const fields = ast.fields.map((field) => go(field.value))
          return make(
            S.make(ast),
            (fc) => {
              const arbs: any = {}
              for (let i = 0; i < fields.length; i++) {
                arbs[ast.fields[i].key] = fields[i].arbitrary(fc)
              }
              return fc.record(arbs)
            }
          )
        }
        case "Lazy":
          return lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const unsafeArbitraryFor: <A>(schema: Schema<A>) => Arbitrary<A> = provideUnsafeArbitraryFor(
  empty
)
