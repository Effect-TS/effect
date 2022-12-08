/**
 * @since 1.0.0
 */

import { identity, pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import type * as AST from "@fp-ts/schema/AST"
import type { Guard } from "@fp-ts/schema/Guard"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface Encoder<S, A> extends Schema<A> {
  readonly encode: (value: A) => S
}

/**
 * @since 1.0.0
 */
export const EncoderId = I.EncoderId

/**
 * @since 1.0.0
 */
export const make: <S, A>(schema: Schema<A>, encode: Encoder<S, A>["encode"]) => Encoder<S, A> =
  I.makeEncoder

/**
 * @since 1.0.0
 */
export const provideEncoderFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Encoder<unknown, A> => {
    const go = (ast: AST.AST): Encoder<unknown, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.findHandler(I.EncoderId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Encoder compiler, data type ${String(ast.id.description)}`
          )
        }
        case "LiteralType":
          return _literal(ast.literal)
        case "Tuple":
          return _tuple(
            ast,
            ast.components.map((c) => go(c.value)),
            pipe(ast.restElement, O.map(go))
          )
        case "Struct":
          return _struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.indexSignatures.string, O.map((is) => go(is.value))),
            pipe(ast.indexSignatures.symbol, O.map((is) => go(is.value)))
          )
        case "Union":
          return _union(ast, ast.members.map((m) => [G.guardFor(I.makeSchema(m)), go(m)]))
        case "Lazy":
          return _lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const encoderFor: <A>(schema: Schema<A>) => Encoder<unknown, A> = provideEncoderFor(
  P.empty
)

const _literal = <Literal extends AST.Literal>(
  value: Literal
): Encoder<Literal, Literal> => make(I.literal(value), identity)

const _tuple = (
  ast: AST.Tuple,
  components: ReadonlyArray<Encoder<any, any>>,
  oRestElement: Option<Encoder<any, any>>
): Encoder<any, any> =>
  make(
    I.makeSchema(ast),
    (input: ReadonlyArray<unknown>) => {
      const output: Array<any> = []
      let i = 0
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      for (; i < components.length; i++) {
        // ---------------------------------------------
        // handle optional components
        // ---------------------------------------------
        if (ast.components[i].optional && input[i] === undefined) {
          if (i < input.length) {
            output[i] = undefined
          }
        } else {
          const encoder = components[i]
          output[i] = encoder.encode(input[i])
        }
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRestElement)) {
        const encoder = oRestElement.value
        for (; i < input.length; i++) {
          output[i] = encoder.encode(input[i])
        }
      }

      return output
    }
  )

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Encoder<any, any>>,
  oStringIndexSignature: Option<Encoder<any, any>>,
  oSymbolIndexSignature: Option<Encoder<any, any>>
): Encoder<any, any> =>
  make(
    I.makeSchema(ast),
    (input: { readonly [_: string | symbol]: unknown }) => {
      const output: any = {}
      const fieldKeys: any = {}
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const key = ast.fields[i].key
        fieldKeys[key] = null
        // ---------------------------------------------
        // handle optional fields
        // ---------------------------------------------
        const optional = ast.fields[i].optional
        if (optional) {
          if (!Object.prototype.hasOwnProperty.call(input, key)) {
            continue
          }
          if (input[key] === undefined) {
            output[key] = undefined
            continue
          }
        }
        // ---------------------------------------------
        // handle required fields
        // ---------------------------------------------
        const encoder = fields[i]
        output[key] = encoder.encode(input[key])
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature)) {
        const encoder = oStringIndexSignature.value
        for (const key of Object.keys(input)) {
          if (!(key in fieldKeys)) {
            output[key] = encoder.encode(input[key])
          }
        }
      }
      if (O.isSome(oSymbolIndexSignature)) {
        const encoder = oSymbolIndexSignature.value
        for (const key of Object.getOwnPropertySymbols(input)) {
          if (!(key in fieldKeys)) {
            output[key] = encoder.encode(input[key])
          }
        }
      }

      return output
    }
  )

const _union = (
  ast: AST.Union,
  members: ReadonlyArray<readonly [Guard<any>, Encoder<any, any>]>
): Encoder<any, any> =>
  make(I.makeSchema(ast), (a) => {
    const index = members.findIndex(([guard]) => guard.is(a))
    return members[index][1].encode(a)
  })

const _lazy = <S, A>(
  f: () => Encoder<S, A>
): Encoder<S, A> => {
  const get = I.memoize<void, Encoder<S, A>>(f)
  const schema = I.lazy(f)
  return make(
    schema,
    (a) => get().encode(a)
  )
}
