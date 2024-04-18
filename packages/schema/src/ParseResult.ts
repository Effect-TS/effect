/**
 * @since 1.0.0
 */

import * as Arr from "effect/Array"
import { TaggedError } from "effect/Data"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import type { LazyArg } from "effect/Function"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import type { Concurrency, Mutable } from "effect/Types"
import * as AST from "./AST.js"
import * as util_ from "./internal/util.js"
import type * as Schema from "./Schema.js"
import * as TreeFormatter from "./TreeFormatter.js"

/**
 * `ParseIssue` is a type that represents the different types of errors that can occur when decoding/encoding a value.
 *
 * @category model
 * @since 1.0.0
 */
export type ParseIssue =
  | Declaration
  | Refinement
  | TupleType
  | TypeLiteral
  | Union
  | Transformation
  | Type
  | Forbidden

/**
 * Error that occurs when a declaration has an error.
 *
 * @category model
 * @since 1.0.0
 */
export class Declaration {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Declaration"
  constructor(readonly ast: AST.Declaration, readonly actual: unknown, readonly error: ParseIssue) {}
}

/**
 * Error that occurs when a refinement has an error.
 *
 * @category model
 * @since 1.0.0
 */
export class Refinement {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Refinement"
  constructor(
    readonly ast: AST.Refinement<AST.AST>,
    readonly actual: unknown,
    readonly kind: "From" | "Predicate",
    readonly error: ParseIssue
  ) {}
}

/**
 * Error that occurs when an array or tuple has an error.
 *
 * @category model
 * @since 1.0.0
 */
export class TupleType {
  /**
   * @since 1.0.0
   */
  readonly _tag = "TupleType"
  constructor(
    readonly ast: AST.TupleType,
    readonly actual: unknown,
    readonly errors: Arr.NonEmptyReadonlyArray<Index>,
    readonly output: ReadonlyArray<unknown> = []
  ) {}
}

/**
 * The `Index` error indicates that there was an error at a specific index in an array or tuple.
 *
 * @category model
 * @since 1.0.0
 */
export class Index {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Index"
  constructor(readonly index: number, readonly error: ParseIssue | Missing | Unexpected) {}
}

/**
 * Error that occurs when a type literal or record has an error.
 *
 * @category model
 * @since 1.0.0
 */
export class TypeLiteral {
  /**
   * @since 1.0.0
   */
  readonly _tag = "TypeLiteral"
  constructor(
    readonly ast: AST.TypeLiteral,
    readonly actual: unknown,
    readonly errors: Arr.NonEmptyReadonlyArray<Key>,
    readonly output: { readonly [x: string]: unknown } = {}
  ) {}
}

/**
 * The `Key` variant of the `ParseIssue` type represents an error that occurs when a key in a type literal or record is invalid.
 *
 * @category model
 * @since 1.0.0
 */
export class Key {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Key"
  constructor(readonly key: PropertyKey, readonly error: ParseIssue | Missing | Unexpected) {}
}

/**
 * Error that occurs when an unexpected key or index is present.
 *
 * @category model
 * @since 1.0.0
 */
export class Unexpected {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Unexpected"
  constructor(readonly ast: AST.AST) {}
}

/**
 * Error that occurs when a transformation has an error.
 *
 * @category model
 * @since 1.0.0
 */
export class Transformation {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Transformation"
  constructor(
    readonly ast: AST.Transformation,
    readonly actual: unknown,
    readonly kind: "Encoded" | "Transformation" | "Type",
    readonly error: ParseIssue
  ) {}
}

/**
 * The `Type` variant of the `ParseIssue` type represents an error that occurs when the `actual` value is not of the expected type.
 * The `ast` field specifies the expected type, and the `actual` field contains the value that caused the error.
 *
 * @category model
 * @since 1.0.0
 */
export class Type {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Type"
  /**
   * @since 1.0.0
   */
  readonly message: Option.Option<string>
  constructor(readonly ast: AST.AST, readonly actual: unknown, message?: string) {
    this.message = Option.fromNullable(message)
  }
}

/**
 * The `Forbidden` variant of the `ParseIssue` type represents a forbidden operation, such as when encountering an Effect that is not allowed to execute (e.g., using `runSync`).
 *
 * @category model
 * @since 1.0.0
 */
export class Forbidden {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Forbidden"
  /**
   * @since 1.0.0
   */
  readonly message: Option.Option<string>
  constructor(readonly ast: AST.AST, readonly actual: unknown, message?: string) {
    this.message = Option.fromNullable(message)
  }
}

/**
 * Error that occurs when a required key or index is missing.
 *
 * @category model
 * @since 1.0.0
 */
export class Missing {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Missing"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const missing: Missing = new Missing()

/**
 * Error that occurs when a member in a union has an error.
 *
 * @category model
 * @since 1.0.0
 */
export class Member {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Member"
  constructor(readonly ast: AST.AST, readonly error: ParseIssue) {}
}

/**
 * Error that occurs when a union has an error.
 *
 * @category model
 * @since 1.0.0
 */
export class Union {
  /**
   * @since 1.0.0
   */
  readonly _tag = "Union"
  constructor(
    readonly ast: AST.Union,
    readonly actual: unknown,
    readonly errors: Arr.NonEmptyReadonlyArray<Type | TypeLiteral | Member>
  ) {}
}

/**
 * @since 1.0.0
 */
export class ParseError extends TaggedError("ParseError")<{ readonly error: ParseIssue }> {
  get message() {
    return this.toString()
  }
  /**
   * @since 1.0.0
   */
  toString() {
    return TreeFormatter.formatIssueSync(this.error)
  }
  /**
   * @since 1.0.0
   */
  toJSON() {
    return {
      _id: "ParseError",
      message: this.toString()
    }
  }
  /**
   * @since 1.0.0
   */
  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const parseError = (issue: ParseIssue): ParseError => new ParseError({ error: issue })

/**
 * @category constructors
 * @since 1.0.0
 */
export const succeed: <A>(a: A) => Either.Either<A, ParseIssue> = Either.right

/**
 * @category constructors
 * @since 1.0.0
 */
export const fail: (issue: ParseIssue) => Either.Either<never, ParseIssue> = Either.left

const _try: <A>(options: {
  try: LazyArg<A>
  catch: (e: unknown) => ParseIssue
}) => Either.Either<A, ParseIssue> = Either.try

export {
  /**
   * @category constructors
   * @since 1.0.0
   */
  _try as try
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromOption: {
  (onNone: () => ParseIssue): <A>(self: Option.Option<A>) => Either.Either<A, ParseIssue>
  <A>(self: Option.Option<A>, onNone: () => ParseIssue): Either.Either<A, ParseIssue>
} = Either.fromOption

/**
 * @category optimisation
 * @since 1.0.0
 */
export const flatMap: {
  <A, B, E1, R1>(
    f: (a: A) => Effect.Effect<B, E1, R1>
  ): <E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<B, E1 | E, R1 | R>
  <A, E, R, B, E1, R1>(
    self: Effect.Effect<A, E, R>,
    f: (a: A) => Effect.Effect<B, E1, R1>
  ): Effect.Effect<B, E | E1, R | R1>
} = dual(2, <A, E, R, B, E1, R1>(
  self: Effect.Effect<A, E, R>,
  f: (a: A) => Effect.Effect<B, E1, R1>
): Effect.Effect<B, E | E1, R | R1> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return s
  }
  if (s["_tag"] === "Right") {
    return f(s.right)
  }
  return Effect.flatMap(self, f)
})

/**
 * @category optimisation
 * @since 1.0.0
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<B, E, R>
  <A, E, R, B>(self: Effect.Effect<A, E, R>, f: (a: A) => B): Effect.Effect<B, E, R>
} = dual(2, <A, E, R, B>(self: Effect.Effect<A, E, R>, f: (a: A) => B): Effect.Effect<B, E, R> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return s
  }
  if (s["_tag"] === "Right") {
    return Either.right(f(s.right))
  }
  return Effect.map(self, f)
})

/**
 * @category optimisation
 * @since 1.0.0
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E2, R>
  <A, E, R, E2>(self: Effect.Effect<A, E, R>, f: (e: E) => E2): Effect.Effect<A, E2, R>
} = dual(2, <A, E, R, E2>(self: Effect.Effect<A, E, R>, f: (e: E) => E2): Effect.Effect<A, E2, R> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return Either.left(f(s.left))
  }
  if (s["_tag"] === "Right") {
    return s
  }
  return Effect.mapError(self, f)
})

/**
 * @category optimisation
 * @since 1.0.0
 */
export const eitherOrUndefined = <A, E, R>(
  self: Effect.Effect<A, E, R>
): Either.Either<A, E> | undefined => {
  const s: any = self
  if (s["_tag"] === "Left" || s["_tag"] === "Right") {
    return s
  }
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const mapBoth: {
  <E, E2, A, A2>(
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): <R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A2, E2, R>
  <A, E, R, E2, A2>(
    self: Effect.Effect<A, E, R>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): Effect.Effect<A2, E2, R>
} = dual(2, <A, E, R, E2, A2>(
  self: Effect.Effect<A, E, R>,
  options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
): Effect.Effect<A2, E2, R> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return Either.left(options.onFailure(s.left))
  }
  if (s["_tag"] === "Right") {
    return Either.right(options.onSuccess(s.right))
  }
  return Effect.mapBoth(self, options)
})

/**
 * @category optimisation
 * @since 1.0.0
 */
export const orElse: {
  <E, A2, E2, R2>(
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect.Effect<A, E, R>,
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): Effect.Effect<A2 | A, E2, R2 | R>
} = dual(2, <A, E, R, A2, E2, R2>(
  self: Effect.Effect<A, E, R>,
  f: (e: E) => Effect.Effect<A2, E2, R2>
): Effect.Effect<A2 | A, E2, R2 | R> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return f(s.left)
  }
  if (s["_tag"] === "Right") {
    return s
  }
  return Effect.catchAll(self, f)
})

/**
 * @since 1.0.0
 */
export type DecodeUnknown<Out, R> = (u: unknown, options?: AST.ParseOptions) => Effect.Effect<Out, ParseIssue, R>

/**
 * @since 1.0.0
 */
export type DeclarationDecodeUnknown<Out, R> = (
  u: unknown,
  options: AST.ParseOptions,
  ast: AST.Declaration
) => Effect.Effect<Out, ParseIssue, R>

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
  return (u: unknown, overrideOptions?: AST.ParseOptions): Either.Either<any, ParseIssue> =>
    parser(u, mergeParseOptions(options, overrideOptions)) as any
}

const getSync = (ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = getEither(ast, isDecoding, options)
  return (input: unknown, overrideOptions?: AST.ParseOptions) =>
    Either.getOrThrowWith(parser(input, overrideOptions), (e) => new Error(TreeFormatter.formatIssueSync(e)))
}

const getOption = (ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = getEither(ast, isDecoding, options)
  return (input: unknown, overrideOptions?: AST.ParseOptions): Option.Option<any> =>
    Option.getRight(parser(input, overrideOptions))
}

const getEffect = <R>(ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = goMemo(ast, isDecoding)
  return (input: unknown, overrideOptions?: AST.ParseOptions): Effect.Effect<any, ParseIssue, R> =>
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
): (u: unknown, overrideOptions?: AST.ParseOptions) => Either.Either<A, ParseIssue> =>
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
): (u: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<A, ParseIssue, R> =>
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
): (u: unknown, overrideOptions?: AST.ParseOptions) => Either.Either<I, ParseIssue> =>
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
): (u: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<I, ParseIssue, R> =>
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
) => (i: I, overrideOptions?: AST.ParseOptions) => Either.Either<A, ParseIssue> = decodeUnknownEither

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
) => (i: I, overrideOptions?: AST.ParseOptions) => Effect.Effect<A, ParseIssue, R> = decodeUnknown

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
): (u: unknown, overrideOptions?: AST.ParseOptions) => Either.Either<A, ParseIssue> =>
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
): (a: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<A, ParseIssue, R> =>
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
    const result: Either.Either<any, ParseIssue> = parser(u, {
      ...mergeParseOptions(options, overrideOptions),
      isExact: true
    }) as any
    if (Either.isLeft(result)) {
      throw new Error(TreeFormatter.formatIssueSync(result.left))
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
) => (a: A, overrideOptions?: AST.ParseOptions) => Either.Either<I, ParseIssue> = encodeUnknownEither

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
) => (a: A, overrideOptions?: AST.ParseOptions) => Effect.Effect<I, ParseIssue, R> = encodeUnknown

interface InternalOptions extends AST.ParseOptions {
  readonly isEffectAllowed?: boolean
  // `isExact = false` means that missing keys are treated as undefined values (`{ key: undefined }`)
  readonly isExact?: boolean
}

interface Parser {
  (i: any, options?: InternalOptions): Effect.Effect<any, ParseIssue, any>
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
            flatMap(
              mapError(from(i, options), (e) => new Refinement(ast, i, "From", e)),
              (a) =>
                Option.match(
                  ast.filter(a, options ?? AST.defaultParseOption, ast),
                  {
                    onNone: () => Either.right(a),
                    onSome: (e) => Either.left(new Refinement(ast, i, "Predicate", e))
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
        return (i, options) => handleForbidden(flatMap(from(i, options), (a) => to(a, options)), ast, i, options)
      }
    }
    case "Transformation": {
      const transform = getFinalTransformation(ast.transformation, isDecoding)
      const from = isDecoding ? goMemo(ast.from, true) : goMemo(ast.to, false)
      const to = isDecoding ? goMemo(ast.to, true) : goMemo(ast.from, false)
      return (i1, options) =>
        handleForbidden(
          flatMap(
            mapError(
              from(i1, options),
              (e) => new Transformation(ast, i1, isDecoding ? "Encoded" : "Type", e)
            ),
            (a) =>
              flatMap(
                mapError(
                  transform(a, options ?? AST.defaultParseOption, ast),
                  (e) => new Transformation(ast, i1, "Transformation", e)
                ),
                (i2) =>
                  mapError(
                    to(i2, options),
                    (e) => new Transformation(ast, i1, isDecoding ? "Type" : "Encoded", e)
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
          mapError(parse(i, options ?? AST.defaultParseOption, ast), (e) => new Declaration(ast, i, e)),
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
      const regex = AST.getTemplateLiteralRegExp(ast)
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
        if (!Arr.isArray(input)) {
          return Either.left(new Type(ast, input))
        }
        const allErrors = options?.errors === "all"
        const es: Array<[number, Index]> = []
        let stepKey = 0
        // ---------------------------------------------
        // handle missing indexes
        // ---------------------------------------------
        const len = input.length
        for (let i = len; i <= requiredLen - 1; i++) {
          const e = new Index(i, missing)
          if (allErrors) {
            es.push([stepKey++, e])
            continue
          } else {
            return Either.left(new TupleType(ast, input, [e]))
          }
        }

        // ---------------------------------------------
        // handle excess indexes
        // ---------------------------------------------
        if (ast.rest.length === 0) {
          for (let i = ast.elements.length; i <= len - 1; i++) {
            const e = new Index(i, new Unexpected(expectedAST))
            if (allErrors) {
              es.push([stepKey++, e])
              continue
            } else {
              return Either.left(new TupleType(ast, input, [e]))
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
          | Array<(_: State) => Effect.Effect<void, ParseIssue, any>>
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
            const eu = eitherOrUndefined(te)
            if (eu) {
              if (Either.isLeft(eu)) {
                // the input element is present but is not valid
                const e = new Index(i, eu.left)
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return Either.left(new TupleType(ast, input, [e], sortByIndex(output)))
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
                    const e = new Index(index, t.left)
                    if (allErrors) {
                      es.push([nk, e])
                      return Effect.void
                    } else {
                      return Either.left(new TupleType(ast, input, [e], sortByIndex(output)))
                    }
                  }
                  output.push([nk, t.right])
                  return Effect.void
                })
              )
            }
          }
        }
        // ---------------------------------------------
        // handle rest element
        // ---------------------------------------------
        if (Arr.isNonEmptyReadonlyArray(rest)) {
          const [head, ...tail] = rest
          for (; i < len - tail.length; i++) {
            const te = head(input[i], options)
            const eu = eitherOrUndefined(te)
            if (eu) {
              if (Either.isLeft(eu)) {
                const e = new Index(i, eu.left)
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return Either.left(new TupleType(ast, input, [e], sortByIndex(output)))
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
                      const e = new Index(index, t.left)
                      if (allErrors) {
                        es.push([nk, e])
                        return Effect.void
                      } else {
                        return Either.left(new TupleType(ast, input, [e], sortByIndex(output)))
                      }
                    } else {
                      output.push([nk, t.right])
                      return Effect.void
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
              const eu = eitherOrUndefined(te)
              if (eu) {
                if (Either.isLeft(eu)) {
                  // the input element is present but is not valid
                  const e = new Index(i, eu.left)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return Either.left(new TupleType(ast, input, [e], sortByIndex(output)))
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
                        const e = new Index(index, t.left)
                        if (allErrors) {
                          es.push([nk, e])
                          return Effect.void
                        } else {
                          return Either.left(new TupleType(ast, input, [e], sortByIndex(output)))
                        }
                      }
                      output.push([nk, t.right])
                      return Effect.void
                    })
                )
              }
            }
          }
        }

        // ---------------------------------------------
        // compute result
        // ---------------------------------------------
        const computeResult = ({ es, output }: State) =>
          Arr.isNonEmptyArray(es) ?
            Either.left(new TupleType(ast, input, sortByIndex(es), sortByIndex(output))) :
            Either.right(sortByIndex(output))
        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = {
              es: Arr.copy(es),
              output: Arr.copy(output)
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
          util_.ownKeys(expectedKeys).map((key) =>
            Predicate.isSymbol(key) ? new AST.UniqueSymbol(key) : new AST.Literal(key)
          )
        )
      )
      const expected = goMemo(expectedAST, isDecoding)
      const concurrency = getConcurrency(ast)
      const batching = getBatching(ast)
      return (input: unknown, options) => {
        if (!Predicate.isRecord(input)) {
          return Either.left(new Type(ast, input))
        }
        const allErrors = options?.errors === "all"
        const es: Array<[number, Key]> = []
        let stepKey = 0

        // ---------------------------------------------
        // handle excess properties
        // ---------------------------------------------
        const onExcessPropertyError = options?.onExcessProperty === "error"
        const onExcessPropertyPreserve = options?.onExcessProperty === "preserve"
        const output: any = {}
        if (onExcessPropertyError || onExcessPropertyPreserve) {
          for (const key of util_.ownKeys(input)) {
            const eu = eitherOrUndefined(expected(key, options))!
            if (Either.isLeft(eu)) {
              // key is unexpected
              if (onExcessPropertyError) {
                const e = new Key(key, new Unexpected(expectedAST))
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return Either.left(new TypeLiteral(ast, input, [e], output))
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
          | Array<(state: State) => Effect.Effect<void, ParseIssue, any>>
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
              const e = new Key(name, missing)
              if (allErrors) {
                es.push([stepKey++, e])
                continue
              } else {
                return Either.left(new TypeLiteral(ast, input, [e], output))
              }
            }
          }
          const parser = propertySignatures[i][0]
          const te = parser(input[name], options)
          const eu = eitherOrUndefined(te)
          if (eu) {
            if (Either.isLeft(eu)) {
              const e = new Key(name, hasKey ? eu.left : missing)
              if (allErrors) {
                es.push([stepKey++, e])
                continue
              } else {
                return Either.left(new TypeLiteral(ast, input, [e], output))
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
                    const e = new Key(index, hasKey ? t.left : missing)
                    if (allErrors) {
                      es.push([nk, e])
                      return Effect.void
                    } else {
                      return Either.left(new TypeLiteral(ast, input, [e], output))
                    }
                  }
                  output[index] = t.right
                  return Effect.void
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
          const keys = util_.getKeysForIndexSignature(input, indexSignature[2])
          for (const key of keys) {
            // ---------------------------------------------
            // handle keys
            // ---------------------------------------------
            const keu = eitherOrUndefined(parameter(key, options))
            if (keu && Either.isRight(keu)) {
              // ---------------------------------------------
              // handle values
              // ---------------------------------------------
              const vpr = type(input[key], options)
              const veu = eitherOrUndefined(vpr)
              if (veu) {
                if (Either.isLeft(veu)) {
                  const e = new Key(key, veu.left)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return Either.left(new TypeLiteral(ast, input, [e], output))
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
                          const e = new Key(index, tv.left)
                          if (allErrors) {
                            es.push([nk, e])
                            return Effect.void
                          } else {
                            return Either.left(new TypeLiteral(ast, input, [e], output))
                          }
                        } else {
                          if (!Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
                            output[key] = tv.right
                          }
                          return Effect.void
                        }
                      }
                    )
                )
              }
            }
          }
        }
        // ---------------------------------------------
        // compute result
        // ---------------------------------------------
        const computeResult = ({ es, output }: State) =>
          Arr.isNonEmptyArray(es) ?
            Either.left(new TypeLiteral(ast, input, sortByIndex(es), output)) :
            Either.right(output)
        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = {
              es: Arr.copy(es),
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
      const ownKeys = util_.ownKeys(searchTree.keys)
      const len = ownKeys.length
      const map = new Map<any, Parser>()
      for (let i = 0; i < ast.types.length; i++) {
        map.set(ast.types[i], goMemo(ast.types[i], isDecoding))
      }
      const concurrency = getConcurrency(ast) ?? 1
      const batching = getBatching(ast)
      return (input, options) => {
        const es: Array<[number, Type | TypeLiteral | Member]> = []
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
                    new TypeLiteral(
                      new AST.TypeLiteral([
                        new AST.PropertySignature(name, literals, false, true)
                      ], []),
                      input,
                      [new Key(name, new Type(literals, input[name]))]
                    )
                  ])
                }
              } else {
                const literals = AST.Union.make(searchTree.keys[name].literals)
                es.push([
                  stepKey++,
                  new TypeLiteral(
                    new AST.TypeLiteral([
                      new AST.PropertySignature(name, literals, false, true)
                    ], []),
                    input,
                    [new Key(name, missing)]
                  )
                ])
              }
            }
          } else {
            es.push([stepKey++, new Type(ast, input)])
          }
        }
        if (searchTree.otherwise.length > 0) {
          candidates = candidates.concat(searchTree.otherwise)
        }

        let queue:
          | Array<(state: State) => Effect.Effect<unknown, ParseIssue, any>>
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
          const eu = !queue || queue.length === 0 ? eitherOrUndefined(pr) : undefined
          if (eu) {
            if (Either.isRight(eu)) {
              return Either.right(eu.right)
            } else {
              es.push([stepKey++, new Member(candidate, eu.left)])
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
                    return Effect.void
                  } else {
                    return Effect.flatMap(Effect.either(pr), (t) => {
                      if (Either.isRight(t)) {
                        state.finalResult = Either.right(t.right)
                      } else {
                        state.es.push([nk, new Member(candidate, t.left)])
                      }
                      return Effect.void
                    })
                  }
                })
            )
          }
        }

        // ---------------------------------------------
        // compute result
        // ---------------------------------------------
        const computeResult = (es: State["es"]) =>
          Arr.isNonEmptyArray(es) ?
            es.length === 1 && es[0][1]._tag === "Type" ?
              Either.left(es[0][1]) :
              Either.left(new Union(ast, input, sortByIndex(es))) :
            // this should never happen
            Either.left(new Type(AST.neverKeyword, input))

        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = { es: Arr.copy(es) }
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
      const get = util_.memoizeThunk(() => goMemo(AST.annotations(ast.f(), ast.annotations), isDecoding))
      return (a, options) => get()(a, options)
    }
  }
}

const fromRefinement = <A>(ast: AST.AST, refinement: (u: unknown) => u is A): Parser => (u) =>
  refinement(u) ? Either.right(u) : Either.left(new Type(ast, u))

/** @internal */
export const getLiterals = (
  ast: AST.AST,
  isDecoding: boolean
): ReadonlyArray<[PropertyKey, AST.Literal]> => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = AST.getSurrogateAnnotation(ast)
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
  effect: Effect.Effect<A, ParseIssue, R>,
  ast: AST.AST,
  actual: unknown,
  options: InternalOptions | undefined
): Effect.Effect<A, ParseIssue, R> => {
  const eu = eitherOrUndefined(effect)
  if (eu) {
    return eu
  }
  if (options?.isEffectAllowed === true) {
    return effect
  }
  try {
    return Effect.runSync(Effect.either(effect as Effect.Effect<A, ParseIssue>))
  } catch (e) {
    return Either.left(
      new Forbidden(
        ast,
        actual,
        "cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work"
      )
    )
  }
}

function sortByIndex<T>(
  es: Arr.NonEmptyArray<[number, T]>
): Arr.NonEmptyArray<T>
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
) => Effect.Effect<any, ParseIssue, any> => {
  switch (transformation._tag) {
    case "FinalTransformation":
      return isDecoding ? transformation.decode : transformation.encode
    case "ComposeTransformation":
      return Either.right
    case "TypeLiteralTransformation":
      return (input) => {
        let out: Effect.Effect<any, ParseIssue, any> = Either.right(input)

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
          out = map(out, f)
        }
        return out
      }
  }
}
