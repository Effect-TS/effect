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
import type { Both } from "@fp-ts/data/These"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import type * as AST from "@fp-ts/schema/AST"
import * as DE from "@fp-ts/schema/DecodeError"
import { format } from "@fp-ts/schema/formatter/Tree"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @category model
 * @since 1.0.0
 */
export interface Decoder<I, A> extends Schema<A> {
  readonly decode: (i: I) => DE.DecodeResult<A>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <I, A>(schema: Schema<A>, decode: Decoder<I, A>["decode"]) => Decoder<I, A> =
  I.makeDecoder

/**
 * @category decoding
 * @since 1.0.0
 */
export const decode = <A>(schema: Schema<A>) =>
  (u: unknown): DE.DecodeResult<A> => decoderFor(schema).decode(u)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeOrThrow = <A>(schema: Schema<A>) =>
  (u: unknown): A => {
    const t = decoderFor(schema).decode(u)
    if (DE.isFailure(t)) {
      throw new Error(format(t.left))
    }
    return t.right
  }

const getTypeAliasHook = H.getTypeAliasHook<H.TypeAliasHook<Decoder<unknown, any>>>(
  H.DecoderTypeAliasHookId
)

/**
 * @since 1.0.0
 */
export const decoderFor = <A>(schema: Schema<A>): Decoder<unknown, A> => {
  const go = (ast: AST.AST): Decoder<any, any> => {
    switch (ast._tag) {
      case "TypeAlias":
        return pipe(
          getTypeAliasHook(ast),
          O.match(
            () => go(ast.type),
            ({ handler }) => handler(...ast.typeParameters.map(go))
          )
        )
      case "Literal":
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
        return I.fromRefinement(I.makeSchema(ast), I.isUndefined, (u) => DE.type("undefined", u))
      case "VoidKeyword":
        return I.fromRefinement(I.makeSchema(ast), I.isUndefined, (u) => DE.type("void", u))
      case "NeverKeyword":
        return make(I.makeSchema(ast), (u) => DE.failure(DE.type("never", u))) as any
      case "UnknownKeyword":
        return make(I.makeSchema(ast), DE.success)
      case "AnyKeyword":
        return make(I.makeSchema(ast), DE.success)
      case "StringKeyword":
        return I.fromRefinement(I.makeSchema(ast), isString, (u) => DE.type("string", u))
      case "NumberKeyword":
        return make(
          I.makeSchema(ast),
          (u) => isNumber(u) ? DE.success(u) : DE.failure(DE.type("number", u))
        )
      case "BooleanKeyword":
        return I.fromRefinement(I.makeSchema(ast), isBoolean, (u) => DE.type("boolean", u))
      case "BigIntKeyword":
        return make(
          I.makeSchema(ast),
          (u) => {
            if (I.isBigInt(u)) {
              return DE.success(u)
            }
            if (isString(u) || isNumber(u) || isBoolean(u)) {
              try {
                return DE.success(BigInt(u))
              } catch (_e) {
                return DE.failure(DE.transform("string | number | boolean", "bigint", u))
              }
            }
            return DE.failure(DE.type("string | number | boolean", u))
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
              return DE.failure(DE.type("ReadonlyArray<unknown>", input))
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
                  return DE.failure(DE.index(i, [DE.missing]))
                }
              } else {
                const decoder = elements[i]
                const t = decoder.decode(input[i])
                if (DE.isFailure(t)) {
                  // the input element is present but is not valid, bail out
                  return DE.failures(I.mutableAppend(es, DE.index(i, t.left)))
                } else if (DE.hasWarnings(t)) {
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
                if (DE.isFailure(t)) {
                  return DE.failures(I.mutableAppend(es, DE.index(i, t.left)))
                } else {
                  if (DE.hasWarnings(t)) {
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
                  return DE.failure(DE.index(i, [DE.missing]))
                } else {
                  const t = tail[j].decode(input[i])
                  if (DE.isFailure(t)) {
                    // the input element is present but is not valid, bail out
                    return DE.failures(I.mutableAppend(es, DE.index(i, t.left)))
                  } else if (DE.hasWarnings(t)) {
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
                if (ast.isUnexpectedAllowed) {
                  es.push(DE.index(i, [DE.unexpected(input[i])]))
                } else {
                  return DE.failures(I.mutableAppend(es, DE.index(i, [DE.unexpected(input[i])])))
                }
              }
            }

            // ---------------------------------------------
            // compute output
            // ---------------------------------------------
            return I.isNonEmpty(es) ? DE.warnings(es, output) : DE.success(output)
          }
        )
      }
      case "TypeLiteral": {
        const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
        const indexSignatures = ast.indexSignatures.map((is) =>
          [go(is.parameter), go(is.type)] as const
        )
        if (propertySignaturesTypes.length === 0 && indexSignatures.length === 0) {
          return I.fromRefinement(I.makeSchema(ast), I.isNotNull, (u) => DE.type("{}", u))
        }
        return make(
          I.makeSchema(ast),
          (input: unknown) => {
            if (!I.isUnknownObject(input)) {
              return DE.failure(DE.type("{ readonly [x: PropertyKey]: unknown }", input))
            }
            const output: any = {}
            const expectedKeys: any = {}
            const es: Array<DE.DecodeError> = []
            // ---------------------------------------------
            // handle property signatures
            // ---------------------------------------------
            for (let i = 0; i < propertySignaturesTypes.length; i++) {
              const ps = ast.propertySignatures[i]
              const decoder = propertySignaturesTypes[i]
              const name = ps.name
              expectedKeys[name] = null
              if (!Object.prototype.hasOwnProperty.call(input, name)) {
                if (ps.isOptional) {
                  continue
                }
                return DE.failure(DE.key(name, [DE.missing]))
              }
              const t = decoder.decode(input[name])
              if (DE.isFailure(t)) {
                // the input key is present but is not valid, bail out
                return DE.failures(I.mutableAppend(es, DE.key(name, t.left)))
              } else if (DE.hasWarnings(t)) {
                es.push(DE.key(name, t.left))
              }
              output[name] = t.right
            }
            // ---------------------------------------------
            // handle index signatures
            // ---------------------------------------------
            if (indexSignatures.length > 0) {
              for (let i = 0; i < indexSignatures.length; i++) {
                const parameter = indexSignatures[i][0]
                const type = indexSignatures[i][1]
                const keys = I.getKeysForIndexSignature(input, ast.indexSignatures[i].parameter)
                for (const key of keys) {
                  // ---------------------------------------------
                  // handle keys
                  // ---------------------------------------------
                  let t = parameter.decode(key)
                  if (DE.isFailure(t)) {
                    return DE.failures(I.mutableAppend(es, DE.key(key, t.left)))
                  } else if (DE.hasWarnings(t)) {
                    es.push(DE.key(key, t.left))
                  }
                  // ---------------------------------------------
                  // handle values
                  // ---------------------------------------------
                  t = type.decode(input[key])
                  if (DE.isFailure(t)) {
                    return DE.failures(I.mutableAppend(es, DE.key(key, t.left)))
                  } else {
                    if (DE.hasWarnings(t)) {
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
                  if (ast.isUnexpectedAllowed) {
                    es.push(DE.key(key, [DE.unexpected(input[key])]))
                  } else {
                    return DE.failures(
                      I.mutableAppend(es, DE.key(key, [DE.unexpected(input[key])]))
                    )
                  }
                }
              }
            }

            // ---------------------------------------------
            // compute output
            // ---------------------------------------------
            return I.isNonEmpty(es) ? DE.warnings(es, output) : DE.success(output)
          }
        )
      }
      case "Union": {
        const types = ast.types.map(go)
        return make(I.makeSchema(ast), (u) => {
          const es: Array<DE.DecodeError> = []
          let output: Both<NonEmptyReadonlyArray<DE.DecodeError>, any> | null = null

          // ---------------------------------------------
          // compute best output
          // ---------------------------------------------
          for (let i = 0; i < types.length; i++) {
            const t = types[i].decode(u)
            if (DE.isSuccess(t)) {
              // if there are no warnings this is the best output
              return t
            } else if (DE.hasWarnings(t)) {
              // choose the output with less warnings related to unexpected keys / indexes
              if (
                !output ||
                output.left.filter(I.hasUnexpectedError).length >
                  t.left.filter(I.hasUnexpectedError).length
              ) {
                output = t
              }
            } else {
              es.push(DE.member(t.left))
            }
          }

          // ---------------------------------------------
          // compute output
          // ---------------------------------------------
          return output ?
            output :
            I.isNonEmpty(es) ?
            DE.failures(es) :
            DE.failure(DE.type("never", u))
        })
      }
      case "Lazy": {
        const f = () => go(ast.f())
        const get = I.memoize<void, Decoder<any, any>>(f)
        const schema = I.lazy(f)
        return make(schema, (a) => get().decode(a))
      }
      case "Enums":
        return make(
          I.makeSchema(ast),
          (u) =>
            ast.enums.some(([_, value]) => value === u) ?
              DE.success(u) :
              DE.failure(DE.enums(ast.enums, u))
        )
      case "Refinement": {
        const type = go(ast.from)
        return make(
          I.makeSchema(ast),
          (u) =>
            pipe(
              type.decode(u),
              I.flatMap((a) =>
                ast.refinement(a) ? DE.success(a) : DE.failure(DE.refinement(ast.meta, a))
              )
            )
        )
      }
      case "TemplateLiteral": {
        const regex = I.getTemplateLiteralRegex(ast)
        return make(
          I.makeSchema(ast),
          (u) =>
            isString(u) ?
              regex.test(u) ? DE.success(u) : DE.failure(DE.type(regex.source, u)) :
              DE.failure(DE.type("string", u))
        )
      }
      case "Transform": {
        const from = go(ast.from)
        return make(I.makeSchema(ast), (u) => pipe(from.decode(u), I.flatMap(ast.f)))
      }
    }
  }

  return go(schema.ast)
}
