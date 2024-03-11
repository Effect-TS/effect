/**
 * @since 1.0.0
 */

import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type { Concurrency, Mutable } from "effect/Types"
import * as AST from "./AST.js"
import * as _parseResult from "./internal/parseResult.js"
import * as _util from "./internal/util.js"
import type * as ParseResult from "./ParseResult.js"
import type * as Schema from "./Schema.js"
import * as TreeFormatter from "./TreeFormatter.js"

/** @internal */
export const mergeParseOptions = (
  a: AST.ParseOptions | undefined,
  b: AST.ParseOptions | undefined
): AST.ParseOptions | undefined => {
  if (a === undefined) {
    return b
  }
  if (b === undefined) {
    return a
  }
  const out: Mutable<AST.ParseOptions> = {}
  out.errors = b.errors ?? a.errors
  out.onExcessProperty = b.onExcessProperty ?? a.onExcessProperty
  return out
}

const getEither = (ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = goMemo(ast, isDecoding)
  return (u: unknown, overrideOptions?: AST.ParseOptions): Either.Either<any, ParseResult.ParseIssue> =>
    parser(u, mergeParseOptions(options, overrideOptions)) as any
}

const getSync = (ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = getEither(ast, isDecoding, options)
  return (input: unknown, overrideOptions?: AST.ParseOptions) =>
    Either.getOrThrowWith(parser(input, overrideOptions), (e) => new Error(TreeFormatter.formatIssue(e)))
}

const getOption = (ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = getEither(ast, isDecoding, options)
  return (input: unknown, overrideOptions?: AST.ParseOptions): Option.Option<any> =>
    Option.getRight(parser(input, overrideOptions))
}

const getEffect = <R>(ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = goMemo(ast, isDecoding)
  return (input: unknown, overrideOptions?: AST.ParseOptions): Effect.Effect<any, ParseResult.ParseIssue, R> =>
    parser(input, { ...mergeParseOptions(options, overrideOptions), isEffectAllowed: true })
}

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknownSync = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => A => getSync(schema.ast, true, options)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknownOption = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Option.Option<A> => getOption(schema.ast, true, options)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknownEither = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Either.Either<A, ParseResult.ParseIssue> =>
  getEither(schema.ast, true, options)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknownPromise = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => {
  const parser = decodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: AST.ParseOptions): Promise<A> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknown = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<A, ParseResult.ParseIssue, R> =>
  getEffect(schema.ast, true, options)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknownSync = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => I => getSync(schema.ast, false, options)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknownOption = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Option.Option<I> => getOption(schema.ast, false, options)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknownEither = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Either.Either<I, ParseResult.ParseIssue> =>
  getEither(schema.ast, false, options)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknownPromise = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => {
  const parser = encodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: AST.ParseOptions): Promise<I> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknown = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<I, ParseResult.ParseIssue, R> =>
  getEffect(schema.ast, false, options)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeSync: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => A = decodeUnknownSync

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeOption: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => Option.Option<A> = decodeUnknownOption

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeEither: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => Either.Either<A, ParseResult.ParseIssue> = decodeUnknownEither

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodePromise: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => Promise<A> = decodeUnknownPromise

/**
 * @category decoding
 * @since 1.0.0
 */
export const decode: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => Effect.Effect<A, ParseResult.ParseIssue, R> = decodeUnknown

/**
 * @category validation
 * @since 1.0.0
 */
export const validateSync = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => A => getSync(AST.typeAST(schema.ast), true, options)

/**
 * @category validation
 * @since 1.0.0
 */
export const validateOption = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Option.Option<A> =>
  getOption(AST.typeAST(schema.ast), true, options)

/**
 * @category validation
 * @since 1.0.0
 */
export const validateEither = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Either.Either<A, ParseResult.ParseIssue> =>
  getEither(AST.typeAST(schema.ast), true, options)

/**
 * @category validation
 * @since 1.0.0
 */
export const validatePromise = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => {
  const parser = validate(schema, options)
  return (u: unknown, overrideOptions?: AST.ParseOptions): Promise<A> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category validation
 * @since 1.0.0
 */
export const validate = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (a: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<A, ParseResult.ParseIssue, R> =>
  getEffect(AST.typeAST(schema.ast), true, options)

/**
 * @category validation
 * @since 1.0.0
 */
export const is = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: AST.ParseOptions) => {
  const parser = goMemo(AST.typeAST(schema.ast), true)
  return (u: unknown, overrideOptions?: AST.ParseOptions): u is A =>
    Either.isRight(parser(u, { ...mergeParseOptions(options, overrideOptions), isExact: true }) as any)
}

/**
 * @category validation
 * @since 1.0.0
 */
export const asserts = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: AST.ParseOptions) => {
  const parser = goMemo(AST.typeAST(schema.ast), true)
  return (u: unknown, overrideOptions?: AST.ParseOptions): asserts u is A => {
    const result: Either.Either<any, ParseResult.ParseIssue> = parser(u, {
      ...mergeParseOptions(options, overrideOptions),
      isExact: true
    }) as any
    if (Either.isLeft(result)) {
      throw new Error(TreeFormatter.formatIssue(result.left))
    }
  }
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeSync: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (a: A, overrideOptions?: AST.ParseOptions) => I = encodeUnknownSync

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeOption: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (input: A, overrideOptions?: AST.ParseOptions) => Option.Option<I> = encodeUnknownOption

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeEither: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (a: A, overrideOptions?: AST.ParseOptions) => Either.Either<I, ParseResult.ParseIssue> = encodeUnknownEither

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodePromise: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (a: A, overrideOptions?: AST.ParseOptions) => Promise<I> = encodeUnknownPromise

/**
 * @category encoding
 * @since 1.0.0
 */
export const encode: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
) => (a: A, overrideOptions?: AST.ParseOptions) => Effect.Effect<I, ParseResult.ParseIssue, R> = encodeUnknown

interface InternalOptions extends AST.ParseOptions {
  readonly isEffectAllowed?: boolean
  // `isExact = false` means that missing keys are treated as undefined values (`{ key: undefined }`)
  readonly isExact?: boolean
}

interface Parser {
  (i: any, options?: InternalOptions): Effect.Effect<any, ParseResult.ParseIssue, any>
}

const decodeMemoMap = globalValue(
  Symbol.for("@effect/schema/Parser/decodeMemoMap"),
  () => new WeakMap<AST.AST, Parser>()
)
const encodeMemoMap = globalValue(
  Symbol.for("@effect/schema/Parser/encodeMemoMap"),
  () => new WeakMap<AST.AST, Parser>()
)

const goMemo = (ast: AST.AST, isDecoding: boolean): Parser => {
  const memoMap = isDecoding ? decodeMemoMap : encodeMemoMap
  const memo = memoMap.get(ast)
  if (memo) {
    return memo
  }
  const parser = go(ast, isDecoding)
  memoMap.set(ast, parser)
  return parser
}

const getConcurrency = (ast: AST.AST): Concurrency | undefined =>
  Option.getOrUndefined(AST.getConcurrencyAnnotation(ast))

const getBatching = (ast: AST.AST): boolean | "inherit" | undefined =>
  Option.getOrUndefined(AST.getBatchingAnnotation(ast))

const go = (ast: AST.AST, isDecoding: boolean): Parser => {
  switch (ast._tag) {
    case "Refinement": {
      if (isDecoding) {
        const from = goMemo(ast.from, true)
        return (i, options) =>
          handleForbidden(
            _parseResult.flatMap(
              _parseResult.mapError(from(i, options), (e) => new _parseResult.Refinement(ast, i, "From", e)),
              (a) =>
                Option.match(
                  ast.filter(a, options ?? AST.defaultParseOption, ast),
                  {
                    onNone: () => Either.right(a),
                    onSome: (e) => Either.left(new _parseResult.Refinement(ast, i, "Predicate", e))
                  }
                )
            ),
            ast,
            i,
            options
          )
      } else {
        const from = goMemo(AST.typeAST(ast), true)
        const to = goMemo(dropRightRefinement(ast.from), false)
        return (i, options) =>
          handleForbidden(_parseResult.flatMap(from(i, options), (a) => to(a, options)), ast, i, options)
      }
    }
    case "Transformation": {
      const transform = getFinalTransformation(ast.transformation, isDecoding)
      const from = isDecoding ? goMemo(ast.from, true) : goMemo(ast.to, false)
      const to = isDecoding ? goMemo(ast.to, true) : goMemo(ast.from, false)
      return (i1, options) =>
        handleForbidden(
          _parseResult.flatMap(
            _parseResult.mapError(
              from(i1, options),
              (e) => new _parseResult.Transformation(ast, i1, isDecoding ? "Encoded" : "Type", e)
            ),
            (a) =>
              _parseResult.flatMap(
                _parseResult.mapError(
                  transform(a, options ?? AST.defaultParseOption, ast),
                  (e) => new _parseResult.Transformation(ast, i1, "Transformation", e)
                ),
                (i2) =>
                  _parseResult.mapError(
                    to(i2, options),
                    (e) => new _parseResult.Transformation(ast, i1, isDecoding ? "Type" : "Encoded", e)
                  )
              )
          ),
          ast,
          i1,
          options
        )
    }
    case "Declaration": {
      const parse = isDecoding
        ? ast.decodeUnknown(...ast.typeParameters)
        : ast.encodeUnknown(...ast.typeParameters)
      return (i, options) =>
        handleForbidden(
          _parseResult.mapError(parse(i, options ?? AST.defaultParseOption, ast), (e) =>
            new _parseResult.Declaration(ast, i, e)),
          ast,
          i,
          options
        )
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
      return Either.right
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
      const regex = AST.getTemplateLiteralRegex(ast)
      return fromRefinement(ast, (u): u is any => Predicate.isString(u) && regex.test(u))
    }
    case "TupleType": {
      const elements = ast.elements.map((e) => goMemo(e.type, isDecoding))
      const rest = ast.rest.map((ast) => goMemo(ast, isDecoding))
      let requiredLen = ast.elements.filter((e) => !e.isOptional).length
      if (ast.rest.length > 0) {
        requiredLen += ast.rest.length - 1
      }
      const expectedAST = AST.Union.make(ast.elements.map((_, i) => new AST.Literal(i)))
      const concurrency = getConcurrency(ast)
      const batching = getBatching(ast)
      return (input: unknown, options) => {
        if (!Array.isArray(input)) {
          return Either.left(new _parseResult.Type(ast, input))
        }
        const allErrors = options?.errors === "all"
        const es: Array<[number, ParseResult.Index]> = []
        let stepKey = 0
        // ---------------------------------------------
        // handle missing indexes
        // ---------------------------------------------
        const len = input.length
        for (let i = len; i <= requiredLen - 1; i++) {
          const e = new _parseResult.Index(i, _parseResult.missing)
          if (allErrors) {
            es.push([stepKey++, e])
            continue
          } else {
            return Either.left(new _parseResult.Tuple(ast, input, [e]))
          }
        }

        // ---------------------------------------------
        // handle excess indexes
        // ---------------------------------------------
        if (ast.rest.length === 0) {
          for (let i = ast.elements.length; i <= len - 1; i++) {
            const e = new _parseResult.Index(i, new _parseResult.Unexpected(expectedAST))
            if (allErrors) {
              es.push([stepKey++, e])
              continue
            } else {
              return Either.left(new _parseResult.Tuple(ast, input, [e]))
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
          | Array<(_: State) => Effect.Effect<void, ParseResult.ParseIssue, any>>
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
            const eu = _parseResult.eitherOrUndefined(te)
            if (eu) {
              if (Either.isLeft(eu)) {
                // the input element is present but is not valid
                const e = new _parseResult.Index(i, eu.left)
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return Either.left(new _parseResult.Tuple(ast, input, [e]))
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
                    const e = new _parseResult.Index(index, t.left)
                    if (allErrors) {
                      es.push([nk, e])
                      return Effect.unit
                    } else {
                      return Either.left(new _parseResult.Tuple(ast, input, [e]))
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
        if (ReadonlyArray.isNonEmptyReadonlyArray(rest)) {
          const [head, ...tail] = rest
          for (; i < len - tail.length; i++) {
            const te = head(input[i], options)
            const eu = _parseResult.eitherOrUndefined(te)
            if (eu) {
              if (Either.isLeft(eu)) {
                const e = new _parseResult.Index(i, eu.left)
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return Either.left(new _parseResult.Tuple(ast, input, [e]))
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
                      const e = new _parseResult.Index(index, t.left)
                      if (allErrors) {
                        es.push([nk, e])
                        return Effect.unit
                      } else {
                        return Either.left(new _parseResult.Tuple(ast, input, [e]))
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
              const eu = _parseResult.eitherOrUndefined(te)
              if (eu) {
                if (Either.isLeft(eu)) {
                  // the input element is present but is not valid
                  const e = new _parseResult.Index(i, eu.left)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return Either.left(new _parseResult.Tuple(ast, input, [e]))
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
                        const e = new _parseResult.Index(index, t.left)
                        if (allErrors) {
                          es.push([nk, e])
                          return Effect.unit
                        } else {
                          return Either.left(new _parseResult.Tuple(ast, input, [e]))
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
            Either.left(new _parseResult.Tuple(ast, input, sortByIndex(es))) :
            Either.right(sortByIndex(output))
        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = {
              es: Array.from(es),
              output: Array.from(output)
            }
            return Effect.flatMap(
              Effect.forEach(cqueue, (f) => f(state), { concurrency, batching, discard: true }),
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

      const propertySignatures: Array<readonly [Parser, AST.PropertySignature]> = []
      const expectedKeys: Record<PropertyKey, null> = {}
      for (const ps of ast.propertySignatures) {
        propertySignatures.push([goMemo(ps.type, isDecoding), ps])
        expectedKeys[ps.name] = null
      }

      const indexSignatures = ast.indexSignatures.map((is) =>
        [
          goMemo(is.parameter, isDecoding),
          goMemo(is.type, isDecoding),
          is.parameter
        ] as const
      )
      const expectedAST = AST.Union.make(
        ast.indexSignatures.map((is): AST.AST => is.parameter).concat(
          _util.ownKeys(expectedKeys).map((key) =>
            Predicate.isSymbol(key) ? new AST.UniqueSymbol(key) : new AST.Literal(key)
          )
        )
      )
      const expected = goMemo(expectedAST, isDecoding)
      const concurrency = getConcurrency(ast)
      const batching = getBatching(ast)
      return (input: unknown, options) => {
        if (!Predicate.isRecord(input)) {
          return Either.left(new _parseResult.Type(ast, input))
        }
        const allErrors = options?.errors === "all"
        const es: Array<[number, ParseResult.Key]> = []
        let stepKey = 0

        // ---------------------------------------------
        // handle excess properties
        // ---------------------------------------------
        const onExcessPropertyError = options?.onExcessProperty === "error"
        const onExcessPropertyPreserve = options?.onExcessProperty === "preserve"
        const output: any = {}
        if (onExcessPropertyError || onExcessPropertyPreserve) {
          for (const key of _util.ownKeys(input)) {
            const eu = _parseResult.eitherOrUndefined(expected(key, options))!
            if (Either.isLeft(eu)) {
              // key is unexpected
              if (onExcessPropertyError) {
                const e = new _parseResult.Key(key, new _parseResult.Unexpected(expectedAST))
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return Either.left(new _parseResult.TypeLiteral(ast, input, [e]))
                }
              } else {
                // preserve key
                output[key] = input[key]
              }
            }
          }
        }

        // ---------------------------------------------
        // handle property signatures
        // ---------------------------------------------
        type State = {
          es: typeof es
          output: typeof output
        }
        let queue:
          | Array<(state: State) => Effect.Effect<void, ParseResult.ParseIssue, any>>
          | undefined = undefined

        const isExact = options?.isExact === true
        for (let i = 0; i < propertySignatures.length; i++) {
          const ps = propertySignatures[i][1]
          const name = ps.name
          const hasKey = Object.prototype.hasOwnProperty.call(input, name)
          if (!hasKey) {
            if (ps.isOptional) {
              continue
            } else if (isExact) {
              const e = new _parseResult.Key(name, _parseResult.missing)
              if (allErrors) {
                es.push([stepKey++, e])
                continue
              } else {
                return Either.left(new _parseResult.TypeLiteral(ast, input, [e]))
              }
            }
          }
          const parser = propertySignatures[i][0]
          const te = parser(input[name], options)
          const eu = _parseResult.eitherOrUndefined(te)
          if (eu) {
            if (Either.isLeft(eu)) {
              const e = new _parseResult.Key(name, hasKey ? eu.left : _parseResult.missing)
              if (allErrors) {
                es.push([stepKey++, e])
                continue
              } else {
                return Either.left(new _parseResult.TypeLiteral(ast, input, [e]))
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
                    const e = new _parseResult.Key(index, hasKey ? t.left : _parseResult.missing)
                    if (allErrors) {
                      es.push([nk, e])
                      return Effect.unit
                    } else {
                      return Either.left(new _parseResult.TypeLiteral(ast, input, [e]))
                    }
                  }
                  output[index] = t.right
                  return Effect.unit
                })
            )
          }
        }

        // ---------------------------------------------
        // handle index signatures
        // ---------------------------------------------
        for (let i = 0; i < indexSignatures.length; i++) {
          const indexSignature = indexSignatures[i]
          const parameter = indexSignature[0]
          const type = indexSignature[1]
          const keys = _util.getKeysForIndexSignature(input, indexSignature[2])
          for (const key of keys) {
            // ---------------------------------------------
            // handle keys
            // ---------------------------------------------
            const keu = _parseResult.eitherOrUndefined(parameter(key, options))
            if (keu && Either.isRight(keu)) {
              // ---------------------------------------------
              // handle values
              // ---------------------------------------------
              const vpr = type(input[key], options)
              const veu = _parseResult.eitherOrUndefined(vpr)
              if (veu) {
                if (Either.isLeft(veu)) {
                  const e = new _parseResult.Key(key, veu.left)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return Either.left(new _parseResult.TypeLiteral(ast, input, [e]))
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
                          const e = new _parseResult.Key(index, tv.left)
                          if (allErrors) {
                            es.push([nk, e])
                            return Effect.unit
                          } else {
                            return Either.left(new _parseResult.TypeLiteral(ast, input, [e]))
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
            Either.left(new _parseResult.TypeLiteral(ast, input, sortByIndex(es))) :
            Either.right(output)
        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = {
              es: Array.from(es),
              output: Object.assign({}, output)
            }
            return Effect.flatMap(
              Effect.forEach(cqueue, (f) => f(state), { concurrency, batching, discard: true }),
              () => computeResult(state)
            )
          })
        }
        return computeResult({ es, output })
      }
    }
    case "Union": {
      const searchTree = getSearchTree(ast.types, isDecoding)
      const ownKeys = _util.ownKeys(searchTree.keys)
      const len = ownKeys.length
      const map = new Map<any, Parser>()
      for (let i = 0; i < ast.types.length; i++) {
        map.set(ast.types[i], goMemo(ast.types[i], isDecoding))
      }
      const concurrency = getConcurrency(ast) ?? 1
      const batching = getBatching(ast)
      return (input, options) => {
        const es: Array<[number, ParseResult.Type | ParseResult.TypeLiteral | ParseResult.Member]> = []
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
                  const literals = AST.Union.make(searchTree.keys[name].literals)
                  es.push([
                    stepKey++,
                    new _parseResult.TypeLiteral(
                      new AST.TypeLiteral([
                        new AST.PropertySignature(name, literals, false, true)
                      ], []),
                      input,
                      [new _parseResult.Key(name, new _parseResult.Type(literals, input[name]))]
                    )
                  ])
                }
              } else {
                const literals = AST.Union.make(searchTree.keys[name].literals)
                es.push([
                  stepKey++,
                  new _parseResult.TypeLiteral(
                    new AST.TypeLiteral([
                      new AST.PropertySignature(name, literals, false, true)
                    ], []),
                    input,
                    [new _parseResult.Key(name, _parseResult.missing)]
                  )
                ])
              }
            }
          } else {
            es.push([stepKey++, new _parseResult.Type(ast, input)])
          }
        }
        if (searchTree.otherwise.length > 0) {
          candidates = candidates.concat(searchTree.otherwise)
        }

        let queue:
          | Array<(state: State) => Effect.Effect<unknown, ParseResult.ParseIssue, any>>
          | undefined = undefined

        type State = {
          finalResult?: any
          es: typeof es
        }

        for (let i = 0; i < candidates.length; i++) {
          const candidate = candidates[i]
          const pr = map.get(candidate)!(input, options)
          // the members of a union are ordered based on which one should be decoded first,
          // therefore if one member has added a task, all subsequent members must
          // also add a task to the queue even if they are synchronous
          const eu = !queue || queue.length === 0 ? _parseResult.eitherOrUndefined(pr) : undefined
          if (eu) {
            if (Either.isRight(eu)) {
              return Either.right(eu.right)
            } else {
              es.push([stepKey++, new _parseResult.Member(candidate, eu.left)])
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
                        state.finalResult = Either.right(t.right)
                      } else {
                        state.es.push([nk, new _parseResult.Member(candidate, t.left)])
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
            es.length === 1 && es[0][1]._tag === "Type" ?
              Either.left(es[0][1]) :
              Either.left(new _parseResult.Union(ast, input, sortByIndex(es))) :
            // this should never happen
            Either.left(new _parseResult.Type(AST.neverKeyword, input))

        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = { es: Array.from(es) }
            return Effect.flatMap(
              Effect.forEach(cqueue, (f) => f(state), { concurrency, batching, discard: true }),
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
      const get = _util.memoizeThunk(() => goMemo(AST.annotations(ast.f(), ast.annotations), isDecoding))
      return (a, options) => get()(a, options)
    }
  }
}

const fromRefinement = <A>(ast: AST.AST, refinement: (u: unknown) => u is A): Parser => (u) =>
  refinement(u) ? Either.right(u) : Either.left(new _parseResult.Type(ast, u))

/** @internal */
export const getLiterals = (
  ast: AST.AST,
  isDecoding: boolean
): ReadonlyArray<[PropertyKey, AST.Literal]> => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = AST.getSurrogateSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        return getLiterals(annotation.value, isDecoding)
      }
      break
    }
    case "TypeLiteral": {
      const out: Array<[PropertyKey, AST.Literal]> = []
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const propertySignature = ast.propertySignatures[i]
        const type = isDecoding ? AST.encodedAST(propertySignature.type) : AST.typeAST(propertySignature.type)
        if (AST.isLiteral(type) && !propertySignature.isOptional) {
          out.push([propertySignature.name, type])
        }
      }
      return out
    }
    case "Refinement":
      return getLiterals(ast.from, isDecoding)
    case "Suspend":
      return getLiterals(ast.f(), isDecoding)
    case "Transformation":
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
      literals: ReadonlyArray<AST.Literal> // this is for error messages
    }
  }
  otherwise: ReadonlyArray<AST.AST>
} => {
  const keys: {
    [key: PropertyKey]: {
      buckets: { [literal: string]: Array<AST.AST> }
      literals: Array<AST.Literal>
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
        keys[key] = keys[key] || { buckets: {}, literals: [] }
        const buckets = keys[key].buckets
        if (Object.prototype.hasOwnProperty.call(buckets, hash)) {
          if (j < tags.length - 1) {
            continue
          }
          buckets[hash].push(member)
          keys[key].literals.push(literal)
        } else {
          buckets[hash] = [member]
          keys[key].literals.push(literal)
          break
        }
      }
    } else {
      otherwise.push(member)
    }
  }
  return { keys, otherwise }
}

const dropRightRefinement = (ast: AST.AST): AST.AST => AST.isRefinement(ast) ? dropRightRefinement(ast.from) : ast

const handleForbidden = <R, A>(
  effect: Effect.Effect<A, ParseResult.ParseIssue, R>,
  ast: AST.AST,
  actual: unknown,
  options: InternalOptions | undefined
): Effect.Effect<A, ParseResult.ParseIssue, R> => {
  const eu = _parseResult.eitherOrUndefined(effect)
  if (eu) {
    return eu
  }
  if (options?.isEffectAllowed === true) {
    return effect
  }
  try {
    return Effect.runSync(Effect.either(effect as Effect.Effect<A, ParseResult.ParseIssue>))
  } catch (e) {
    return Either.left(
      new _parseResult.Forbidden(
        ast,
        actual,
        "cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work"
      )
    )
  }
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

/** @internal */
export const getFinalTransformation = (
  transformation: AST.TransformationKind,
  isDecoding: boolean
): (
  input: any,
  options: AST.ParseOptions,
  self: AST.Transformation
) => Effect.Effect<any, ParseResult.ParseIssue, any> => {
  switch (transformation._tag) {
    case "FinalTransformation":
      return isDecoding ? transformation.decode : transformation.encode
    case "ComposeTransformation":
      return Either.right
    case "TypeLiteralTransformation":
      return (input) => {
        let out: Effect.Effect<any, ParseResult.ParseIssue, any> = Either.right(input)

        // ---------------------------------------------
        // handle property signature transformations
        // ---------------------------------------------
        for (const pst of transformation.propertySignatureTransformations) {
          const [from, to] = isDecoding ?
            [pst.from, pst.to] :
            [pst.to, pst.from]
          const transformation = isDecoding ? pst.decode : pst.encode
          const f = (input: any) => {
            const o = transformation(
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
          out = _parseResult.map(out, f)
        }
        return out
      }
  }
}
