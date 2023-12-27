/**
 * @since 1.0.0
 */

import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as AST from "./AST.js"
import * as Internal from "./internal/ast.js"
import * as ParseResult from "./ParseResult.js"
import type * as Schema from "./Schema.js"
import * as TreeFormatter from "./TreeFormatter.js"

/** @internal */
export const getEither = (
  ast: AST.AST,
  isDecoding: boolean
): (i: unknown, options?: AST.ParseOptions) => Either.Either<ParseResult.ParseError, any> =>
  goMemo(ast, isDecoding) as any

const getSync = (ast: AST.AST, isDecoding: boolean) => {
  const parser = getEither(ast, isDecoding)
  return (input: unknown, options?: AST.ParseOptions) => {
    const result = parser(input, options)
    if (Either.isLeft(result)) {
      throw new Error(TreeFormatter.formatErrors(result.left.errors))
    }
    return result.right
  }
}

const getOption = (ast: AST.AST, isDecoding: boolean) => {
  const parser = getEither(ast, isDecoding)
  return (input: unknown, options?: AST.ParseOptions): Option.Option<any> =>
    Option.getRight(parser(input, options))
}

const getEffect = (ast: AST.AST, isDecoding: boolean) => {
  const parser = goMemo(ast, isDecoding)
  return (input: unknown, options?: AST.ParseOptions) =>
    parser(input, { ...options, isEffectAllowed: true })
}

const getPromise = (ast: AST.AST, isDecoding: boolean) => {
  const parser = getEffect(ast, isDecoding)
  return (input: unknown, options?: AST.ParseOptions) => Effect.runPromise(parser(input, options))
}

/**
 * @category parsing
 * @since 1.0.0
 */
export const parseSync = <_, A>(
  schema: Schema.Schema<_, A>
): (i: unknown, options?: AST.ParseOptions) => A => getSync(schema.ast, true)

/**
 * @category parsing
 * @since 1.0.0
 */
export const parseOption = <_, A>(
  schema: Schema.Schema<_, A>
): (i: unknown, options?: AST.ParseOptions) => Option.Option<A> => getOption(schema.ast, true)

/**
 * @category parsing
 * @since 1.0.0
 */
export const parseEither = <_, A>(
  schema: Schema.Schema<_, A>
): (i: unknown, options?: AST.ParseOptions) => Either.Either<ParseResult.ParseError, A> =>
  getEither(schema.ast, true)

/**
 * @category parsing
 * @since 1.0.0
 */
export const parsePromise = <_, A>(
  schema: Schema.Schema<_, A>
): (i: unknown, options?: AST.ParseOptions) => Promise<A> => getPromise(schema.ast, true)

/**
 * @category parsing
 * @since 1.0.0
 */
export const parse = <_, A>(
  schema: Schema.Schema<_, A>
): (i: unknown, options?: AST.ParseOptions) => Effect.Effect<never, ParseResult.ParseError, A> =>
  getEffect(schema.ast, true)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeSync: <I, A>(
  schema: Schema.Schema<I, A>
) => (i: I, options?: AST.ParseOptions) => A = parseSync

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeOption: <I, A>(
  schema: Schema.Schema<I, A>
) => (i: I, options?: AST.ParseOptions) => Option.Option<A> = parseOption

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeEither: <I, A>(
  schema: Schema.Schema<I, A>
) => (i: I, options?: AST.ParseOptions) => Either.Either<ParseResult.ParseError, A> = parseEither

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodePromise: <I, A>(
  schema: Schema.Schema<I, A>
) => (i: I, options?: AST.ParseOptions) => Promise<A> = parsePromise

/**
 * @category decoding
 * @since 1.0.0
 */
export const decode: <I, A>(
  schema: Schema.Schema<I, A>
) => (i: I, options?: AST.ParseOptions) => Effect.Effect<never, ParseResult.ParseError, A> = parse

/**
 * @category validation
 * @since 1.0.0
 */
export const validateSync = <_, A>(
  schema: Schema.Schema<_, A>
): (a: unknown, options?: AST.ParseOptions) => A => getSync(AST.to(schema.ast), true)

/**
 * @category validation
 * @since 1.0.0
 */
export const validateOption = <_, A>(
  schema: Schema.Schema<_, A>
): (a: unknown, options?: AST.ParseOptions) => Option.Option<A> =>
  getOption(AST.to(schema.ast), true)

/**
 * @category validation
 * @since 1.0.0
 */
export const validateEither = <_, A>(
  schema: Schema.Schema<_, A>
): (a: unknown, options?: AST.ParseOptions) => Either.Either<ParseResult.ParseError, A> =>
  getEither(AST.to(schema.ast), true)

/**
 * @category validation
 * @since 1.0.0
 */
export const validatePromise = <_, A>(
  schema: Schema.Schema<_, A>
): (i: unknown, options?: AST.ParseOptions) => Promise<A> => getPromise(AST.to(schema.ast), true)

/**
 * @category validation
 * @since 1.0.0
 */
export const validate = <_, A>(
  schema: Schema.Schema<_, A>
): (a: unknown, options?: AST.ParseOptions) => Effect.Effect<never, ParseResult.ParseError, A> =>
  getEffect(AST.to(schema.ast), true)

/**
 * @category validation
 * @since 1.0.0
 */
export const is = <_, A>(schema: Schema.Schema<_, A>) => {
  const getEither = validateEither(schema)
  return (a: unknown): a is A => Either.isRight(getEither(a))
}

/**
 * @category validation
 * @since 1.0.0
 */
export const asserts = <_, A>(schema: Schema.Schema<_, A>) => {
  const get = validateSync(schema)
  return (a: unknown, options?: AST.ParseOptions): asserts a is A => {
    get(a, options)
  }
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeSync = <I, A>(
  schema: Schema.Schema<I, A>
): (a: A, options?: AST.ParseOptions) => I => getSync(schema.ast, false)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeOption = <I, A>(
  schema: Schema.Schema<I, A>
): (input: A, options?: AST.ParseOptions) => Option.Option<I> => getOption(schema.ast, false)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeEither = <I, A>(
  schema: Schema.Schema<I, A>
): (a: A, options?: AST.ParseOptions) => Either.Either<ParseResult.ParseError, I> =>
  getEither(schema.ast, false)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodePromise = <I, A>(
  schema: Schema.Schema<I, A>
): (a: A, options?: AST.ParseOptions) => Promise<I> => getPromise(schema.ast, false)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encode = <I, A>(
  schema: Schema.Schema<I, A>
): (a: A, options?: AST.ParseOptions) => Effect.Effect<never, ParseResult.ParseError, I> =>
  getEffect(schema.ast, false)

interface ParseEffectOptions extends AST.ParseOptions {
  readonly isEffectAllowed?: boolean
}

interface Parser<I, A> {
  (i: I, options?: ParseEffectOptions): ParseResult.ParseResult<A>
}

/**
 * @since 1.0.0"
 */
export const defaultParseOption: AST.ParseOptions = {}

const decodeMemoMap = globalValue(
  Symbol.for("@effect/schema/Parser/decodeMemoMap"),
  () => new WeakMap<AST.AST, Parser<any, any>>()
)
const encodeMemoMap = globalValue(
  Symbol.for("@effect/schema/Parser/encodeMemoMap"),
  () => new WeakMap<AST.AST, Parser<any, any>>()
)

const goMemo = (ast: AST.AST, isDecoding: boolean): Parser<any, any> => {
  const memoMap = isDecoding ? decodeMemoMap : encodeMemoMap
  const memo = memoMap.get(ast)
  if (memo) {
    return memo
  }
  const parser = go(ast, isDecoding)
  memoMap.set(ast, parser)
  return parser
}

const go = (ast: AST.AST, isDecoding: boolean): Parser<any, any> => {
  switch (ast._tag) {
    case "Refinement": {
      if (isDecoding) {
        const from = goMemo(ast.from, true)
        return (i, options) =>
          handleForbidden(
            ParseResult.flatMap(
              from(i, options),
              (a) =>
                Option.match(
                  ast.filter(a, options ?? defaultParseOption, ast),
                  {
                    onNone: () => ParseResult.succeed(a),
                    onSome: ParseResult.fail
                  }
                )
            ),
            options
          )
      } else {
        const from = goMemo(AST.to(ast), true)
        const to = goMemo(dropRightRefinement(ast.from), false)
        return (
          i,
          options
        ) => handleForbidden(ParseResult.flatMap(from(i, options), (a) => to(a, options)), options)
      }
    }
    case "Transform": {
      const transform = getFinalTransformation(ast.transformation, isDecoding)
      const from = isDecoding ? goMemo(ast.from, true) : goMemo(ast.to, false)
      const to = isDecoding ? goMemo(ast.to, true) : goMemo(ast.from, false)
      return (i1, options) =>
        handleForbidden(
          ParseResult.flatMap(
            from(i1, options),
            (a) =>
              ParseResult.flatMap(
                transform(a, options ?? defaultParseOption, ast),
                (i2) => to(i2, options)
              )
          ),
          options
        )
    }
    case "Declaration": {
      const parse = ast.decode(isDecoding, ...ast.typeParameters)
      return (i, options) => handleForbidden(parse(i, options ?? defaultParseOption, ast), options)
    }
    case "Literal":
      return fromRefinement(ast, (u): u is typeof ast.literal => u === ast.literal)
    case "UniqueSymbol":
      return fromRefinement(ast, (u): u is typeof ast.symbol => u === ast.symbol)
    case "UndefinedKeyword":
      return fromRefinement(ast, Predicate.isUndefined)
    case "VoidKeyword":
      return fromRefinement(ast, Predicate.isUndefined)
    case "NeverKeyword":
      return fromRefinement(ast, Predicate.isNever)
    case "UnknownKeyword":
    case "AnyKeyword":
      return ParseResult.succeed
    case "StringKeyword":
      return fromRefinement(ast, Predicate.isString)
    case "NumberKeyword":
      return fromRefinement(ast, Predicate.isNumber)
    case "BooleanKeyword":
      return fromRefinement(ast, Predicate.isBoolean)
    case "BigIntKeyword":
      return fromRefinement(ast, Predicate.isBigInt)
    case "SymbolKeyword":
      return fromRefinement(ast, Predicate.isSymbol)
    case "ObjectKeyword":
      return fromRefinement(ast, Predicate.isObject)
    case "Enums":
      return fromRefinement(ast, (u): u is any => ast.enums.some(([_, value]) => value === u))
    case "TemplateLiteral": {
      const regex = getTemplateLiteralRegex(ast)
      return fromRefinement(ast, (u): u is any => Predicate.isString(u) && regex.test(u))
    }
    case "Tuple": {
      const elements = ast.elements.map((e) => goMemo(e.type, isDecoding))
      const rest = Option.map(ast.rest, ReadonlyArray.map((ast) => goMemo(ast, isDecoding)))
      let requiredLen = ast.elements.filter((e) => !e.isOptional).length
      if (Option.isSome(ast.rest)) {
        requiredLen += ast.rest.value.length - 1
      }
      return (input: unknown, options) => {
        if (!Array.isArray(input)) {
          return ParseResult.fail(ParseResult.type(ast, input))
        }
        const allErrors = options?.errors === "all"
        const es: Array<[number, ParseResult.ParseIssue]> = []
        let stepKey = 0
        // ---------------------------------------------
        // handle missing indexes
        // ---------------------------------------------
        const len = input.length
        for (let i = len; i <= requiredLen - 1; i++) {
          const e = ParseResult.index(i, [ParseResult.missing])
          if (allErrors) {
            es.push([stepKey++, e])
            continue
          } else {
            return ParseResult.fail(e)
          }
        }

        // ---------------------------------------------
        // handle excess indexes
        // ---------------------------------------------
        if (Option.isNone(ast.rest)) {
          for (let i = ast.elements.length; i <= len - 1; i++) {
            const e = ParseResult.index(i, [ParseResult.unexpected(Option.none())])
            if (allErrors) {
              es.push([stepKey++, e])
              continue
            } else {
              return ParseResult.fail(mutableAppend(sortByIndex(es), e))
            }
          }
        }

        const output: Array<[number, any]> = []
        let i = 0
        type State = {
          es: typeof es
          output: typeof output
        }
        let queue:
          | Array<(_: State) => Effect.Effect<never, ParseResult.ParseError, void>>
          | undefined = undefined

        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        for (; i < elements.length; i++) {
          if (len < i + 1) {
            if (ast.elements[i].isOptional) {
              // the input element is missing
              continue
            }
          } else {
            const parser = elements[i]
            const te = parser(input[i], options)
            const eu = ParseResult.eitherOrUndefined(te)
            if (eu) {
              if (Either.isLeft(eu)) {
                // the input element is present but is not valid
                const e = ParseResult.index(i, eu.left.errors)
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                }
              }
              output.push([stepKey++, eu.right])
            } else {
              const nk = stepKey++
              const index = i
              if (!queue) {
                queue = []
              }
              queue.push(({ es, output }: State) =>
                Effect.flatMap(Effect.either(te), (t) => {
                  if (Either.isLeft(t)) {
                    // the input element is present but is not valid
                    const e = ParseResult.index(index, t.left.errors)
                    if (allErrors) {
                      es.push([nk, e])
                      return Effect.unit
                    } else {
                      return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                    }
                  }
                  output.push([nk, t.right])
                  return Effect.unit
                })
              )
            }
          }
        }
        // ---------------------------------------------
        // handle rest element
        // ---------------------------------------------
        if (Option.isSome(rest)) {
          const [head, ...tail] = rest.value
          for (; i < len - tail.length; i++) {
            const te = head(input[i], options)
            const eu = ParseResult.eitherOrUndefined(te)
            if (eu) {
              if (Either.isLeft(eu)) {
                const e = ParseResult.index(i, eu.left.errors)
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                }
              } else {
                output.push([stepKey++, eu.right])
              }
            } else {
              const nk = stepKey++
              const index = i
              if (!queue) {
                queue = []
              }
              queue.push(
                ({ es, output }: State) =>
                  Effect.flatMap(Effect.either(te), (t) => {
                    if (Either.isLeft(t)) {
                      const e = ParseResult.index(index, t.left.errors)
                      if (allErrors) {
                        es.push([nk, e])
                        return Effect.unit
                      } else {
                        return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                      }
                    } else {
                      output.push([nk, t.right])
                      return Effect.unit
                    }
                  })
              )
            }
          }
          // ---------------------------------------------
          // handle post rest elements
          // ---------------------------------------------
          for (let j = 0; j < tail.length; j++) {
            i += j
            if (len < i + 1) {
              continue
            } else {
              const te = tail[j](input[i], options)
              const eu = ParseResult.eitherOrUndefined(te)
              if (eu) {
                if (Either.isLeft(eu)) {
                  // the input element is present but is not valid
                  const e = ParseResult.index(i, eu.left.errors)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                  }
                }
                output.push([stepKey++, eu.right])
              } else {
                const nk = stepKey++
                const index = i
                if (!queue) {
                  queue = []
                }
                queue.push(
                  ({ es, output }: State) =>
                    Effect.flatMap(Effect.either(te), (t) => {
                      if (Either.isLeft(t)) {
                        // the input element is present but is not valid
                        const e = ParseResult.index(index, t.left.errors)
                        if (allErrors) {
                          es.push([nk, e])
                          return Effect.unit
                        } else {
                          return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                        }
                      }
                      output.push([nk, t.right])
                      return Effect.unit
                    })
                )
              }
            }
          }
        }

        // ---------------------------------------------
        // compute output
        // ---------------------------------------------
        const computeResult = ({ es, output }: State) =>
          ReadonlyArray.isNonEmptyArray(es) ?
            ParseResult.fail(sortByIndex(es)) :
            ParseResult.succeed(sortByIndex(output))
        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = {
              es: Array.from(es),
              output: Array.from(output)
            }
            return Effect.flatMap(
              Effect.forEach(cqueue, (f) => f(state), { concurrency: "unbounded", discard: true }),
              () => computeResult(state)
            )
          })
        }
        return computeResult({ output, es })
      }
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return fromRefinement(ast, Predicate.isNotNullable)
      }

      const propertySignatures: Array<Parser<any, any>> = []
      const expectedKeys: Record<PropertyKey, null> = {}
      for (const ps of ast.propertySignatures) {
        propertySignatures.push(goMemo(ps.type, isDecoding))
        expectedKeys[ps.name] = null
      }

      const indexSignatures = ast.indexSignatures.map((is) =>
        [
          goMemo(is.parameter, isDecoding),
          goMemo(is.type, isDecoding)
        ] as const
      )
      const expectedAST = AST.createUnion(
        ast.indexSignatures.map((is): AST.AST => is.parameter).concat(
          Internal.ownKeys(expectedKeys).map((key) =>
            Predicate.isSymbol(key) ? AST.createUniqueSymbol(key) : AST.createLiteral(key)
          )
        )
      )
      const expected = goMemo(expectedAST, isDecoding)

      return (input: unknown, options) => {
        if (!Predicate.isRecord(input)) {
          return ParseResult.fail(ParseResult.type(ast, input))
        }
        const allErrors = options?.errors === "all"
        const es: Array<[number, ParseResult.ParseIssue]> = []
        let stepKey = 0

        // ---------------------------------------------
        // handle excess properties
        // ---------------------------------------------
        const onExcessPropertyError = options?.onExcessProperty === "error"
        if (onExcessPropertyError) {
          for (const key of Internal.ownKeys(input)) {
            const eu = ParseResult.eitherOrUndefined(expected(key, options))
            if (eu && Either.isLeft(eu)) {
              const e = ParseResult.key(key, [ParseResult.unexpected(Option.some(expectedAST))])
              if (allErrors) {
                es.push([stepKey++, e])
                continue
              } else {
                return ParseResult.fail(mutableAppend(sortByIndex(es), e))
              }
            }
          }
        }

        // ---------------------------------------------
        // handle property signatures
        // ---------------------------------------------
        const output: any = {}
        type State = {
          es: typeof es
          output: typeof output
        }
        let queue:
          | Array<(state: State) => Effect.Effect<never, ParseResult.ParseError, void>>
          | undefined = undefined

        for (let i = 0; i < propertySignatures.length; i++) {
          const ps = ast.propertySignatures[i]
          const parser = propertySignatures[i]
          const name = ps.name
          if (Object.prototype.hasOwnProperty.call(input, name)) {
            const te = parser(input[name], options)
            const eu = ParseResult.eitherOrUndefined(te)
            if (eu) {
              if (Either.isLeft(eu)) {
                // the input key is present but is not valid
                const e = ParseResult.key(name, eu.left.errors)
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                }
              }
              output[name] = eu.right
            } else {
              const nk = stepKey++
              const index = name
              if (!queue) {
                queue = []
              }
              queue.push(
                ({ es, output }: State) =>
                  Effect.flatMap(Effect.either(te), (t) => {
                    if (Either.isLeft(t)) {
                      // the input key is present but is not valid
                      const e = ParseResult.key(index, t.left.errors)
                      if (allErrors) {
                        es.push([nk, e])
                        return Effect.unit
                      } else {
                        return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                      }
                    }
                    output[index] = t.right
                    return Effect.unit
                  })
              )
            }
          } else {
            // ---------------------------------------------
            // handle missing keys
            // ---------------------------------------------
            if (!ps.isOptional) {
              const e = ParseResult.key(name, [ParseResult.missing])
              if (allErrors) {
                es.push([stepKey++, e])
                continue
              } else {
                return ParseResult.fail(e)
              }
            }
          }
        }

        // ---------------------------------------------
        // handle index signatures
        // ---------------------------------------------
        for (let i = 0; i < indexSignatures.length; i++) {
          const indexSignature = indexSignatures[i]
          const parameter = indexSignature[0]
          const type = indexSignature[1]
          const keys = Internal.getKeysForIndexSignature(input, ast.indexSignatures[i].parameter)
          for (const key of keys) {
            // ---------------------------------------------
            // handle keys
            // ---------------------------------------------
            const keu = ParseResult.eitherOrUndefined(parameter(key, options))
            if (keu && Either.isRight(keu)) {
              // ---------------------------------------------
              // handle values
              // ---------------------------------------------
              const vpr = type(input[key], options)
              const veu = ParseResult.eitherOrUndefined(vpr)
              if (veu) {
                if (Either.isLeft(veu)) {
                  const e = ParseResult.key(key, veu.left.errors)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                  }
                } else {
                  if (!Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
                    output[key] = veu.right
                  }
                }
              } else {
                const nk = stepKey++
                const index = key
                if (!queue) {
                  queue = []
                }
                queue.push(
                  ({ es, output }: State) =>
                    Effect.flatMap(
                      Effect.either(vpr),
                      (tv) => {
                        if (Either.isLeft(tv)) {
                          const e = ParseResult.key(index, tv.left.errors)
                          if (allErrors) {
                            es.push([nk, e])
                            return Effect.unit
                          } else {
                            return ParseResult.fail(mutableAppend(sortByIndex(es), e))
                          }
                        } else {
                          if (!Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
                            output[key] = tv.right
                          }
                          return Effect.unit
                        }
                      }
                    )
                )
              }
            }
          }
        }
        // ---------------------------------------------
        // compute output
        // ---------------------------------------------
        const computeResult = ({ es, output }: State) =>
          ReadonlyArray.isNonEmptyArray(es) ?
            ParseResult.fail(sortByIndex(es)) :
            ParseResult.succeed(output)
        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = {
              es: Array.from(es),
              output: Object.assign({}, output)
            }
            return Effect.flatMap(
              Effect.forEach(cqueue, (f) => f(state), {
                concurrency: "unbounded",
                discard: true
              }),
              () => computeResult(state)
            )
          })
        }
        return computeResult({ es, output })
      }
    }
    case "Union": {
      const searchTree = getSearchTree(ast.types, isDecoding)
      const ownKeys = Internal.ownKeys(searchTree.keys)
      const len = ownKeys.length
      const map = new Map<any, Parser<any, any>>()
      for (let i = 0; i < ast.types.length; i++) {
        map.set(ast.types[i], goMemo(ast.types[i], isDecoding))
      }
      return (input, options) => {
        const es: Array<[number, ParseResult.ParseIssue]> = []
        let stepKey = 0
        let candidates: Array<AST.AST> = []
        if (len > 0) {
          // if there is at least one key then input must be an object
          if (Predicate.isRecord(input)) {
            for (let i = 0; i < len; i++) {
              const name = ownKeys[i]
              const buckets = searchTree.keys[name].buckets
              // for each property that should contain a literal, check if the input contains that property
              if (Object.prototype.hasOwnProperty.call(input, name)) {
                const literal = String(input[name])
                // check that the value obtained from the input for the property corresponds to an existing bucket
                if (Object.prototype.hasOwnProperty.call(buckets, literal)) {
                  // retrive the minimal set of candidates for decoding
                  candidates = candidates.concat(buckets[literal])
                } else {
                  es.push([
                    stepKey++,
                    ParseResult.key(name, [ParseResult.type(
                      searchTree.keys[name].ast,
                      input[name]
                    )])
                  ])
                }
              } else {
                es.push([stepKey++, ParseResult.key(name, [ParseResult.missing])])
              }
            }
          } else {
            es.push([stepKey++, ParseResult.type(ast, input)])
          }
        }
        if (searchTree.otherwise.length > 0) {
          candidates = candidates.concat(searchTree.otherwise)
        }

        let queue:
          | Array<(state: State) => Effect.Effect<never, ParseResult.ParseError, unknown>>
          | undefined = undefined

        type State = {
          finalResult?: any
          es: typeof es
        }

        for (let i = 0; i < candidates.length; i++) {
          const pr = map.get(candidates[i])!(input, options)
          // the members of a union are ordered based on which one should be decoded first,
          // therefore if one member has added a task, all subsequent members must
          // also add a task to the queue even if they are synchronous
          const eu = !queue || queue.length === 0 ? ParseResult.eitherOrUndefined(pr) : undefined
          if (eu) {
            if (Either.isRight(eu)) {
              return ParseResult.succeed(eu.right)
            } else {
              es.push([stepKey++, ParseResult.unionMember(eu.left.errors)])
            }
          } else {
            const nk = stepKey++
            if (!queue) {
              queue = []
            }
            queue.push(
              (state) =>
                Effect.suspend(() => {
                  if ("finalResult" in state) {
                    return Effect.unit
                  } else {
                    return Effect.flatMap(Effect.either(pr), (t) => {
                      if (Either.isRight(t)) {
                        state.finalResult = ParseResult.succeed(t.right)
                      } else {
                        state.es.push([nk, ParseResult.unionMember(t.left.errors)])
                      }
                      return Effect.unit
                    })
                  }
                })
            )
          }
        }

        // ---------------------------------------------
        // compute output
        // ---------------------------------------------
        const computeResult = (es: State["es"]) =>
          ReadonlyArray.isNonEmptyArray(es) ?
            ParseResult.fail(sortByIndex(es)) :
            // this should never happen
            ParseResult.fail(ParseResult.type(AST.neverKeyword, input))

        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = { es: Array.from(es) }
            return Effect.flatMap(
              Effect.forEach(cqueue, (f) => f(state), {
                concurrency: 1,
                discard: true
              }),
              () => {
                if ("finalResult" in state) {
                  return state.finalResult
                }
                return computeResult(state.es)
              }
            )
          })
        }
        return computeResult(es)
      }
    }
    case "Suspend": {
      const get = Internal.memoizeThunk(() => goMemo(ast.f(), isDecoding))
      return (a, options) => get()(a, options)
    }
  }
}

const fromRefinement =
  <A>(ast: AST.AST, refinement: (u: unknown) => u is A): Parser<unknown, A> => (u) =>
    refinement(u) ? ParseResult.succeed(u) : ParseResult.fail(ParseResult.type(ast, u))

/** @internal */
export const getLiterals = (
  ast: AST.AST,
  isDecoding: boolean
): ReadonlyArray<[PropertyKey, AST.Literal]> => {
  switch (ast._tag) {
    case "Declaration":
      return getLiterals(ast.type, isDecoding)
    case "TypeLiteral": {
      const out: Array<[PropertyKey, AST.Literal]> = []
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const propertySignature = ast.propertySignatures[i]
        const type = isDecoding ? AST.from(propertySignature.type) : AST.to(propertySignature.type)
        if (AST.isLiteral(type) && !propertySignature.isOptional) {
          out.push([propertySignature.name, type])
        }
      }
      return out
    }
    case "Refinement":
      return getLiterals(ast.from, isDecoding)
    case "Transform":
      return getLiterals(isDecoding ? ast.from : ast.to, isDecoding)
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
export const getSearchTree = (
  members: ReadonlyArray<AST.AST>,
  isDecoding: boolean
): {
  keys: {
    readonly [key: PropertyKey]: {
      buckets: { [literal: string]: ReadonlyArray<AST.AST> }
      ast: AST.AST // this is for error messages
    }
  }
  otherwise: ReadonlyArray<AST.AST>
} => {
  const keys: {
    [key: PropertyKey]: {
      buckets: { [literal: string]: Array<AST.AST> }
      ast: AST.AST
    }
  } = {}
  const otherwise: Array<AST.AST> = []
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    const tags = getLiterals(member, isDecoding)
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

const dropRightRefinement = (ast: AST.AST): AST.AST =>
  AST.isRefinement(ast) ? dropRightRefinement(ast.from) : ast

const handleForbidden = <A>(
  conditional: ParseResult.ParseResult<A>,
  options?: ParseEffectOptions
): ParseResult.ParseResult<A> => {
  const eu = ParseResult.eitherOrUndefined(conditional)
  return eu
    ? eu
    : options?.isEffectAllowed === true
    ? conditional
    : ParseResult.fail(ParseResult.forbidden)
}

const mutableAppend = <A>(self: Array<A>, a: A): ReadonlyArray.NonEmptyReadonlyArray<A> => {
  self.push(a)
  return self as any
}

/** @internal */
export const getTemplateLiteralRegex = (ast: AST.TemplateLiteral): RegExp => {
  let pattern = `^${ast.head}`
  for (const span of ast.spans) {
    if (AST.isStringKeyword(span.type)) {
      pattern += ".*"
    } else if (AST.isNumberKeyword(span.type)) {
      pattern += "[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?"
    }
    pattern += span.literal
  }
  pattern += "$"
  return new RegExp(pattern)
}

function sortByIndex<T>(
  es: ReadonlyArray.NonEmptyArray<[number, T]>
): ReadonlyArray.NonEmptyArray<T>
function sortByIndex<T>(es: Array<[number, T]>): Array<T>
function sortByIndex(es: Array<[number, any]>): any {
  return es.sort(([a], [b]) => a > b ? 1 : a < b ? -1 : 0).map(([_, a]) => a)
}

// -------------------------------------------------------------------------------------
// transformations interpreter
// -------------------------------------------------------------------------------------

const getFinalPropertySignatureTransformation = (
  transformation: AST.PropertySignatureTransformation,
  isDecoding: boolean
) => {
  switch (transformation._tag) {
    case "FinalPropertySignatureTransformation":
      return isDecoding ? transformation.decode : transformation.encode
  }
}

/** @internal */
export const getFinalTransformation = (
  transformation: AST.Transformation,
  isDecoding: boolean
): (input: any, options: AST.ParseOptions, self: AST.AST) => ParseResult.ParseResult<any> => {
  switch (transformation._tag) {
    case "FinalTransformation":
      return isDecoding ? transformation.decode : transformation.encode
    case "ComposeTransformation":
      return ParseResult.succeed
    case "TypeLiteralTransformation":
      return (input) => {
        let out: ParseResult.ParseResult<any> = Either.right(input)

        // ---------------------------------------------
        // handle property signature transformations
        // ---------------------------------------------
        for (const pst of transformation.propertySignatureTransformations) {
          const [from, to] = isDecoding ?
            [pst.from, pst.to] :
            [pst.to, pst.from]
          const transform = getFinalPropertySignatureTransformation(
            pst.propertySignatureTransformation,
            isDecoding
          )
          const f = (input: any) => {
            const o = transform(
              Object.prototype.hasOwnProperty.call(input, from) ?
                Option.some(input[from]) :
                Option.none()
            )
            delete input[from]
            if (Option.isSome(o)) {
              input[to] = o.value
            }
            return input
          }
          out = ParseResult.map(out, f)
        }
        return out
      }
  }
}
