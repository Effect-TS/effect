/**
 * @since 1.0.0
 */

import { isBoolean } from "@effect/data/Boolean"
import { pipe } from "@effect/data/Function"
import { isNumber } from "@effect/data/Number"
import * as O from "@effect/data/Option"
import {
  isBigint,
  isNever,
  isNotNullable,
  isObject,
  isRecord,
  isString,
  isSymbol,
  isUndefined
} from "@effect/data/Predicate"
import * as RA from "@effect/data/ReadonlyArray"
import * as H from "@fp-ts/schema/annotation/Hook"
import * as AST from "@fp-ts/schema/AST"
import type { ParseOptions } from "@fp-ts/schema/AST"
import { formatErrors } from "@fp-ts/schema/formatter/Tree"
import * as I from "@fp-ts/schema/internal/common"
import * as PR from "@fp-ts/schema/ParseResult"
import type { ParseResult } from "@fp-ts/schema/ParseResult"
import type { Infer, Schema } from "@fp-ts/schema/Schema"

/**
 * @category model
 * @since 1.0.0
 */
export interface Parser<A> extends Schema<A> {
  readonly parse: (input: unknown, options?: ParseOptions) => ParseResult<A>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <A>(schema: Schema<A>, parse: Parser<A>["parse"]) => Parser<A> = I.makeParser

/**
 * @category decoding
 * @since 1.0.0
 */
export const decode = <A>(
  schema: Schema<A>
): (input: unknown, options?: ParseOptions) => ParseResult<A> => parserFor(schema).parse

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeOrThrow = <A>(schema: Schema<A>) =>
  (input: unknown, options?: ParseOptions): A => {
    const t = parserFor(schema).parse(input, options)
    if (PR.isFailure(t)) {
      throw new Error(formatErrors(t.left))
    }
    return t.right
  }

/**
 * @category assertions
 * @since 1.0.0
 */
export const is = <A>(schema: Schema<A>) =>
  (input: unknown, options?: ParseOptions): input is A =>
    !PR.isFailure(parserFor(schema, "guard").parse(input, options))

/**
 * @since 1.0.0
 */
export type InferAsserts<S extends Schema<any>> = (
  input: unknown,
  options?: ParseOptions
) => asserts input is Infer<S>

/**
 * @category assertions
 * @since 1.0.0
 */
export const asserts = <A>(schema: Schema<A>) =>
  (input: unknown, options?: ParseOptions): asserts input is A => {
    const t = parserFor(schema, "guard").parse(input, options)
    if (PR.isFailure(t)) {
      throw new Error(formatErrors(t.left))
    }
  }

/**
 * @category encoding
 * @since 1.0.0
 */
export const encode = <A>(
  schema: Schema<A>
): (a: A, options?: ParseOptions) => ParseResult<unknown> => parserFor(schema, "encoder").parse

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeOrThrow = <A>(schema: Schema<A>) =>
  (a: A, options?: ParseOptions): unknown => {
    const t = parserFor(schema, "encoder").parse(a, options)
    if (PR.isFailure(t)) {
      throw new Error(formatErrors(t.left))
    }
    return t.right
  }

const getHook = AST.getAnnotation<H.Hook<Parser<any>>>(
  H.ParserHookId
)

const parserFor = <A>(
  schema: Schema<A>,
  as: "decoder" | "guard" | "encoder" = "decoder"
): Parser<A> => {
  const go = (ast: AST.AST): Parser<any> => {
    switch (ast._tag) {
      case "TypeAlias":
        return pipe(
          getHook(ast),
          O.match(
            () => go(ast.type),
            ({ handler }) => handler(...ast.typeParameters.map(go))
          )
        )
      case "Literal":
        return I.fromRefinement(
          I.makeSchema(ast),
          (u): u is typeof ast.literal => u === ast.literal
        )
      case "UniqueSymbol":
        return I.fromRefinement(
          I.makeSchema(ast),
          (u): u is typeof ast.symbol => u === ast.symbol
        )
      case "UndefinedKeyword":
        return I.fromRefinement(I.makeSchema(ast), isUndefined)
      case "VoidKeyword":
        return I.fromRefinement(I.makeSchema(ast), isUndefined)
      case "NeverKeyword":
        return I.fromRefinement(I.makeSchema(ast), isNever)
      case "UnknownKeyword":
      case "AnyKeyword":
        return make(I.makeSchema(ast), PR.success)
      case "StringKeyword":
        return I.fromRefinement(I.makeSchema(ast), isString)
      case "NumberKeyword":
        return I.fromRefinement(I.makeSchema(ast), isNumber)
      case "BooleanKeyword":
        return I.fromRefinement(I.makeSchema(ast), isBoolean)
      case "BigIntKeyword":
        return I.fromRefinement(I.makeSchema(ast), isBigint)
      case "SymbolKeyword":
        return I.fromRefinement(I.makeSchema(ast), isSymbol)
      case "ObjectKeyword":
        return I.fromRefinement(I.makeSchema(ast), isObject)
      case "Enums":
        return I.fromRefinement(
          I.makeSchema(ast),
          (u): u is any => ast.enums.some(([_, value]) => value === u)
        )
      case "TemplateLiteral": {
        const regex = I.getTemplateLiteralRegex(ast)
        return I.fromRefinement(I.makeSchema(ast), (u): u is any => isString(u) && regex.test(u))
      }
      case "Tuple": {
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
        return make(
          I.makeSchema(ast),
          (input: unknown, options) => {
            if (!Array.isArray(input)) {
              return PR.failure(PR.type(unknownArray, input))
            }
            const output: Array<any> = []
            const es: Array<PR.ParseError> = []
            const allErrors = options?.allErrors
            let i = 0
            // ---------------------------------------------
            // handle elements
            // ---------------------------------------------
            for (; i < elements.length; i++) {
              if (input.length < i + 1) {
                // the input element is missing...
                if (!ast.elements[i].isOptional) {
                  // ...but the element is required
                  const e = PR.index(i, [PR.missing])
                  if (allErrors) {
                    es.push(e)
                    continue
                  } else {
                    return PR.failure(e)
                  }
                }
              } else {
                const parser = elements[i]
                const t = parser.parse(input[i], options)
                if (PR.isFailure(t)) {
                  // the input element is present but is not valid
                  const e = PR.index(i, t.left)
                  if (allErrors) {
                    es.push(e)
                    continue
                  } else {
                    return PR.failures(I.mutableAppend(es, e))
                  }
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
                const t = head.parse(input[i], options)
                if (PR.isFailure(t)) {
                  const e = PR.index(i, t.left)
                  if (allErrors) {
                    es.push(e)
                    continue
                  } else {
                    return PR.failures(I.mutableAppend(es, e))
                  }
                } else {
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
                  return PR.failures(I.mutableAppend(es, PR.index(i, [PR.missing])))
                } else {
                  const t = tail[j].parse(input[i], options)
                  if (PR.isFailure(t)) {
                    // the input element is present but is not valid
                    const e = PR.index(i, t.left)
                    if (allErrors) {
                      es.push(e)
                      continue
                    } else {
                      return PR.failures(I.mutableAppend(es, e))
                    }
                  }
                  output.push(t.right)
                }
              }
            } else {
              // ---------------------------------------------
              // handle unexpected indexes
              // ---------------------------------------------
              const isUnexpectedAllowed = options?.isUnexpectedAllowed
              for (; i < input.length; i++) {
                const e = PR.index(i, [PR.unexpected(input[i])])
                if (!isUnexpectedAllowed) {
                  if (allErrors) {
                    es.push(e)
                    continue
                  } else {
                    return PR.failures(I.mutableAppend(es, e))
                  }
                }
              }
            }

            // ---------------------------------------------
            // compute output
            // ---------------------------------------------
            return I.isNonEmptyReadonlyArray(es) ?
              PR.failures(es) :
              PR.success(output)
          }
        )
      }
      case "TypeLiteral": {
        if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
          return I.fromRefinement(I.makeSchema(ast), isNotNullable)
        }
        const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
        const indexSignatures = ast.indexSignatures.map((is) =>
          [go(is.parameter), go(is.type)] as const
        )
        return make(
          I.makeSchema(ast),
          (input: unknown, options) => {
            if (!isRecord(input)) {
              return PR.failure(PR.type(unknownRecord, input))
            }
            const output: any = {}
            const expectedKeys: any = {}
            const es: Array<PR.ParseError> = []
            const allErrors = options?.allErrors
            // ---------------------------------------------
            // handle property signatures
            // ---------------------------------------------
            for (let i = 0; i < propertySignaturesTypes.length; i++) {
              const ps = ast.propertySignatures[i]
              const parser = propertySignaturesTypes[i]
              const name = ps.name
              expectedKeys[name] = null
              if (!Object.prototype.hasOwnProperty.call(input, name)) {
                if (!ps.isOptional) {
                  const e = PR.key(name, [PR.missing])
                  if (allErrors) {
                    es.push(e)
                    continue
                  } else {
                    return PR.failure(e)
                  }
                }
              } else {
                const t = parser.parse(input[name], options)
                if (PR.isFailure(t)) {
                  // the input key is present but is not valid
                  const e = PR.key(name, t.left)
                  if (allErrors) {
                    es.push(e)
                    continue
                  } else {
                    return PR.failures(I.mutableAppend(es, e))
                  }
                }
                output[name] = t.right
              }
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
                  if (Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
                    continue
                  }

                  // ---------------------------------------------
                  // handle keys
                  // ---------------------------------------------
                  let t = parameter.parse(key, options)
                  if (PR.isFailure(t)) {
                    const e = PR.key(key, t.left)
                    if (allErrors) {
                      es.push(e)
                      continue
                    } else {
                      return PR.failures(I.mutableAppend(es, e))
                    }
                  }
                  // ---------------------------------------------
                  // handle values
                  // ---------------------------------------------
                  t = type.parse(input[key], options)
                  if (PR.isFailure(t)) {
                    const e = PR.key(key, t.left)
                    if (allErrors) {
                      es.push(e)
                      continue
                    } else {
                      return PR.failures(I.mutableAppend(es, e))
                    }
                  } else {
                    output[key] = t.right
                  }
                }
              }
            } else {
              // ---------------------------------------------
              // handle unexpected keys
              // ---------------------------------------------
              const isUnexpectedAllowed = options?.isUnexpectedAllowed
              for (const key of I.ownKeys(input)) {
                if (!(Object.prototype.hasOwnProperty.call(expectedKeys, key))) {
                  const e = PR.key(key, [PR.unexpected(input[key])])
                  if (!isUnexpectedAllowed) {
                    if (allErrors) {
                      es.push(e)
                      continue
                    } else {
                      return PR.failures(I.mutableAppend(es, e))
                    }
                  }
                }
              }
            }

            // ---------------------------------------------
            // compute output
            // ---------------------------------------------
            return I.isNonEmptyReadonlyArray(es) ?
              PR.failures(es) :
              PR.success(output)
          }
        )
      }
      case "Union": {
        const types = ast.types.map(go)
        return make(I.makeSchema(ast), (u, options) => {
          const es: Array<PR.ParseError> = []

          // ---------------------------------------------
          // compute best output
          // ---------------------------------------------
          for (let i = 0; i < types.length; i++) {
            const t = types[i].parse(u, options)
            if (PR.isSuccess(t)) {
              return t
            } else {
              es.push(PR.unionMember(t.left))
            }
          }

          // ---------------------------------------------
          // compute output
          // ---------------------------------------------
          return I.isNonEmptyReadonlyArray(es) ?
            PR.failures(es) :
            PR.failure(PR.type(AST.neverKeyword, u))
        })
      }
      case "Lazy": {
        const f = () => go(ast.f())
        const get = I.memoize<void, Parser<any>>(f)
        const schema = I.lazy(f)
        return make(schema, (a, options) => get().parse(a, options))
      }
      case "Refinement": {
        const type = go(ast.from)
        const checkRefinement = (a: unknown) =>
          ast.refinement(a) ? PR.success(a) : PR.failure(PR.type(ast, a))

        switch (as) {
          case "guard":
          case "decoder":
            return make(
              I.makeSchema(ast),
              (u, options) => pipe(type.parse(u, options), I.flatMap(checkRefinement))
            )
          case "encoder":
            return make(
              I.makeSchema(ast),
              (u, options) => pipe(checkRefinement(u), I.flatMap((a) => type.parse(a, options)))
            )
        }
      }
      case "Transform": {
        switch (as) {
          case "decoder": {
            const from = go(ast.from)
            return make(
              I.makeSchema(ast),
              (u, options) => pipe(from.parse(u, options), I.flatMap((a) => ast.decode(a, options)))
            )
          }
          case "guard":
            return go(ast.to)
          case "encoder": {
            const from = go(ast.from)
            return make(
              I.makeSchema(AST.createTransform(ast.to, ast.from, ast.encode, ast.decode)),
              (a, options) => pipe(ast.encode(a, options), I.flatMap((a) => from.parse(a, options)))
            )
          }
        }
      }
    }
  }

  return go(schema.ast)
}

const unknownArray = AST.createTuple([], O.some([AST.unknownKeyword]), true)

const unknownRecord = AST.createTypeLiteral([], [
  AST.createIndexSignature(AST.stringKeyword, AST.unknownKeyword, true),
  AST.createIndexSignature(AST.symbolKeyword, AST.unknownKeyword, true)
])
