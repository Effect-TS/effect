/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import type { These } from "@fp-ts/data/These"
import type * as AST from "@fp-ts/schema/AST"
import * as UnknownArray from "@fp-ts/schema/data/UnknownArray"
import * as UnknownObject from "@fp-ts/schema/data/UnknownObject"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface Decoder<in I, in out A> extends Schema<A> {
  readonly I: (_: I) => void
  readonly decode: (i: I) => These<NonEmptyReadonlyArray<DE.DecodeError>, A>
}

/**
 * @since 1.0.0
 */
export const DecoderId = I.DecoderId

/**
 * @since 1.0.0
 */
export const make: <S, A>(schema: Schema<A>, decode: Decoder<S, A>["decode"]) => Decoder<S, A> =
  I.makeDecoder

/**
 * @since 1.0.0
 */
export const success = I.success

/**
 * @since 1.0.0
 */
export const failure = I.failure

/**
 * @since 1.0.0
 */
export const failures = I.failures

/**
 * @since 1.0.0
 */
export const warning = I.warning

/**
 * @since 1.0.0
 */
export const warnings = I.warnings

/**
 * @since 1.0.0
 */
export const isSuccess = I.isSuccess

/**
 * @since 1.0.0
 */
export const isFailure = I.isFailure

/**
 * @since 1.0.0
 */
export const isWarning = I.isWarning

/**
 * @since 1.0.0
 */
export const provideDecoderFor = (provider: Provider) =>
  <A>(schema: Schema<A>): Decoder<unknown, A> => {
    const go = (ast: AST.AST): Decoder<unknown, any> => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.findHandler(I.DecoderId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for Decoder compiler, data type ${String(ast.id.description)}`
          )
        }
        case "Of":
          return _of(ast.value)
        case "Tuple":
          return pipe(
            UnknownArray.Decoder,
            I.compose(
              _tuple(ast, ast.components.map(go), pipe(ast.restElement, O.map(go)))
            )
          )
        case "Struct":
          return pipe(
            UnknownObject.Decoder,
            I.compose(
              _struct(
                ast,
                ast.fields.map((f) => go(f.value)),
                pipe(ast.stringIndexSignature, O.map((is) => go(is.value))),
                pipe(ast.symbolIndexSignature, O.map((is) => go(is.value)))
              )
            )
          )
        case "Union":
          return _union(ast, ast.members.map(go))
        case "Lazy":
          return _lazy(() => go(ast.f()))
      }
    }

    return go(schema.ast)
  }

/**
 * @since 1.0.0
 */
export const decoderFor: <A>(schema: Schema<A>) => Decoder<unknown, A> = provideDecoderFor(
  P.empty
)

// ---------------------------------------------
// internal
// ---------------------------------------------

/** @internal */
export const _of = <A>(
  value: A
): Decoder<unknown, A> =>
  I.fromRefinement(I.of(value), (u): u is A => u === value, (u) => DE.notEqual(value, u))

/** @internal */
export const _tuple = (
  ast: AST.Tuple,
  components: ReadonlyArray<Decoder<any, any>>,
  oRestElement: Option<Decoder<any, any>>
): Decoder<any, any> =>
  make(
    I.makeSchema(ast),
    (us: ReadonlyArray<unknown>) => {
      const out: Array<any> = []
      const es: Array<DE.DecodeError> = []
      let i = 0
      // ---------------------------------------------
      // handle components
      // ---------------------------------------------
      for (; i < components.length; i++) {
        const decoder = components[i]
        const t = decoder.decode(us[i])
        if (isFailure(t)) {
          return failures(I.append(es, DE.index(i, t.left))) // bail out on a fatal errors
        } else if (isWarning(t)) {
          es.push(DE.index(i, t.left))
        }
        out[i] = t.right
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (O.isSome(oRestElement)) {
        const decoder = oRestElement.value
        for (; i < us.length; i++) {
          const t = decoder.decode(us[i])
          if (isFailure(t)) {
            return failures(I.append(es, DE.index(i, t.left))) // bail out on a fatal errors
          } else if (isWarning(t)) {
            es.push(DE.index(i, t.left))
          }
          out[i] = t.right
        }
      } else {
        // ---------------------------------------------
        // handle additional indexes
        // ---------------------------------------------
        for (; i < us.length; i++) {
          es.push(DE.unexpectedIndex(i))
        }
      }

      // ---------------------------------------------
      // compute output
      // ---------------------------------------------
      return I.isNonEmpty(es) ? warnings(es, out) : success(out)
    }
  )

/** @internal */
export const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Decoder<any, any>>,
  oStringIndexSignature: Option<Decoder<any, any>>,
  oSymbolIndexSignature: Option<Decoder<any, any>>
): Decoder<any, any> =>
  make(
    I.makeSchema(ast),
    (input: { readonly [_: string | symbol]: unknown }) => {
      const output: any = {}
      const processedKeys: any = {}
      const es: Array<DE.DecodeError> = []
      // ---------------------------------------------
      // handle fields
      // ---------------------------------------------
      for (let i = 0; i < fields.length; i++) {
        const field = ast.fields[i]
        const key = field.key
        processedKeys[key] = null
        // ---------------------------------------------
        // handle optional fields
        // ---------------------------------------------
        const optional = field.optional
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
        const decoder = fields[i]
        const t = decoder.decode(input[key])
        if (isFailure(t)) {
          return failures(I.append(es, DE.key(key, t.left))) // bail out on a fatal errors
        } else if (isWarning(t)) {
          es.push(DE.key(key, t.left))
        }
        output[key] = t.right
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (O.isSome(oStringIndexSignature) || O.isSome(oSymbolIndexSignature)) {
        if (O.isSome(oStringIndexSignature)) {
          const decoder = oStringIndexSignature.value
          for (const key of Object.keys(input)) {
            const t = decoder.decode(input[key])
            if (isFailure(t)) {
              return failures(I.append(es, DE.key(key, t.left))) // bail out on a fatal errors
            } else if (isWarning(t)) {
              es.push(DE.key(key, t.left))
            }
            output[key] = t.right
          }
        }
        if (O.isSome(oSymbolIndexSignature)) {
          const decoder = oSymbolIndexSignature.value
          for (const key of Object.getOwnPropertySymbols(input)) {
            const t = decoder.decode(input[key])
            if (isFailure(t)) {
              return failures(I.append(es, DE.key(key, t.left))) // bail out on a fatal errors
            } else if (isWarning(t)) {
              es.push(DE.key(key, t.left))
            }
            output[key] = t.right
          }
        }
      } else {
        // ---------------------------------------------
        // handle additional keys
        // ---------------------------------------------
        for (const key of I.getPropertyKeys(input)) {
          if (!(Object.prototype.hasOwnProperty.call(processedKeys, key))) {
            es.push(DE.unexpectedKey(key))
          }
        }
      }

      // ---------------------------------------------
      // compute output
      // ---------------------------------------------
      return I.isNonEmpty(es) ? warnings(es, output) : success(output)
    }
  )

/** @internal */
export const _union = <I, Members extends ReadonlyArray<Decoder<I, any>>>(
  ast: AST.Union,
  members: Members
): Decoder<I, I.Infer<Members[number]>> =>
  make(I.makeSchema(ast), (u) => {
    const es: Array<DE.DecodeError> = []
    for (let i = 0; i < members.length; i++) {
      const t = members[i].decode(u)
      if (!isFailure(t)) {
        return t
      }
      es.push(DE.member(i, t.left))
    }
    return I.isNonEmpty(es) ? failures(es) : failure(DE.notType("never", u))
  })

/** @internal */
export const _lazy = <I, A>(
  f: () => Decoder<I, A>
): Decoder<I, A> => {
  const get = I.memoize<void, Decoder<I, A>>(f)
  const schema = I.lazy(f)
  return make(
    schema,
    (a) => get().decode(a)
  )
}
