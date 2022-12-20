/**
 * @since 1.0.0
 */

import { isBoolean } from "@fp-ts/data/Boolean"
import { pipe } from "@fp-ts/data/Function"
import { isNumber } from "@fp-ts/data/Number"
import * as O from "@fp-ts/data/Option"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import * as RA from "@fp-ts/data/ReadonlyArray"
import { isString } from "@fp-ts/data/String"
import type { Both, Validated } from "@fp-ts/data/These"
import type { DecoderAnnotation } from "@fp-ts/schema/annotation/DecoderAnnotation"
import { isDecoderAnnotation } from "@fp-ts/schema/annotation/DecoderAnnotation"
import * as AST from "@fp-ts/schema/AST"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export interface Decoder<I, A> extends Schema<A> {
  readonly I: (_: I) => void
  readonly decode: (i: I) => Validated<DE.DecodeError, A>
}

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

const getDecoderAnnotation = (ast: AST.AST): O.Option<DecoderAnnotation<unknown>> =>
  pipe(
    ast.annotations,
    RA.findFirst(isDecoderAnnotation)
  )

/**
 * @since 1.0.0
 */
export const decoderFor = <A>(schema: Schema<A>): Decoder<unknown, A> => {
  const go = (ast: AST.AST): Decoder<unknown, any> => {
    const annotation = getDecoderAnnotation(ast)
    if (O.isSome(annotation)) {
      const { config, handler } = annotation.value
      if (AST.isTypeAliasDeclaration(ast)) {
        return ast.typeParameters.length > 0 ?
          handler(config, ...ast.typeParameters.map(go)) :
          handler(config, go(ast.type))
      }
      return handler(config, go({ ...ast, annotations: [] }))
    }
    switch (ast._tag) {
      case "TypeAliasDeclaration":
        return go(ast.type)
      case "LiteralType":
        return I.fromRefinement(
          I.makeSchema(ast),
          (u): u is typeof ast.literal => u === ast.literal,
          (u) => DE.notEqual(ast.literal, u)
        )
      case "UniqueSymbol":
        return I.fromRefinement(
          I.makeSchema(ast),
          (u): u is typeof ast.symbol => u === ast.symbol,
          (u) => DE.notEqual(ast.symbol, u)
        )
      case "UndefinedKeyword":
        return I.fromRefinement(
          I._undefined,
          I.isUndefined,
          (u) => DE.notType("undefined", u)
        )
      case "VoidKeyword":
        return I.fromRefinement(
          I._void,
          I.isUndefined,
          (u) => DE.notType("void", u)
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
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
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
            // handle elements
            // ---------------------------------------------
            for (; i < elements.length; i++) {
              if (input.length < i + 1) {
                // the input element is missing...
                if (ast.elements[i].isOptional) {
                  // ...but the element is optional, go on
                  continue
                } else {
                  // ...but the element is required, bail out
                  return failure(DE.index(i, [DE.missing]))
                }
              } else {
                const decoder = elements[i]
                const t = decoder.decode(input[i])
                if (isFailure(t)) {
                  // the input element is present but is not valid, bail out
                  return failures(I.mutableAppend(es, DE.index(i, t.left)))
                } else if (isWarning(t)) {
                  es.push(DE.index(i, t.left))
                }
                output[i] = t.right
              }
            }
            // ---------------------------------------------
            // handle rest element
            // ---------------------------------------------
            if (O.isSome(rest)) {
              const head = RA.headNonEmpty(rest.value)
              const tail = RA.tailNonEmpty(rest.value)
              for (; i < input.length - tail.length; i++) {
                const t = head.decode(input[i])
                if (isFailure(t)) {
                  // the input element is not valid, bail out
                  return failures(I.mutableAppend(es, DE.index(i, t.left)))
                } else if (isWarning(t)) {
                  es.push(DE.index(i, t.left))
                }
                output[i] = t.right
              }
              // ---------------------------------------------
              // handle post rest elements
              // ---------------------------------------------
              for (let j = 0; j < tail.length; j++) {
                i += j
                if (input.length < i + 1) {
                  // the input element is missing and the element is required, bail out
                  return failure(DE.index(i, [DE.missing]))
                } else {
                  const t = tail[j].decode(input[i])
                  if (isFailure(t)) {
                    // the input element is present but is not valid, bail out
                    return failures(I.mutableAppend(es, DE.index(i, t.left)))
                  } else if (isWarning(t)) {
                    es.push(DE.index(i, t.left))
                  }
                  output[i] = t.right
                }
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
          ast.indexSignatures.map((is) => go(is.value))
        )
      case "Union":
        return _union(ast, ast.members.map(go))
      case "Enums":
        return I.makeDecoder(
          I.makeSchema(ast),
          (u) =>
            ast.enums.some(([_, value]) => value === u) ?
              I.success(u) :
              I.failure(DE.notEnums(ast.enums, u))
        )
      case "Lazy":
        return _lazy(() => go(ast.f()))
    }
  }

  return go(schema.ast)
}

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<Decoder<any, any>>,
  indexSignatures: ReadonlyArray<Decoder<any, any>>
): Decoder<any, any> =>
  make(
    I.makeSchema(ast),
    (input: unknown) => {
      if (!I.isUnknownObject(input)) {
        return failure(DE.notType("{ readonly [x: string]: unknown }", input))
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
        if (!Object.prototype.hasOwnProperty.call(input, key)) {
          if (field.isOptional) {
            continue
          }
          return failure(DE.key(key, [DE.missing]))
        }
        const decoder = fields[i]
        const t = decoder.decode(input[key])
        if (isFailure(t)) {
          return failures(I.mutableAppend(es, DE.key(key, t.left))) // bail out on a fatal errors
        } else if (isWarning(t)) {
          es.push(DE.key(key, t.left))
        }
        output[key] = t.right
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (indexSignatures.length > 0) {
        const keys = Object.keys(input)
        const symbols = Object.getOwnPropertySymbols(input)
        for (let i = 0; i < indexSignatures.length; i++) {
          const decoder = indexSignatures[i]
          const ks = ast.indexSignatures[i].key === "symbol" ? symbols : keys
          for (const key of ks) {
            const t = decoder.decode(input[key])
            if (isFailure(t)) {
              return failures(I.mutableAppend(es, DE.key(key, t.left))) // bail out on a fatal errors
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
        for (const key of I.ownKeys(input)) {
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
