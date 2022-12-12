/**
 * @since 1.0.0
 */

import { isBoolean } from "@fp-ts/data/Boolean"
import { pipe } from "@fp-ts/data/Function"
import { isNumber } from "@fp-ts/data/Number"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import { isString } from "@fp-ts/data/String"
import type { Both, These } from "@fp-ts/data/These"
import * as AST from "@fp-ts/schema/AST"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Provider } from "@fp-ts/schema/Provider"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface Decoder<I, A> extends Schema<A> {
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
        case "TypeAliasDeclaration":
          return pipe(
            ast.provider,
            P.Semigroup.combine(provider),
            P.findHandler(I.DecoderId, ast.id),
            O.match(
              () => go(ast.type),
              (handler) => handler(...ast.typeParameters.map(go))
            )
          )
        case "LiteralType":
          return I.fromRefinement(
            I.makeSchema(ast),
            (u): u is AST.Literal => u === ast.literal,
            (u) => DE.notEqual(ast.literal, u)
          )
        case "UndefinedKeyword":
          return I.fromRefinement(
            I._undefined,
            I.isUndefined,
            (u) => DE.notType("undefined", u)
          )
        case "NeverKeyword":
          return make(
            I.never,
            (u) => I.failure(DE.notType("never", u))
          ) as any
        case "UnknownKeyword":
          return make(I.unknown, I.success)
        case "AnyKeyword":
          return make(I.any, I.success)
        case "StringKeyword":
          return I.fromRefinement(I.string, isString, (u) => DE.notType("string", u))
        case "NumberKeyword":
          return I.makeDecoder(I.makeSchema(ast), (u) =>
            isNumber(u) ?
              isNaN(u) ?
                I.warning(DE.nan, u) :
                isFinite(u) ?
                I.success(u) :
                I.warning(DE.notFinite, u) :
              I.failure(DE.notType("number", u)))
        case "BooleanKeyword":
          return I.fromRefinement(I.boolean, isBoolean, (u) => DE.notType("boolean", u))
        case "BigIntKeyword":
          return I.makeDecoder<unknown, bigint>(
            I.bigint,
            (u) => {
              if (I.isBigInt(u)) {
                return I.success(u)
              }
              if (isString(u) || isNumber(u) || isBoolean(u)) {
                try {
                  return I.success(BigInt(u))
                } catch (_e) {
                  return I.failure(DE.notType("bigint", u))
                }
              }
              return I.failure(DE.notType("string | number | boolean", u))
            }
          )
        case "SymbolKeyword":
          return I.fromRefinement(I.symbol, I.isSymbol, (u) => DE.notType("symbol", u))
        case "Tuple": {
          const components = ast.components.map((c) => go(c.value))
          const rest = pipe(ast.rest, O.map((ast) => [ast, go(ast)] as const))
          return make(
            I.makeSchema(ast),
            (input: unknown) => {
              if (!Array.isArray(input)) {
                return failure(DE.notType("ReadonlyArray<unknown>", input))
              }
              const output: Array<any> = []
              const es: Array<DE.DecodeError> = []
              let i = 0
              // ---------------------------------------------
              // handle components
              // ---------------------------------------------
              for (; i < components.length; i++) {
                // ---------------------------------------------
                // handle optional components
                // ---------------------------------------------
                if (ast.components[i].optional && input[i] === undefined) {
                  continue
                }
                const decoder = components[i]
                const t = decoder.decode(input[i])
                if (isFailure(t)) {
                  return failures(I.append(es, DE.index(i, t.left))) // bail out on a fatal errors
                } else if (isWarning(t)) {
                  es.push(DE.index(i, t.left))
                }
                output[i] = t.right
              }
              // ---------------------------------------------
              // handle rest element
              // ---------------------------------------------
              if (O.isSome(rest)) {
                const [ast, decoder] = rest.value
                if (ast !== AST.unknownKeyword && ast !== AST.anyKeyword) {
                  for (; i < input.length; i++) {
                    const t = decoder.decode(input[i])
                    if (isFailure(t)) {
                      return failures(I.append(es, DE.index(i, t.left))) // bail out on a fatal errors
                    } else if (isWarning(t)) {
                      es.push(DE.index(i, t.left))
                    }
                    output[i] = t.right
                  }
                } else {
                  output.push(...input.slice(i))
                }
              } else {
                // ---------------------------------------------
                // handle additional indexes
                // ---------------------------------------------
                for (; i < input.length; i++) {
                  es.push(DE.unexpectedIndex(i))
                }
              }

              // ---------------------------------------------
              // compute output
              // ---------------------------------------------
              return I.isNonEmpty(es) ? warnings(es, output) : success(output)
            }
          )
        }
        case "Struct":
          return _struct(
            ast,
            ast.fields.map((f) => go(f.value)),
            pipe(ast.indexSignatures.string, O.map((is) => go(is.value))),
            pipe(ast.indexSignatures.symbol, O.map((is) => go(is.value)))
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

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Decoder<any, any>>,
  oStringIndexSignature: Option<Decoder<any, any>>,
  oSymbolIndexSignature: Option<Decoder<any, any>>
): Decoder<any, any> =>
  make(
    I.makeSchema(ast),
    (input: unknown) => {
      if (!I.isUnknownObject(input)) {
        return failure(DE.notType("{ readonly [_: string]: unknown }", input))
      }
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

const isUnexpected = (e: DE.DecodeError) =>
  e._tag === "UnexpectedIndex" || e._tag === "UnexpectedKey"

const _union = <I>(
  ast: AST.Union,
  members: ReadonlyArray<Decoder<I, any>>
): Decoder<I, any> =>
  make(I.makeSchema(ast), (u) => {
    const es: Array<DE.DecodeError> = []
    let output: Both<NonEmptyReadonlyArray<DE.DecodeError>, any> | null = null

    // ---------------------------------------------
    // compute best output
    // ---------------------------------------------
    for (let i = 0; i < members.length; i++) {
      const t = members[i].decode(u)
      if (isSuccess(t)) {
        // if there are no warnings this is the best output
        return t
      } else if (isWarning(t)) {
        // choose the output with less warnings related to unexpected keys / indexes
        if (
          !output || output.left.filter(isUnexpected).length > t.left.filter(isUnexpected).length
        ) {
          output = t
        }
      } else {
        es.push(DE.member(t.left))
      }
    }

    return output ? output : I.isNonEmpty(es) ? failures(es) : failure(DE.notType("never", u))
  })

const _lazy = <I, A>(
  f: () => Decoder<I, A>
): Decoder<I, A> => {
  const get = I.memoize<void, Decoder<I, A>>(f)
  const schema = I.lazy(f)
  return make(
    schema,
    (a) => get().decode(a)
  )
}
