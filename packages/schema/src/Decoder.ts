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
import { getTypeAliasHook } from "@fp-ts/schema/annotation/DecoderHooks"
import type * as AST from "@fp-ts/schema/AST"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export type DecodeResult<A> = Validated<DE.DecodeError, A>

/**
 * @since 1.0.0
 */
export interface Decoder<I, A> extends Schema<A> {
  readonly I: (_: I) => void
  readonly decode: (i: I) => DecodeResult<A>
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

/**
 * @since 1.0.0
 */
export const decoderFor = <A>(schema: Schema<A>): Decoder<unknown, A> => {
  const go = (ast: AST.AST): Decoder<unknown, any> => {
    switch (ast._tag) {
      case "TypeAlias":
        return pipe(
          getTypeAliasHook(ast),
          O.match(
            () => go(ast.type),
            ({ handler }) => handler(...ast.typeParameters.map(go))
          )
        )
      case "LiteralType":
        return I.fromRefinement(
          I.makeSchema(ast),
          (u): u is typeof ast.literal => u === ast.literal,
          (u) => DE.equal(ast.literal, u)
        )
      case "UniqueSymbol":
        return I.fromRefinement(
          I.makeSchema(ast),
          (u): u is typeof ast.symbol => u === ast.symbol,
          (u) => DE.equal(ast.symbol, u)
        )
      case "UndefinedKeyword":
        return I.fromRefinement(
          I.makeSchema(ast),
          I.isUndefined,
          (u) => DE.type("undefined", u)
        )
      case "VoidKeyword":
        return I.fromRefinement(
          I.makeSchema(ast),
          I.isUndefined,
          (u) => DE.type("void", u)
        )
      case "NeverKeyword":
        return make(
          I.makeSchema(ast),
          (u) => I.failure(DE.type("never", u))
        ) as any
      case "UnknownKeyword":
        return make(I.makeSchema(ast), I.success)
      case "AnyKeyword":
        return make(I.makeSchema(ast), I.success)
      case "StringKeyword":
        return I.fromRefinement(I.makeSchema(ast), isString, (u) => DE.type("string", u))
      case "NumberKeyword":
        return I.makeDecoder(
          I.makeSchema(ast),
          (u) => isNumber(u) ? I.success(u) : I.failure(DE.type("number", u))
        )
      case "BooleanKeyword":
        return I.fromRefinement(I.makeSchema(ast), isBoolean, (u) => DE.type("boolean", u))
      case "BigIntKeyword":
        return I.makeDecoder<unknown, bigint>(
          I.makeSchema(ast),
          (u) => {
            if (I.isBigInt(u)) {
              return I.success(u)
            }
            if (isString(u) || isNumber(u) || isBoolean(u)) {
              try {
                return I.success(BigInt(u))
              } catch (_e) {
                return I.failure(DE.parse("string | number | boolean", "bigint", u))
              }
            }
            return I.failure(DE.type("string | number | boolean", u))
          }
        )
      case "SymbolKeyword":
        return I.fromRefinement(I.makeSchema(ast), I.isSymbol, (u) => DE.type("symbol", u))
      case "ObjectKeyword":
        return I.fromRefinement(I.makeSchema(ast), I.isObject, (u) => DE.type("object", u))
      case "Tuple": {
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
        return make(
          I.makeSchema(ast),
          (input: unknown) => {
            if (!Array.isArray(input)) {
              return failure(DE.type("ReadonlyArray<unknown>", input))
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
                output.push(t.right)
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
                  return failures(I.mutableAppend(es, DE.index(i, t.left)))
                } else {
                  if (isWarning(t)) {
                    es.push(DE.index(i, t.left))
                  }
                  output.push(t.right)
                }
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
                  output.push(t.right)
                }
              }
            } else {
              // ---------------------------------------------
              // handle unexpected indexes
              // ---------------------------------------------
              for (; i < input.length; i++) {
                if (ast.allowUnexpected) {
                  es.push(DE.unexpectedIndex(i, input[i]))
                } else {
                  return failures(I.mutableAppend(es, DE.unexpectedIndex(i, input[i])))
                }
              }
            }

            // ---------------------------------------------
            // compute output
            // ---------------------------------------------
            return I.isNonEmpty(es) ? warnings(es, output) : success(output)
          }
        )
      }
      case "Struct": {
        const fields = ast.fields.map((f) => go(f.value))
        const indexSignatures = ast.indexSignatures.map((is) => go(is.value))
        if (fields.length === 0 && indexSignatures.length === 0) {
          return I.fromRefinement(I.makeSchema(ast), I.isNotNull, (u) => DE.type("{}", u))
        }
        return make(
          I.makeSchema(ast),
          (input: unknown) => {
            if (!I.isUnknownObject(input)) {
              return failure(DE.type("{ readonly [x: string]: unknown }", input))
            }
            const output: any = {}
            const expectedKeys: any = {}
            const es: Array<DE.DecodeError> = []
            // ---------------------------------------------
            // handle fields
            // ---------------------------------------------
            for (let i = 0; i < fields.length; i++) {
              const field = ast.fields[i]
              const decoder = fields[i]
              const key = field.key
              expectedKeys[key] = null
              // TODO: handle custom decoding logic here
              if (!Object.prototype.hasOwnProperty.call(input, key)) {
                if (field.isOptional) {
                  continue
                }
                return failure(DE.key(key, [DE.missing]))
              }
              const t = decoder.decode(input[key])
              if (isFailure(t)) {
                // the input key is present but is not valid, bail out
                return failures(I.mutableAppend(es, DE.key(key, t.left)))
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
                    return failures(I.mutableAppend(es, DE.key(key, t.left)))
                  } else {
                    if (isWarning(t)) {
                      es.push(DE.key(key, t.left))
                    }
                    output[key] = t.right
                  }
                }
              }
            } else {
              // ---------------------------------------------
              // handle unexpected keys
              // ---------------------------------------------
              for (const key of I.ownKeys(input)) {
                if (!(Object.prototype.hasOwnProperty.call(expectedKeys, key))) {
                  if (ast.allowUnexpected) {
                    es.push(DE.unexpectedKey(key, input[key]))
                  } else {
                    return failures(I.mutableAppend(es, DE.unexpectedKey(key, input[key])))
                  }
                }
              }
            }

            // ---------------------------------------------
            // compute output
            // ---------------------------------------------
            return I.isNonEmpty(es) ? warnings(es, output) : success(output)
          }
        )
      }
      case "Union": {
        const members = ast.members.map(go)
        return make(I.makeSchema(ast), (u) => {
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
                !output ||
                output.left.filter(isUnexpectedError).length >
                  t.left.filter(isUnexpectedError).length
              ) {
                output = t
              }
            } else {
              es.push(DE.member(t.left))
            }
          }

          return output ? output : I.isNonEmpty(es) ? failures(es) : failure(DE.type("never", u))
        })
      }
      case "Lazy": {
        const f = () => go(ast.f())
        const get = I.memoize<void, Decoder<unknown, any>>(f)
        const schema = I.lazy(f)
        return make(
          schema,
          (a) => get().decode(a)
        )
      }
      case "Enums":
        return I.makeDecoder(
          I.makeSchema(ast),
          (u) =>
            ast.enums.some(([_, value]) => value === u) ?
              I.success(u) :
              I.failure(DE.enums(ast.enums, u))
        )
      case "Refinement": {
        const type = go(ast.from)
        return make(
          I.makeSchema(ast),
          (u) =>
            pipe(
              type.decode(u),
              I.flatMap((a) =>
                ast.refinement(a) ? I.success(a) : I.failure(DE.refinement(ast.meta, a))
              )
            )
        )
      }
    }
  }

  return go(schema.ast)
}

const isUnexpectedError = (e: DE.DecodeError) =>
  e._tag === "UnexpectedIndex" || e._tag === "UnexpectedKey"
