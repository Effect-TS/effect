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
import * as H from "@effect/schema/annotation/Hook"
import * as AST from "@effect/schema/AST"
import type { ParseOptions } from "@effect/schema/AST"
import { formatErrors } from "@effect/schema/formatter/Tree"
import * as I from "@effect/schema/internal/common"
import * as PR from "@effect/schema/ParseResult"
import type { ParseResult } from "@effect/schema/ParseResult"
import type { Infer, Schema } from "@effect/schema/Schema"

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
              for (const key of Reflect.ownKeys(input)) {
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
        const searchTree = _getSearchTree(types, as)
        const ownKeys = Reflect.ownKeys(searchTree.keys)
        const len = ownKeys.length
        return make(I.makeSchema(ast), (input, options) => {
          const es: Array<PR.ParseError> = []

          if (len > 0) {
            // if there is at least one key then input must be an object
            if (isRecord(input)) {
              for (let i = 0; i < len; i++) {
                const name = ownKeys[i]
                const buckets = searchTree.keys[name].buckets
                // for each property that should contain a literal, check if the input contains that property
                if (Object.prototype.hasOwnProperty.call(input, name)) {
                  const literal = String(input[name])
                  // check that the value obtained from the input for the property corresponds to an existing bucket
                  if (Object.prototype.hasOwnProperty.call(buckets, literal)) {
                    // retrive the minimal set of candidates for decoding
                    const bucket = buckets[literal]
                    for (let i = 0; i < bucket.length; i++) {
                      const t = bucket[i].parse(input, options)
                      if (PR.isSuccess(t)) {
                        return t
                      } else {
                        es.push(PR.unionMember(t.left))
                      }
                    }
                  } else {
                    es.push(
                      PR.key(name, [
                        PR.type(
                          searchTree.keys[name].ast,
                          input[name]
                        )
                      ])
                    )
                  }
                } else {
                  es.push(PR.key(name, [PR.missing]))
                }
              }
            } else {
              es.push(PR.type(unknownRecord, input))
            }
          }
          // if none of the schemas with at least one property with a literal value succeeded,
          // proceed with those that have no literal at all
          const otherwise = searchTree.otherwise
          for (let i = 0; i < otherwise.length; i++) {
            const t = otherwise[i].parse(input, options)
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
            PR.failure(PR.type(AST.neverKeyword, input))
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

/** @internal */
export const _getLiterals = (
  ast: AST.AST,
  as: "decoder" | "guard" | "encoder"
): ReadonlyArray<[PropertyKey, AST.Literal]> => {
  switch (ast._tag) {
    case "TypeAlias":
      return _getLiterals(ast.type, as)
    case "TypeLiteral": {
      const out: Array<[PropertyKey, AST.Literal]> = []
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const propertySignature = ast.propertySignatures[i]
        if (AST.isLiteral(propertySignature.type) && !propertySignature.isOptional) {
          out.push([propertySignature.name, propertySignature.type])
        }
      }
      return out
    }
    case "Refinement":
      return _getLiterals(ast.from, as)
    case "Transform":
      return as === "decoder" ?
        _getLiterals(ast.from, as) :
        _getLiterals(ast.to, as)
  }
  return []
}

/**
 * The purpose of the algorithm is to narrow down the pool of possible candidates for decoding as much as possible.
 *
 * This function separates the schemas into two groups, `keys` and `otherwise`:
 *
 * - `keys`: the schema has at least one property with a literal value
 * - `otherwise`: the schema has no properties with a literal value
 *
 * If a schema has at least one property with a literal value, so it ends up in `keys`, first a namespace is created for
 * the name of the property containing the literal, and then within this namespace a "bucket" is created for the literal
 * value in which to store all the schemas that have the same property and literal value.
 *
 * @internal
 */
export const _getSearchTree = <A extends Schema<any>>(
  members: ReadonlyArray<A>,
  as: "decoder" | "guard" | "encoder"
): {
  keys: {
    readonly [key: PropertyKey]: {
      buckets: { [literal: string]: ReadonlyArray<A> }
      ast: AST.AST // this is for error messages
    }
  }
  otherwise: ReadonlyArray<A>
} => {
  const keys: {
    [key: PropertyKey]: {
      buckets: { [literal: string]: Array<A> }
      ast: AST.AST
    }
  } = {}
  const otherwise: Array<A> = []
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    const tags = _getLiterals(member.ast, as)
    if (tags.length > 0) {
      for (let j = 0; j < tags.length; j++) {
        const [key, literal] = tags[j]
        const hash = String(literal.literal)
        keys[key] = keys[key] || { buckets: {}, ast: AST.neverKeyword }
        const buckets = keys[key].buckets
        if (Object.prototype.hasOwnProperty.call(buckets, hash)) {
          if (j < tags.length - 1) {
            continue
          }
          buckets[hash].push(member)
          keys[key].ast = AST.createUnion([keys[key].ast, literal])
        } else {
          buckets[hash] = [member]
          keys[key].ast = AST.createUnion([keys[key].ast, literal])
          break
        }
      }
    } else {
      otherwise.push(member)
    }
  }
  return { keys, otherwise }
}

const unknownArray = AST.createTuple([], O.some([AST.unknownKeyword]), true)

const unknownRecord = AST.createTypeLiteral([], [
  AST.createIndexSignature(AST.stringKeyword, AST.unknownKeyword, true),
  AST.createIndexSignature(AST.symbolKeyword, AST.unknownKeyword, true)
])
