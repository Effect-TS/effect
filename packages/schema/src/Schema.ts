/**
 * @since 0.67.0
 */

import * as array_ from "effect/Array"
import * as bigDecimal_ from "effect/BigDecimal"
import * as bigInt_ from "effect/BigInt"
import * as boolean_ from "effect/Boolean"
import type { Brand } from "effect/Brand"
import * as cause_ from "effect/Cause"
import * as chunk_ from "effect/Chunk"
import * as config_ from "effect/Config"
import * as configError_ from "effect/ConfigError"
import * as data_ from "effect/Data"
import * as duration_ from "effect/Duration"
import * as Effect from "effect/Effect"
import * as either_ from "effect/Either"
import * as Encoding from "effect/Encoding"
import * as Equal from "effect/Equal"
import * as Equivalence from "effect/Equivalence"
import * as exit_ from "effect/Exit"
import * as fiberId_ from "effect/FiberId"
import type { LazyArg } from "effect/Function"
import { dual, identity } from "effect/Function"
import * as hashMap_ from "effect/HashMap"
import * as hashSet_ from "effect/HashSet"
import * as list_ from "effect/List"
import * as number_ from "effect/Number"
import * as option_ from "effect/Option"
import type * as Order from "effect/Order"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as record_ from "effect/Record"
import * as redacted_ from "effect/Redacted"
import * as Request from "effect/Request"
import * as sortedSet_ from "effect/SortedSet"
import * as string_ from "effect/String"
import * as struct_ from "effect/Struct"
import type * as Types from "effect/Types"
import type { LazyArbitrary } from "./Arbitrary.js"
import * as arbitrary_ from "./Arbitrary.js"
import type { ParseOptions } from "./AST.js"
import * as AST from "./AST.js"
import * as equivalence_ from "./Equivalence.js"
import * as fastCheck_ from "./FastCheck.js"
import * as errors_ from "./internal/errors.js"
import * as filters_ from "./internal/filters.js"
import * as serializable_ from "./internal/serializable.js"
import * as util_ from "./internal/util.js"
import * as ParseResult from "./ParseResult.js"
import * as pretty_ from "./Pretty.js"
import type * as Serializable from "./Serializable.js"
import * as TreeFormatter from "./TreeFormatter.js"

/**
 * @since 0.68.2
 */
export type Simplify<A> = { [K in keyof A]: A[K] } & {}

/**
 * @since 0.67.0
 */
export type SimplifyMutable<A> = {
  -readonly [K in keyof A]: A[K]
} extends infer B ? B : never

/**
 * @since 0.67.0
 * @category symbol
 */
export const TypeId: unique symbol = Symbol.for("@effect/schema/Schema")

/**
 * @since 0.67.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @category model
 * @since 0.67.0
 */
export interface Schema<in out A, in out I = A, out R = never> extends Schema.Variance<A, I, R>, Pipeable {
  readonly Type: A
  readonly Encoded: I
  readonly ast: AST.AST
  /**
   * Merges a set of new annotations with existing ones, potentially overwriting
   * any duplicates.
   */
  annotations(annotations: Annotations.Schema<A>): Schema<A, I, R>
}

/**
 * @category model
 * @since 0.67.0
 */
export interface SchemaClass<A, I = A, R = never> extends AnnotableClass<SchemaClass<A, I, R>, A, I, R> {}

/**
 * @category constructors
 * @since 0.67.0
 */
export const make = <A, I = A, R = never>(ast: AST.AST): SchemaClass<A, I, R> =>
  class SchemaClass {
    [TypeId] = variance
    static Type: A
    static Encoded: I
    static [TypeId] = variance
    static ast = ast
    static annotations(annotations: Annotations.Schema<A>) {
      return make<A, I, R>(mergeSchemaAnnotations(this.ast, annotations))
    }
    static pipe() {
      return pipeArguments(this, arguments)
    }
    static toString() {
      return String(ast)
    }
  }

const variance = {
  /* c8 ignore next */
  _A: (_: any) => _,
  /* c8 ignore next */
  _I: (_: any) => _,
  /* c8 ignore next */
  _R: (_: never) => _
}

interface AllAnnotations<A, TypeParameters extends ReadonlyArray<any>>
  extends Annotations.Schema<A, TypeParameters>, PropertySignature.Annotations<A>
{}

const toASTAnnotations = <A, TypeParameters extends ReadonlyArray<any>>(
  annotations?: AllAnnotations<A, TypeParameters>
): AST.Annotations => {
  if (!annotations) {
    return {}
  }
  const out: Types.Mutable<AST.Annotations> = {}

  // symbols are reserved for custom annotations
  const custom = Object.getOwnPropertySymbols(annotations)
  for (const sym of custom) {
    out[sym] = annotations[sym]
  }

  // string keys are reserved as /schema namespace
  if (annotations.typeId !== undefined) {
    const typeId = annotations.typeId
    if (typeof typeId === "object") {
      out[AST.TypeAnnotationId] = typeId.id
      out[typeId.id] = typeId.annotation
    } else {
      out[AST.TypeAnnotationId] = typeId
    }
  }
  const move = (from: keyof typeof annotations, to: symbol) => {
    if (annotations[from] !== undefined) {
      out[to] = annotations[from]
    }
  }
  move("message", AST.MessageAnnotationId)
  move("missingMessage", AST.MissingMessageAnnotationId)
  move("identifier", AST.IdentifierAnnotationId)
  move("title", AST.TitleAnnotationId)
  move("description", AST.DescriptionAnnotationId)
  move("examples", AST.ExamplesAnnotationId)
  move("default", AST.DefaultAnnotationId)
  move("documentation", AST.DocumentationAnnotationId)
  move("jsonSchema", AST.JSONSchemaAnnotationId)
  move("arbitrary", arbitrary_.ArbitraryHookId)
  move("pretty", pretty_.PrettyHookId)
  move("equivalence", equivalence_.EquivalenceHookId)
  move("concurrency", AST.ConcurrencyAnnotationId)
  move("batching", AST.BatchingAnnotationId)
  move("parseIssueTitle", AST.ParseIssueTitleAnnotationId)
  move("parseOptions", AST.ParseOptionsAnnotationId)

  return out
}

const mergeSchemaAnnotations = <A>(ast: AST.AST, annotations: Annotations.Schema<A>): AST.AST =>
  AST.annotations(ast, toASTAnnotations(annotations))

/**
 * @category annotations
 * @since 0.67.0
 */
export declare namespace Annotable {
  /**
   * @since 0.67.0
   */
  export type Self<S extends All> = ReturnType<S["annotations"]>

  /**
   * @since 0.67.0
   */
  export type Any = Annotable<any, any, any, unknown>

  /**
   * @since 0.67.0
   */
  export type All =
    | Any
    | Annotable<any, any, never, unknown>
    | Annotable<any, never, any, unknown>
    | Annotable<any, never, never, unknown>
}

/**
 * @category annotations
 * @since 0.67.0
 */
export interface Annotable<Self extends Schema<A, I, R>, A, I = A, R = never> extends Schema<A, I, R> {
  annotations(annotations: Annotations.Schema<A>): Self
}

/**
 * @category annotations
 * @since 0.67.0
 */
export interface AnnotableClass<Self extends Schema<A, I, R>, A, I = A, R = never> extends Annotable<Self, A, I, R> {
  new(_: never): Schema.Variance<A, I, R>
}

/**
 * @since 0.67.0
 */
export const asSchema = <S extends Schema.All>(
  schema: S
): Schema<Schema.Type<S>, Schema.Encoded<S>, Schema.Context<S>> => schema as any

/**
 * @category formatting
 * @since 0.67.0
 */
export const format = <A, I, R>(schema: Schema<A, I, R>): string => String(schema.ast)

/**
 * @since 0.67.0
 */
export declare namespace Schema {
  /**
   * @since 0.67.0
   */
  export interface Variance<A, I, R> {
    readonly [TypeId]: {
      readonly _A: Types.Invariant<A>
      readonly _I: Types.Invariant<I>
      readonly _R: Types.Covariant<R>
    }
  }

  /**
   * @since 0.67.0
   */
  export type Type<S> = S extends Schema.Variance<infer A, infer _I, infer _R> ? A : never

  /**
   * @since 0.67.0
   */
  export type Encoded<S> = S extends Schema.Variance<infer _A, infer I, infer _R> ? I : never

  /**
   * @since 0.67.0
   */
  export type Context<S> = S extends Schema.Variance<infer _A, infer _I, infer R> ? R : never

  /**
   * @since 0.67.0
   */
  export type ToAsserts<S extends AnyNoContext> = (
    input: unknown,
    options?: AST.ParseOptions
  ) => asserts input is Schema.Type<S>

  /**
   * Any schema, except for `never`.
   *
   * @since 0.67.0
   */
  export type Any = Schema<any, any, unknown>

  /**
   * Any schema with `Context = never`, except for `never`.
   *
   * @since 0.67.0
   */
  export type AnyNoContext = Schema<any, any, never>

  /**
   * Any schema, including `never`.
   *
   * @since 0.67.0
   */
  export type All =
    | Any
    | Schema<any, never, unknown>
    | Schema<never, any, unknown>
    | Schema<never, never, unknown>

  /**
   * Type-level counterpart of `Schema.asSchema` function.
   *
   * @since 0.67.0
   */
  export type AsSchema<S extends All> = Schema<Type<S>, Encoded<S>, Context<S>>
}

/**
 * The `encodedSchema` function allows you to extract the `Encoded` portion of a
 * schema, creating a new schema that conforms to the properties defined in the
 * original schema without retaining any refinements or transformations that
 * were applied previously.
 *
 * @since 0.67.0
 */
export const encodedSchema = <A, I, R>(schema: Schema<A, I, R>): SchemaClass<I> => make(AST.encodedAST(schema.ast))

/**
 * The `encodedBoundSchema` function is similar to `encodedSchema` but preserves
 * the refinements up to the first transformation point in the original schema.
 *
 * @since 0.67.17
 */
export const encodedBoundSchema = <A, I, R>(schema: Schema<A, I, R>): SchemaClass<I> =>
  make(AST.encodedBoundAST(schema.ast))

/**
 * The `typeSchema` function allows you to extract the `Type` portion of a
 * schema, creating a new schema that conforms to the properties defined in the
 * original schema without considering the initial encoding or transformation
 * processes.
 *
 * @since 0.67.0
 */
export const typeSchema = <A, I, R>(schema: Schema<A, I, R>): SchemaClass<A> => make(AST.typeAST(schema.ast))

/* c8 ignore start */
export {
  /**
   * By default the option `exact` is set to `true`.
   *
   * @throws `ParseError`
   * @category validation
   * @since 0.67.0
   */
  asserts,
  /**
   * @category decoding
   * @since 0.67.0
   */
  decodeOption,
  /**
   * @throws `ParseError`
   * @category decoding
   * @since 0.67.0
   */
  decodeSync,
  /**
   * @category decoding
   * @since 0.67.0
   */
  decodeUnknownOption,
  /**
   * @throws `ParseError`
   * @category decoding
   * @since 0.67.0
   */
  decodeUnknownSync,
  /**
   * @category encoding
   * @since 0.67.0
   */
  encodeOption,
  /**
   * @throws `ParseError`
   * @category encoding
   * @since 0.67.0
   */
  encodeSync,
  /**
   * @category encoding
   * @since 0.67.0
   */
  encodeUnknownOption,
  /**
   * @throws `ParseError`
   * @category encoding
   * @since 0.67.0
   */
  encodeUnknownSync,
  /**
   * By default the option `exact` is set to `true`.
   *
   * @category validation
   * @since 0.67.0
   */
  is,
  /**
   * @category validation
   * @since 0.67.0
   */
  validateOption,
  /**
   * @throws `ParseError`
   * @category validation
   * @since 0.67.0
   */
  validateSync
} from "./ParseResult.js"
/* c8 ignore end */

/**
 * @category encoding
 * @since 0.67.0
 */
export const encodeUnknown = <A, I, R>(
  schema: Schema<A, I, R>,
  options?: ParseOptions
) => {
  const encodeUnknown = ParseResult.encodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Effect.Effect<I, ParseResult.ParseError, R> =>
    ParseResult.mapError(encodeUnknown(u, overrideOptions), ParseResult.parseError)
}

/**
 * @category encoding
 * @since 0.67.0
 */
export const encodeUnknownEither = <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => {
  const encodeUnknownEither = ParseResult.encodeUnknownEither(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): either_.Either<I, ParseResult.ParseError> =>
    either_.mapLeft(encodeUnknownEither(u, overrideOptions), ParseResult.parseError)
}

/**
 * @category encoding
 * @since 0.67.0
 */
export const encodeUnknownPromise = <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => {
  const parser = encodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Promise<I> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category encoding
 * @since 0.67.0
 */
export const encode: <A, I, R>(
  schema: Schema<A, I, R>,
  options?: ParseOptions
) => (a: A, overrideOptions?: ParseOptions) => Effect.Effect<I, ParseResult.ParseError, R> = encodeUnknown

/**
 * @category encoding
 * @since 0.67.0
 */
export const encodeEither: <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => (a: A, overrideOptions?: ParseOptions) => either_.Either<I, ParseResult.ParseError> = encodeUnknownEither

/**
 * @category encoding
 * @since 0.67.0
 */
export const encodePromise: <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => (a: A, overrideOptions?: ParseOptions) => Promise<I> = encodeUnknownPromise

/**
 * @category decoding
 * @since 0.67.0
 */
export const decodeUnknown = <A, I, R>(
  schema: Schema<A, I, R>,
  options?: ParseOptions
) => {
  const decodeUnknown = ParseResult.decodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Effect.Effect<A, ParseResult.ParseError, R> =>
    ParseResult.mapError(decodeUnknown(u, overrideOptions), ParseResult.parseError)
}

/**
 * @category decoding
 * @since 0.67.0
 */
export const decodeUnknownEither = <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => {
  const decodeUnknownEither = ParseResult.decodeUnknownEither(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): either_.Either<A, ParseResult.ParseError> =>
    either_.mapLeft(decodeUnknownEither(u, overrideOptions), ParseResult.parseError)
}

/**
 * @category decoding
 * @since 0.67.0
 */
export const decodeUnknownPromise = <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => {
  const parser = decodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Promise<A> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category decoding
 * @since 0.67.0
 */
export const decode: <A, I, R>(
  schema: Schema<A, I, R>,
  options?: ParseOptions
) => (i: I, overrideOptions?: ParseOptions) => Effect.Effect<A, ParseResult.ParseError, R> = decodeUnknown

/**
 * @category decoding
 * @since 0.67.0
 */
export const decodeEither: <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => (i: I, overrideOptions?: ParseOptions) => either_.Either<A, ParseResult.ParseError> = decodeUnknownEither

/**
 * @category decoding
 * @since 0.67.0
 */
export const decodePromise: <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => (i: I, overrideOptions?: ParseOptions) => Promise<A> = decodeUnknownPromise

/**
 * @category validation
 * @since 0.67.0
 */
export const validate = <A, I, R>(
  schema: Schema<A, I, R>,
  options?: ParseOptions
) => {
  const validate = ParseResult.validate(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Effect.Effect<A, ParseResult.ParseError, R> =>
    ParseResult.mapError(validate(u, overrideOptions), ParseResult.parseError)
}

/**
 * @category validation
 * @since 0.67.0
 */
export const validateEither = <A, I, R>(
  schema: Schema<A, I, R>,
  options?: ParseOptions
) => {
  const validateEither = ParseResult.validateEither(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): either_.Either<A, ParseResult.ParseError> =>
    either_.mapLeft(validateEither(u, overrideOptions), ParseResult.parseError)
}

/**
 * @category validation
 * @since 0.67.0
 */
export const validatePromise = <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => {
  const parser = validate(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Promise<A> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * Tests if a value is a `Schema`.
 *
 * @category guards
 * @since 0.67.0
 */
export const isSchema = (u: unknown): u is Schema.Any =>
  Predicate.hasProperty(u, TypeId) && Predicate.isObject(u[TypeId])

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Literal<Literals extends array_.NonEmptyReadonlyArray<AST.LiteralValue>>
  extends AnnotableClass<Literal<Literals>, Literals[number]>
{
  readonly literals: Readonly<Literals>
}

const getDefaultLiteralAST = <Literals extends array_.NonEmptyReadonlyArray<AST.LiteralValue>>(
  literals: Literals
) =>
  AST.isMembers(literals)
    ? AST.Union.make(AST.mapMembers(literals, (literal) => new AST.Literal(literal)))
    : new AST.Literal(literals[0])

const makeLiteralClass = <Literals extends array_.NonEmptyReadonlyArray<AST.LiteralValue>>(
  literals: Literals,
  ast: AST.AST = getDefaultLiteralAST(literals)
): Literal<Literals> =>
  class LiteralClass extends make<Literals[number]>(ast) {
    static override annotations(annotations: Annotations.Schema<Literals[number]>): Literal<Literals> {
      return makeLiteralClass(this.literals, mergeSchemaAnnotations(this.ast, annotations))
    }
    static literals = [...literals] as Literals
  }

/**
 * @category constructors
 * @since 0.67.0
 */
export function Literal<Literals extends array_.NonEmptyReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
): Literal<Literals>
export function Literal(): Never
export function Literal<Literals extends ReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
): Schema<Literals[number]>
export function Literal<Literals extends ReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
): Schema<Literals[number]> | Never {
  return array_.isNonEmptyReadonlyArray(literals) ? makeLiteralClass(literals) : Never
}

/**
 * Creates a new `Schema` from a literal schema.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 * import { Either } from "effect"
 *
 * const schema = S.Literal("a", "b", "c").pipe(S.pickLiteral("a", "b"))
 *
 * assert.deepStrictEqual(S.decodeSync(schema)("a"), "a")
 * assert.deepStrictEqual(S.decodeSync(schema)("b"), "b")
 * assert.strictEqual(Either.isLeft(S.decodeUnknownEither(schema)("c")), true)
 *
 * @category constructors
 * @since 0.67.0
 */
export const pickLiteral =
  <A extends AST.LiteralValue, L extends array_.NonEmptyReadonlyArray<A>>(...literals: L) =>
  <I, R>(_schema: Schema<A, I, R>): Literal<[...L]> => Literal(...literals)

/**
 * @category constructors
 * @since 0.67.0
 */
export const UniqueSymbolFromSelf = <S extends symbol>(symbol: S): SchemaClass<S> => make(new AST.UniqueSymbol(symbol))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Enums<A extends EnumsDefinition> extends AnnotableClass<Enums<A>, A[keyof A]> {
  readonly enums: A
}

/**
 * @since 0.67.0
 */
export type EnumsDefinition = { [x: string]: string | number }

const getDefaultEnumsAST = <A extends EnumsDefinition>(enums: A) =>
  new AST.Enums(
    Object.keys(enums).filter(
      (key) => typeof enums[enums[key]] !== "number"
    ).map((key) => [key, enums[key]])
  )

const makeEnumsClass = <A extends EnumsDefinition>(
  enums: A,
  ast: AST.AST = getDefaultEnumsAST(enums)
): Enums<A> =>
  class EnumsClass extends make<A[keyof A]>(ast) {
    static override annotations(annotations: Annotations.Schema<A[keyof A]>) {
      return makeEnumsClass(this.enums, mergeSchemaAnnotations(this.ast, annotations))
    }

    static enums = { ...enums }
  }

/**
 * @category constructors
 * @since 0.67.0
 */
export const Enums = <A extends EnumsDefinition>(enums: A): Enums<A> => makeEnumsClass(enums)

type Join<T> = T extends [infer Head, ...infer Tail] ?
  `${(Head extends Schema<infer A> ? A : Head) & (AST.LiteralValue)}${Join<Tail>}`
  : ""

/**
 * @category API interface
 * @since 0.67.17
 */
export interface TemplateLiteral<A> extends SchemaClass<A> {}

type TemplateLiteralParameter = Schema.AnyNoContext | AST.LiteralValue

/**
 * @category constructors
 * @since 0.67.0
 */
export const TemplateLiteral = <
  T extends readonly [TemplateLiteralParameter, ...Array<TemplateLiteralParameter>]
>(
  ...[head, ...tail]: T
): TemplateLiteral<Join<T>> => {
  let astOrs: ReadonlyArray<AST.TemplateLiteral | string> = getTemplateLiterals(
    getTemplateLiteralParameterAST(head)
  )
  for (const span of tail) {
    astOrs = array_.flatMap(
      astOrs,
      (a) => getTemplateLiterals(getTemplateLiteralParameterAST(span)).map((b) => combineTemplateLiterals(a, b))
    )
  }
  return make(AST.Union.make(astOrs.map((astOr) => Predicate.isString(astOr) ? new AST.Literal(astOr) : astOr)))
}

const getTemplateLiteralParameterAST = (span: TemplateLiteralParameter): AST.AST =>
  isSchema(span) ? span.ast : new AST.Literal(String(span))

const combineTemplateLiterals = (
  a: AST.TemplateLiteral | string,
  b: AST.TemplateLiteral | string
): AST.TemplateLiteral | string => {
  if (Predicate.isString(a)) {
    return Predicate.isString(b) ?
      a + b :
      new AST.TemplateLiteral(a + b.head, b.spans)
  }
  if (Predicate.isString(b)) {
    return new AST.TemplateLiteral(
      a.head,
      array_.modifyNonEmptyLast(
        a.spans,
        (span) => new AST.TemplateLiteralSpan(span.type, span.literal + b)
      )
    )
  }
  return new AST.TemplateLiteral(
    a.head,
    array_.appendAll(
      array_.modifyNonEmptyLast(
        a.spans,
        (span) => new AST.TemplateLiteralSpan(span.type, span.literal + String(b.head))
      ),
      b.spans
    )
  )
}

const getTemplateLiterals = (
  ast: AST.AST
): ReadonlyArray<AST.TemplateLiteral | string> => {
  switch (ast._tag) {
    case "Literal":
      return [String(ast.literal)]
    case "NumberKeyword":
    case "StringKeyword":
      return [new AST.TemplateLiteral("", [new AST.TemplateLiteralSpan(ast, "")])]
    case "Union":
      return array_.flatMap(ast.types, getTemplateLiterals)
  }
  throw new Error(errors_.getSchemaUnsupportedLiteralSpanErrorMessage(ast))
}

const declareConstructor = <
  const TypeParameters extends ReadonlyArray<Schema.Any>,
  I,
  A
>(
  typeParameters: TypeParameters,
  options: {
    readonly decode: (
      ...typeParameters: {
        readonly [K in keyof TypeParameters]: Schema<
          Schema.Type<TypeParameters[K]>,
          Schema.Encoded<TypeParameters[K]>,
          never
        >
      }
    ) => (
      input: unknown,
      options: ParseOptions,
      ast: AST.Declaration
    ) => Effect.Effect<A, ParseResult.ParseIssue, never>
    readonly encode: (
      ...typeParameters: {
        readonly [K in keyof TypeParameters]: Schema<
          Schema.Type<TypeParameters[K]>,
          Schema.Encoded<TypeParameters[K]>,
          never
        >
      }
    ) => (
      input: unknown,
      options: ParseOptions,
      ast: AST.Declaration
    ) => Effect.Effect<I, ParseResult.ParseIssue, never>
  },
  annotations?: Annotations.Schema<A, TypeParameters>
): SchemaClass<A, I, Schema.Context<TypeParameters[number]>> =>
  make(
    new AST.Declaration(
      typeParameters.map((tp) => tp.ast),
      (...typeParameters) => options.decode(...typeParameters.map(make) as any),
      (...typeParameters) => options.encode(...typeParameters.map(make) as any),
      toASTAnnotations(annotations)
    )
  )

const declarePrimitive = <A>(
  is: (input: unknown) => input is A,
  annotations?: Annotations.Schema<A>
): SchemaClass<A> => {
  const decodeUnknown = () => (input: unknown, _: ParseOptions, ast: AST.Declaration) =>
    is(input) ? ParseResult.succeed(input) : ParseResult.fail(new ParseResult.Type(ast, input))
  const encodeUnknown = decodeUnknown
  return make(new AST.Declaration([], decodeUnknown, encodeUnknown, toASTAnnotations(annotations)))
}

/**
 * The constraint `R extends Schema.Context<P[number]>` enforces dependencies solely from `typeParameters`.
 * This ensures that when you call `Schema.to` or `Schema.from`, you receive a schema with a `never` context.
 *
 * @category constructors
 * @since 0.67.0
 */
export const declare: {
  <A>(
    is: (input: unknown) => input is A,
    annotations?: Annotations.Schema<A>
  ): SchemaClass<A>
  <const P extends ReadonlyArray<Schema.All>, I, A>(
    typeParameters: P,
    options: {
      readonly decode: (
        ...typeParameters: { readonly [K in keyof P]: Schema<Schema.Type<P[K]>, Schema.Encoded<P[K]>, never> }
      ) => (
        input: unknown,
        options: ParseOptions,
        ast: AST.Declaration
      ) => Effect.Effect<A, ParseResult.ParseIssue, never>
      readonly encode: (
        ...typeParameters: { readonly [K in keyof P]: Schema<Schema.Type<P[K]>, Schema.Encoded<P[K]>, never> }
      ) => (
        input: unknown,
        options: ParseOptions,
        ast: AST.Declaration
      ) => Effect.Effect<I, ParseResult.ParseIssue, never>
    },
    annotations?: Annotations.Schema<A, { readonly [K in keyof P]: Schema.Type<P[K]> }>
  ): SchemaClass<A, I, Schema.Context<P[number]>>
} = function() {
  if (Array.isArray(arguments[0])) {
    const typeParameters = arguments[0]
    const options = arguments[1]
    const annotations = arguments[2]
    return declareConstructor(typeParameters, options, annotations)
  }
  const is = arguments[0]
  const annotations = arguments[1]
  return declarePrimitive(is, annotations)
} as any

/**
 * @category type id
 * @since 0.67.0
 */
export const BrandTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Brand")

/**
 * @category constructors
 * @since 0.67.0
 */
export const fromBrand = <C extends Brand<string | symbol>, A extends Brand.Unbranded<C>>(
  constructor: Brand.Constructor<C>,
  annotations?: Annotations.Filter<C, A>
) =>
<I, R>(self: Schema<A, I, R>): BrandSchema<A & C, I, R> =>
  makeBrandClass<Schema<A & C, I, R>, string | symbol>(
    new AST.Refinement(
      self.ast,
      function predicate(a: A, _: ParseOptions, ast: AST.AST): option_.Option<ParseResult.ParseIssue> {
        const either = constructor.either(a)
        return either_.isLeft(either) ?
          option_.some(new ParseResult.Type(ast, a, either.left.map((v) => v.message).join(", "))) :
          option_.none()
      },
      toASTAnnotations({ typeId: { id: BrandTypeId, annotation: { constructor } }, ...annotations })
    )
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const InstanceOfTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/InstanceOf")

/**
 * @category api interface
 * @since 0.67.0
 */
export interface instanceOf<A> extends AnnotableClass<instanceOf<A>, A> {}

/**
 * @category constructors
 * @since 0.67.0
 */
export const instanceOf = <A extends abstract new(...args: any) => any>(
  constructor: A,
  annotations?: Annotations.Schema<InstanceType<A>>
): instanceOf<InstanceType<A>> =>
  declare(
    (u): u is InstanceType<A> => u instanceof constructor,
    {
      title: constructor.name,
      description: `an instance of ${constructor.name}`,
      pretty: (): pretty_.Pretty<InstanceType<A>> => String,
      typeId: { id: InstanceOfTypeId, annotation: { constructor } },
      ...annotations
    }
  )

/**
 * @category primitives
 * @since 0.67.0
 */
export class Undefined extends make<undefined>(AST.undefinedKeyword) {}

/**
 * @category primitives
 * @since 0.67.0
 */
export class Void extends make<void>(AST.voidKeyword) {}

/**
 * @category primitives
 * @since 0.67.0
 */
export class Null extends make<null>(AST.null) {}

/**
 * @category primitives
 * @since 0.67.0
 */
export class Never extends make<never>(AST.neverKeyword) {}

/**
 * @category primitives
 * @since 0.67.0
 */
export class Unknown extends make<unknown>(AST.unknownKeyword) {}

/**
 * @category primitives
 * @since 0.67.0
 */
export class Any extends make<any>(AST.anyKeyword) {}

/**
 * @category primitives
 * @since 0.67.0
 */
export class BigIntFromSelf extends make<bigint>(AST.bigIntKeyword) {}

/**
 * @category primitives
 * @since 0.67.0
 */
export class SymbolFromSelf extends make<symbol>(AST.symbolKeyword) {}

/** @ignore */
class String$ extends make<string>(AST.stringKeyword) {}

/** @ignore */
class Number$ extends make<number>(AST.numberKeyword) {}

/** @ignore */
class Boolean$ extends make<boolean>(AST.booleanKeyword) {}

/** @ignore */
class Object$ extends make<object>(AST.objectKeyword) {}

export {
  /**
   * @category primitives
   * @since 0.67.0
   */
  Boolean$ as Boolean,
  /**
   * @category primitives
   * @since 0.67.0
   */
  Number$ as Number,
  /**
   * @category primitives
   * @since 0.67.0
   */
  Object$ as Object,
  /**
   * @category primitives
   * @since 0.67.0
   */
  String$ as String
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Union<Members extends ReadonlyArray<Schema.Any>> extends
  AnnotableClass<
    Union<Members>,
    Schema.Type<Members[number]>,
    Schema.Encoded<Members[number]>,
    Schema.Context<Members[number]>
  >
{
  readonly members: Readonly<Members>
  annotations(annotations: Annotations.Schema<Schema.Type<Members[number]>>): Union<Members>
}

const getDefaultUnionAST = <Members extends ReadonlyArray<Schema.Any>>(members: Members) =>
  AST.Union.members(members.map((m) => m.ast))

const makeUnionClass = <Members extends ReadonlyArray<Schema.Any>>(
  members: Members,
  ast: AST.AST = getDefaultUnionAST(members)
): Union<Members> =>
  class UnionClass
    extends make<Schema.Type<Members[number]>, Schema.Encoded<Members[number]>, Schema.Context<Members[number]>>(ast)
  {
    static override annotations(annotations: Annotations.Schema<Schema.Type<Members[number]>>): Union<Members> {
      return makeUnionClass(this.members, mergeSchemaAnnotations(this.ast, annotations))
    }

    static members = [...members] as any as Members
  }

/**
 * @category combinators
 * @since 0.67.0
 */
export function Union<Members extends AST.Members<Schema.Any>>(...members: Members): Union<Members>
export function Union<Member extends Schema.Any>(member: Member): Member
export function Union(): typeof Never
export function Union<Members extends ReadonlyArray<Schema.Any>>(
  ...members: Members
): Schema<Schema.Type<Members[number]>, Schema.Encoded<Members[number]>, Schema.Context<Members[number]>>
export function Union<Members extends ReadonlyArray<Schema.Any>>(
  ...members: Members
):
  | Schema<Schema.Type<Members[number]>, Schema.Encoded<Members[number]>, Schema.Context<Members[number]>>
  | typeof Never
{
  return AST.isMembers(members)
    ? makeUnionClass(members)
    : array_.isNonEmptyReadonlyArray(members)
    ? members[0] as any
    : Never
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface NullOr<S extends Schema.Any> extends Union<[S, typeof Null]> {
  annotations(annotations: Annotations.Schema<Schema.Type<S> | null>): NullOr<S>
}

/**
 * @category combinators
 * @since 0.67.0
 */
export const NullOr = <S extends Schema.Any>(self: S): NullOr<S> => Union(self, Null)

/**
 * @category api interface
 * @since 0.67.0
 */
export interface UndefinedOr<S extends Schema.Any> extends Union<[S, typeof Undefined]> {
  annotations(annotations: Annotations.Schema<Schema.Type<S> | undefined>): UndefinedOr<S>
}

/**
 * @category combinators
 * @since 0.67.0
 */
export const UndefinedOr = <S extends Schema.Any>(self: S): UndefinedOr<S> => Union(self, Undefined)

/**
 * @category api interface
 * @since 0.67.0
 */
export interface NullishOr<S extends Schema.Any> extends Union<[S, typeof Null, typeof Undefined]> {
  annotations(annotations: Annotations.Schema<Schema.Type<S> | null | undefined>): NullishOr<S>
}

/**
 * @category combinators
 * @since 0.67.0
 */
export const NullishOr = <S extends Schema.Any>(self: S): NullishOr<S> => Union(self, Null, Undefined)

/**
 * @category combinators
 * @since 0.67.0
 */
export const keyof = <A, I, R>(self: Schema<A, I, R>): SchemaClass<keyof A> => make<keyof A>(AST.keyof(self.ast))

/**
 * @since 0.68.0
 */
export declare namespace Element {
  /**
   * @since 0.68.0
   */
  export interface Annotations<A> extends Annotations.Doc<A> {
    readonly missingMessage?: AST.MissingMessageAnnotation
  }

  /**
   * @since 0.68.0
   */
  export type Token = "" | "?"
}

/**
 * @category API interface
 * @since 0.68.0
 */
export interface Element<S extends Schema.Any, Token extends Element.Token>
  extends Schema.Variance<Schema.Type<S>, Schema.Encoded<S>, Schema.Context<S>>
{
  readonly _Token: Token
  readonly ast: AST.OptionalType
  readonly from: S
  annotations(annotations: Element.Annotations<Schema.Type<S>>): Element<S, Token>
}

/**
 * @since 0.68.0
 */
export const element = <S extends Schema.Any>(self: S): Element<S, ""> =>
  new ElementImpl(new AST.OptionalType(self.ast, false), self)

/**
 * @since 0.67.0
 */
export const optionalElement = <S extends Schema.Any>(self: S): Element<S, "?"> =>
  new ElementImpl(new AST.OptionalType(self.ast, true), self)

class ElementImpl<S extends Schema.Any, Token extends Element.Token> implements Element<S, Token> {
  readonly [TypeId]!: Schema.Variance<Schema.Type<S>, Schema.Encoded<S>, Schema.Context<S>>[TypeId]
  readonly _Token!: Token
  constructor(
    readonly ast: AST.OptionalType,
    readonly from: S
  ) {}
  annotations(
    annotations: Annotations.Schema<Schema.Type<S>>
  ): ElementImpl<S, Token> {
    return new ElementImpl(
      new AST.OptionalType(
        this.ast.type,
        this.ast.isOptional,
        { ...this.ast.annotations, ...toASTAnnotations(annotations) }
      ),
      this.from
    )
  }
  toString() {
    return `${this.ast.type}${this.ast.isOptional ? "?" : ""}`
  }
}

/**
 * @since 0.67.0
 */
export declare namespace TupleType {
  type ElementsType<
    Elements,
    Out extends ReadonlyArray<any> = readonly []
  > = Elements extends readonly [infer Head, ...infer Tail] ?
    Head extends Element<infer T, "?"> ? ElementsType<Tail, readonly [...Out, Schema.Type<T>?]>
    : ElementsType<Tail, readonly [...Out, Schema.Type<Head>]>
    : Out

  type ElementsEncoded<
    Elements,
    Out extends ReadonlyArray<any> = readonly []
  > = Elements extends readonly [infer Head, ...infer Tail] ?
    Head extends Element<infer T, "?"> ? ElementsEncoded<Tail, readonly [...Out, Schema.Encoded<T>?]>
    : ElementsEncoded<Tail, readonly [...Out, Schema.Encoded<Head>]>
    : Out

  /**
   * @since 0.67.0
   */
  export type Elements = ReadonlyArray<Schema.Any | Element<Schema.Any, Element.Token>>

  /**
   * @since 0.68.0
   */
  export type Rest = ReadonlyArray<Schema.Any | Element<Schema.Any, "">>

  /**
   * @since 0.67.0
   */
  export type Type<Elements extends TupleType.Elements, Rest extends TupleType.Rest> = Rest extends
    [infer Head, ...infer Tail] ? Readonly<[
      ...ElementsType<Elements>,
      ...ReadonlyArray<Schema.Type<Head>>,
      ...{ readonly [K in keyof Tail]: Schema.Type<Tail[K]> }
    ]> :
    ElementsType<Elements>

  /**
   * @since 0.67.0
   */
  export type Encoded<Elements extends TupleType.Elements, Rest extends TupleType.Rest> = Rest extends
    [infer Head, ...infer Tail] ? Readonly<[
      ...ElementsEncoded<Elements>,
      ...ReadonlyArray<Schema.Encoded<Head>>,
      ...{ readonly [K in keyof Tail]: Schema.Encoded<Tail[K]> }
    ]> :
    ElementsEncoded<Elements>
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface TupleType<Elements extends TupleType.Elements, Rest extends TupleType.Rest> extends
  AnnotableClass<
    TupleType<Elements, Rest>,
    TupleType.Type<Elements, Rest>,
    TupleType.Encoded<Elements, Rest>,
    Schema.Context<Elements[number]> | Schema.Context<Rest[number]>
  >
{
  readonly elements: Readonly<Elements>
  readonly rest: Readonly<Rest>
}

const getDefaultTupleTypeAST = <Elements extends TupleType.Elements, Rest extends TupleType.Rest>(
  elements: Elements,
  rest: Rest
) =>
  new AST.TupleType(
    elements.map((el) => isSchema(el) ? new AST.OptionalType(el.ast, false) : el.ast),
    rest.map((el) => isSchema(el) ? new AST.Type(el.ast) : el.ast),
    true
  )

const makeTupleTypeClass = <Elements extends TupleType.Elements, Rest extends TupleType.Rest>(
  elements: Elements,
  rest: Rest,
  ast: AST.AST = getDefaultTupleTypeAST(elements, rest)
) =>
  class TupleTypeClass extends make<
    TupleType.Type<Elements, Rest>,
    TupleType.Encoded<Elements, Rest>,
    Schema.Context<Elements[number]> | Schema.Context<Rest[number]>
  >(ast) {
    static override annotations(
      annotations: Annotations.Schema<TupleType.Type<Elements, Rest>>
    ): TupleType<Elements, Rest> {
      return makeTupleTypeClass(this.elements, this.rest, mergeSchemaAnnotations(this.ast, annotations))
    }

    static elements = [...elements] as any as Elements

    static rest = [...rest] as any as Rest
  }

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Tuple<Elements extends TupleType.Elements> extends TupleType<Elements, []> {
  annotations(annotations: Annotations.Schema<TupleType.Type<Elements, []>>): Tuple<Elements>
}

/**
 * @category constructors
 * @since 0.67.0
 */
export function Tuple<
  const Elements extends TupleType.Elements,
  Rest extends array_.NonEmptyReadonlyArray<TupleType.Rest[number]>
>(elements: Elements, ...rest: Rest): TupleType<Elements, Rest>
export function Tuple<Elements extends TupleType.Elements>(...elements: Elements): Tuple<Elements>
export function Tuple(...args: ReadonlyArray<any>): any {
  return Array.isArray(args[0])
    ? makeTupleTypeClass(args[0], args.slice(1))
    : makeTupleTypeClass(args, [])
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Array$<Value extends Schema.Any> extends TupleType<[], [Value]> {
  readonly value: Value
  annotations(annotations: Annotations.Schema<TupleType.Type<[], [Value]>>): Array$<Value>
}

const makeArrayClass = <Value extends Schema.Any>(value: Value, ast?: AST.AST): Array$<Value> =>
  class ArrayClass extends makeTupleTypeClass<[], [Value]>([], [value], ast) {
    static override annotations(annotations: Annotations.Schema<TupleType.Type<[], [Value]>>) {
      return makeArrayClass(this.value, mergeSchemaAnnotations(this.ast, annotations))
    }

    static value = value
  }

const Array$ = <Value extends Schema.Any>(value: Value): Array$<Value> => makeArrayClass(value)

export {
  /**
   * @category constructors
   * @since 0.67.0
   */
  Array$ as Array
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface NonEmptyArray<Value extends Schema.Any> extends TupleType<[Value], [Value]> {
  readonly value: Value
  annotations(annotations: Annotations.Schema<TupleType.Type<[Value], [Value]>>): NonEmptyArray<Value>
}

const makeNonEmptyArrayClass = <Value extends Schema.Any>(value: Value, ast?: AST.AST): NonEmptyArray<Value> =>
  class NonEmptyArrayClass extends makeTupleTypeClass<[Value], [Value]>([value], [value], ast) {
    static override annotations(annotations: Annotations.Schema<TupleType.Type<[Value], [Value]>>) {
      return makeNonEmptyArrayClass(this.value, mergeSchemaAnnotations(this.ast, annotations))
    }

    static value = value
  }

/**
 * @category constructors
 * @since 0.67.0
 */
export const NonEmptyArray = <Value extends Schema.Any>(value: Value): NonEmptyArray<Value> =>
  makeNonEmptyArrayClass(value)

/**
 * @since 0.67.0
 */
export declare namespace PropertySignature {
  /**
   * @since 0.67.0
   */
  export type Token = "?:" | ":"

  /**
   * @since 0.67.0
   */
  export type Any<Key extends PropertyKey = PropertyKey> = PropertySignature<
    Token,
    any,
    Key,
    Token,
    any,
    boolean,
    unknown
  >

  /**
   * @since 0.67.0
   */
  export type All<Key extends PropertyKey = PropertyKey> =
    | Any<Key>
    | PropertySignature<Token, never, Key, Token, any, boolean, unknown>
    | PropertySignature<Token, any, Key, Token, never, boolean, unknown>
    | PropertySignature<Token, never, Key, Token, never, boolean, unknown>

  /**
   * @since 0.67.0
   */
  export type AST =
    | PropertySignatureDeclaration
    | PropertySignatureTransformation

  /**
   * @since 0.67.0
   */
  export interface Annotations<A> extends Annotations.Doc<A> {
    readonly missingMessage?: AST.MissingMessageAnnotation
  }
}

const formatPropertySignatureToken = (isOptional: boolean): string => isOptional ? "\"?:\"" : "\":\""

/**
 * @category PropertySignature
 * @since 0.67.0
 */
export class PropertySignatureDeclaration extends AST.OptionalType {
  /**
   * @since 0.67.0
   */
  readonly _tag = "PropertySignatureDeclaration"
  constructor(
    type: AST.AST,
    isOptional: boolean,
    readonly isReadonly: boolean,
    annotations: AST.Annotations,
    readonly defaultValue: (() => unknown) | undefined
  ) {
    super(type, isOptional, annotations)
  }
  /**
   * @since 0.67.0
   */
  toString() {
    const token = formatPropertySignatureToken(this.isOptional)
    const type = String(this.type)
    return `PropertySignature<${token}, ${type}, never, ${token}, ${type}>`
  }
}

/**
 * @category PropertySignature
 * @since 0.67.0
 */
export class FromPropertySignature extends AST.OptionalType {
  constructor(
    type: AST.AST,
    isOptional: boolean,
    readonly isReadonly: boolean,
    annotations: AST.Annotations,
    readonly fromKey?: PropertyKey | undefined
  ) {
    super(type, isOptional, annotations)
  }
}

/**
 * @category PropertySignature
 * @since 0.67.0
 */
export class ToPropertySignature extends AST.OptionalType {
  constructor(
    type: AST.AST,
    isOptional: boolean,
    readonly isReadonly: boolean,
    annotations: AST.Annotations,
    readonly defaultValue: (() => unknown) | undefined
  ) {
    super(type, isOptional, annotations)
  }
}

const formatPropertyKey = (p: PropertyKey | undefined): string => {
  if (p === undefined) {
    return "never"
  }
  if (Predicate.isString(p)) {
    return JSON.stringify(p)
  }
  return String(p)
}

/**
 * @category PropertySignature
 * @since 0.67.0
 */
export class PropertySignatureTransformation {
  /**
   * @since 0.67.0
   */
  readonly _tag = "PropertySignatureTransformation"
  constructor(
    readonly from: FromPropertySignature,
    readonly to: ToPropertySignature,
    readonly decode: AST.PropertySignatureTransformation["decode"],
    readonly encode: AST.PropertySignatureTransformation["encode"]
  ) {}
  /**
   * @since 0.67.0
   */
  toString() {
    return `PropertySignature<${formatPropertySignatureToken(this.to.isOptional)}, ${this.to.type}, ${
      formatPropertyKey(this.from.fromKey)
    }, ${formatPropertySignatureToken(this.from.isOptional)}, ${this.from.type}>`
  }
}

const mergeSignatureAnnotations = (
  ast: PropertySignature.AST,
  annotations: AST.Annotations
): PropertySignature.AST => {
  switch (ast._tag) {
    case "PropertySignatureDeclaration": {
      return new PropertySignatureDeclaration(
        ast.type,
        ast.isOptional,
        ast.isReadonly,
        { ...ast.annotations, ...annotations },
        ast.defaultValue
      )
    }
    case "PropertySignatureTransformation": {
      return new PropertySignatureTransformation(
        new FromPropertySignature(
          ast.from.type,
          ast.from.isOptional,
          ast.from.isReadonly,
          ast.from.annotations
        ),
        new ToPropertySignature(ast.to.type, ast.to.isOptional, ast.to.isReadonly, {
          ...ast.to.annotations,
          ...annotations
        }, ast.to.defaultValue),
        ast.decode,
        ast.encode
      )
    }
  }
}

/**
 * @since 0.68.0
 * @category symbol
 */
export const PropertySignatureTypeId: unique symbol = Symbol.for("@effect/schema/PropertySignature")

/**
 * @since 0.68.0
 * @category symbol
 */
export type PropertySignatureTypeId = typeof PropertySignatureTypeId

/**
 * @category PropertySignature
 * @since 0.67.0
 */
export interface PropertySignature<
  TypeToken extends PropertySignature.Token,
  Type,
  Key extends PropertyKey,
  EncodedToken extends PropertySignature.Token,
  Encoded,
  HasDefault extends boolean = false,
  R = never
> extends Schema.Variance<Type, Encoded, R>, Pipeable {
  readonly [PropertySignatureTypeId]: null
  readonly _TypeToken: TypeToken
  readonly _EncodedToken: EncodedToken
  readonly _HasDefault: HasDefault
  readonly _Key: Key
  readonly ast: PropertySignature.AST

  annotations(
    annotations: PropertySignature.Annotations<Type>
  ): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R>
}

class PropertySignatureImpl<
  TypeToken extends PropertySignature.Token,
  Type,
  Key extends PropertyKey,
  EncodedToken extends PropertySignature.Token,
  Encoded,
  HasDefault extends boolean = false,
  R = never
> implements PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R> {
  readonly [TypeId]!: Schema.Variance<Type, Encoded, R>[TypeId]
  readonly [PropertySignatureTypeId] = null
  readonly _TypeToken!: TypeToken
  readonly _Key!: Key
  readonly _EncodedToken!: EncodedToken
  readonly _HasDefault!: HasDefault

  constructor(
    readonly ast: PropertySignature.AST
  ) {}

  pipe() {
    return pipeArguments(this, arguments)
  }

  annotations(
    annotations: PropertySignature.Annotations<Type>
  ): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R> {
    return new PropertySignatureImpl(mergeSignatureAnnotations(this.ast, toASTAnnotations(annotations)))
  }

  toString() {
    return String(this.ast)
  }
}

/**
 * @category PropertySignature
 * @since 0.67.15
 */
export const makePropertySignature = <
  TypeToken extends PropertySignature.Token,
  Type,
  Key extends PropertyKey,
  EncodedToken extends PropertySignature.Token,
  Encoded,
  HasDefault extends boolean = false,
  R = never
>(ast: PropertySignature.AST) =>
  new PropertySignatureImpl<TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R>(ast)

class PropertySignatureWithFromImpl<
  From extends Schema.All,
  TypeToken extends PropertySignature.Token,
  Type,
  Key extends PropertyKey,
  EncodedToken extends PropertySignature.Token,
  Encoded,
  HasDefault extends boolean = false,
  R = never
> extends PropertySignatureImpl<TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R> {
  constructor(ast: PropertySignature.AST, readonly from: From) {
    super(ast)
  }
  annotations(
    annotations: PropertySignature.Annotations<Type>
  ): PropertySignatureWithFromImpl<From, TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R> {
    return new PropertySignatureWithFromImpl(
      mergeSignatureAnnotations(this.ast, toASTAnnotations(annotations)),
      this.from
    )
  }
}

/**
 * @category API interface
 * @since 1.0.0
 */
export interface propertySignature<S extends Schema.All>
  extends PropertySignature<":", Schema.Type<S>, never, ":", Schema.Encoded<S>, false, Schema.Context<S>>
{
  readonly from: S
  annotations(annotations: PropertySignature.Annotations<Schema.Type<S>>): propertySignature<S>
}

/**
 * Lifts a `Schema` into a `PropertySignature`.
 *
 * @category PropertySignature
 * @since 0.67.0
 */
export const propertySignature = <S extends Schema.All>(
  self: S
): propertySignature<S> =>
  new PropertySignatureWithFromImpl(
    new PropertySignatureDeclaration(self.ast, false, true, {}, undefined),
    self
  )

/**
 * Enhances a property signature with a default constructor value.
 *
 * @category PropertySignature
 * @since 0.67.0
 */
export const withConstructorDefault: {
  <Type>(defaultValue: () => Types.NoInfer<Type>): <
    TypeToken extends PropertySignature.Token,
    Key extends PropertyKey,
    EncodedToken extends PropertySignature.Token,
    Encoded,
    R
  >(
    self: PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, boolean, R>
  ) => PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, true, R>
  <
    TypeToken extends PropertySignature.Token,
    Type,
    Key extends PropertyKey,
    EncodedToken extends PropertySignature.Token,
    Encoded,
    R
  >(
    self: PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, boolean, R>,
    defaultValue: () => Types.NoInfer<Type>
  ): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, true, R>
} = dual(2, <
  TypeToken extends PropertySignature.Token,
  Type,
  Key extends PropertyKey,
  EncodedToken extends PropertySignature.Token,
  Encoded,
  R
>(
  self: PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, boolean, R>,
  defaultValue: () => Types.NoInfer<Type>
): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, true, R> => {
  const ast = self.ast
  switch (ast._tag) {
    case "PropertySignatureDeclaration":
      return makePropertySignature(
        new PropertySignatureDeclaration(ast.type, ast.isOptional, ast.isReadonly, ast.annotations, defaultValue)
      )
    case "PropertySignatureTransformation":
      return makePropertySignature(
        new PropertySignatureTransformation(
          ast.from,
          new ToPropertySignature(ast.to.type, ast.to.isOptional, ast.to.isReadonly, ast.to.annotations, defaultValue),
          ast.decode,
          ast.encode
        )
      )
  }
})

const applyDefaultValue = <A>(o: option_.Option<A>, defaultValue: () => A) =>
  option_.match(o, {
    onNone: () => option_.some(defaultValue()),
    onSome: (value) => option_.some(value === undefined ? defaultValue() : value)
  })

/**
 * Enhances a property signature with a default decoding value.
 *
 * @category PropertySignature
 * @since 0.67.0
 */
export const withDecodingDefault: {
  <Type>(defaultValue: () => Types.NoInfer<Type>): <
    Key extends PropertyKey,
    Encoded,
    HasDefault extends boolean,
    R
  >(
    self: PropertySignature<"?:", Type, Key, "?:", Encoded, HasDefault, R>
  ) => PropertySignature<":", Exclude<Type, undefined>, Key, "?:", Encoded, HasDefault, R>
  <
    Type,
    Key extends PropertyKey,
    Encoded,
    HasDefault extends boolean,
    R
  >(
    self: PropertySignature<"?:", Type, Key, "?:", Encoded, HasDefault, R>,
    defaultValue: () => Types.NoInfer<Type>
  ): PropertySignature<":", Exclude<Type, undefined>, Key, "?:", Encoded, HasDefault, R>
} = dual(2, <
  Type,
  Key extends PropertyKey,
  Encoded,
  R
>(
  self: PropertySignature<"?:", Type, Key, "?:", Encoded, boolean, R>,
  defaultValue: () => Types.NoInfer<Type>
): PropertySignature<":", Exclude<Type, undefined>, Key, "?:", Encoded, true, R> => {
  const ast = self.ast
  switch (ast._tag) {
    case "PropertySignatureDeclaration":
      return makePropertySignature(
        new PropertySignatureTransformation(
          ast,
          new ToPropertySignature(AST.typeAST(ast.type), false, true, {}, undefined),
          (o) => applyDefaultValue(o, defaultValue),
          identity
        )
      )
    case "PropertySignatureTransformation":
      return makePropertySignature(
        new PropertySignatureTransformation(
          ast.from,
          new ToPropertySignature(ast.to.type, false, ast.to.isReadonly, ast.to.annotations, ast.to.defaultValue),
          (o) => applyDefaultValue(ast.decode(o), defaultValue),
          ast.encode
        )
      )
  }
})

/**
 * Enhances a property signature with a default decoding value and a default constructor value.
 *
 * @category PropertySignature
 * @since 0.67.0
 */
export const withDefaults: {
  <Type>(defaults: {
    constructor: () => Types.NoInfer<Exclude<Type, undefined>>
    decoding: () => Types.NoInfer<Type>
  }): <
    Key extends PropertyKey,
    Encoded,
    R
  >(
    self: PropertySignature<"?:", Type, Key, "?:", Encoded, boolean, R>
  ) => PropertySignature<":", Exclude<Type, undefined>, Key, "?:", Encoded, true, R>
  <
    Type,
    Key extends PropertyKey,
    Encoded,
    R
  >(
    self: PropertySignature<"?:", Type, Key, "?:", Encoded, boolean, R>,
    defaults: {
      constructor: () => Types.NoInfer<Exclude<Type, undefined>>
      decoding: () => Types.NoInfer<Type>
    }
  ): PropertySignature<":", Exclude<Type, undefined>, Key, "?:", Encoded, true, R>
} = dual(2, <
  Type,
  Key extends PropertyKey,
  Encoded,
  R
>(
  self: PropertySignature<"?:", Type, Key, "?:", Encoded, boolean, R>,
  defaults: {
    constructor: () => Types.NoInfer<Exclude<Type, undefined>>
    decoding: () => Types.NoInfer<Type>
  }
): PropertySignature<":", Exclude<Type, undefined>, Key, "?:", Encoded, true, R> =>
  self.pipe(withDecodingDefault(defaults.decoding), withConstructorDefault(defaults.constructor)))

/**
 * Enhances a property signature by specifying a different key for it in the Encoded type.
 *
 * @category PropertySignature
 * @since 0.67.0
 */
export const fromKey: {
  <Key extends PropertyKey>(key: Key): <
    TypeToken extends PropertySignature.Token,
    Type,
    EncodedToken extends PropertySignature.Token,
    Encoded,
    HasDefault extends boolean,
    R
  >(
    self: PropertySignature<TypeToken, Type, PropertyKey, EncodedToken, Encoded, HasDefault, R>
  ) => PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R>
  <
    Type,
    TypeToken extends PropertySignature.Token,
    Encoded,
    EncodedToken extends PropertySignature.Token,
    HasDefault extends boolean,
    R,
    Key extends PropertyKey
  >(
    self: PropertySignature<TypeToken, Type, PropertyKey, EncodedToken, Encoded, HasDefault, R>,
    key: Key
  ): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R>
} = dual(2, <
  Type,
  TypeToken extends PropertySignature.Token,
  Encoded,
  EncodedToken extends PropertySignature.Token,
  HasDefault extends boolean,
  R,
  Key extends PropertyKey
>(
  self: PropertySignature<TypeToken, Type, PropertyKey, EncodedToken, Encoded, HasDefault, R>,
  key: Key
): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R> => {
  const ast = self.ast
  switch (ast._tag) {
    case "PropertySignatureDeclaration": {
      return makePropertySignature(
        new PropertySignatureTransformation(
          new FromPropertySignature(
            ast.type,
            ast.isOptional,
            ast.isReadonly,
            ast.annotations,
            key
          ),
          new ToPropertySignature(AST.typeAST(ast.type), ast.isOptional, ast.isReadonly, {}, ast.defaultValue),
          identity,
          identity
        )
      )
    }
    case "PropertySignatureTransformation":
      return makePropertySignature(
        new PropertySignatureTransformation(
          new FromPropertySignature(
            ast.from.type,
            ast.from.isOptional,
            ast.from.isReadonly,
            ast.from.annotations,
            key
          ),
          ast.to,
          ast.decode,
          ast.encode
        )
      )
  }
})

/**
 * Converts an optional property to a required one through a transformation `Option -> Type`.
 *
 * - `decode`: `none` as argument means the value is missing in the input.
 * - `encode`: `none` as return value means the value will be missing in the output.
 *
 * @category PropertySignature
 * @since 0.67.0
 */
export const optionalToRequired = <FA, FI, FR, TA, TI, TR>(
  from: Schema<FA, FI, FR>,
  to: Schema<TA, TI, TR>,
  options: {
    readonly decode: (o: option_.Option<FA>) => TI
    readonly encode: (ti: TI) => option_.Option<FA>
  }
): PropertySignature<":", TA, never, "?:", FI, false, FR | TR> =>
  makePropertySignature(
    new PropertySignatureTransformation(
      new FromPropertySignature(from.ast, true, true, {}, undefined),
      new ToPropertySignature(to.ast, false, true, {}, undefined),
      (o) => option_.some(options.decode(o)),
      option_.flatMap(options.encode)
    )
  )

/**
 * Converts an optional property to a required one through a transformation `Type -> Option`.
 *
 * - `decode`: `none` as return value means the value will be missing in the output.
 * - `encode`: `none` as argument means the value is missing in the input.
 *
 * @category PropertySignature
 * @since 0.67.15
 */
export const requiredToOptional = <FA, FI, FR, TA, TI, TR>(
  from: Schema<FA, FI, FR>,
  to: Schema<TA, TI, TR>,
  options: {
    readonly decode: (fa: FA) => option_.Option<TI>
    readonly encode: (o: option_.Option<TI>) => FA
  }
): PropertySignature<"?:", TA, never, ":", FI, false, FR | TR> =>
  makePropertySignature(
    new PropertySignatureTransformation(
      new FromPropertySignature(from.ast, false, true, {}, undefined),
      new ToPropertySignature(to.ast, true, true, {}, undefined),
      option_.flatMap(options.decode),
      (o) => option_.some(options.encode(o))
    )
  )

/**
 * Converts an optional property to another optional property through a transformation `Option -> Option`.
 *
 * - `decode`:
 *   - `none` as argument means the value is missing in the input.
 *   - `none` as return value means the value will be missing in the output.
 * - `encode`:
 *   - `none` as argument means the value is missing in the input.
 *   - `none` as return value means the value will be missing in the output.
 *
 * @category PropertySignature
 * @since 0.67.0
 */
export const optionalToOptional = <FA, FI, FR, TA, TI, TR>(
  from: Schema<FA, FI, FR>,
  to: Schema<TA, TI, TR>,
  options: {
    readonly decode: (o: option_.Option<FA>) => option_.Option<TI>
    readonly encode: (o: option_.Option<TI>) => option_.Option<FA>
  }
): PropertySignature<"?:", TA, never, "?:", FI, false, FR | TR> =>
  makePropertySignature(
    new PropertySignatureTransformation(
      new FromPropertySignature(from.ast, true, true, {}, undefined),
      new ToPropertySignature(to.ast, true, true, {}, undefined),
      options.decode,
      options.encode
    )
  )

/**
 * @since 0.67.0
 */
export type OptionalOptions<A> = {
  readonly default?: never
  readonly as?: never
  readonly exact?: true
  readonly nullable?: true
} | {
  readonly default: LazyArg<A>
  readonly as?: never
  readonly exact?: true
  readonly nullable?: true
} | {
  readonly as: "Option"
  readonly default?: never
  readonly exact?: never
  readonly nullable?: never
  readonly onNoneEncoding?: LazyArg<option_.Option<undefined>>
} | {
  readonly as: "Option"
  readonly default?: never
  readonly exact?: never
  readonly nullable: true
  readonly onNoneEncoding?: LazyArg<option_.Option<null | undefined>>
} | {
  readonly as: "Option"
  readonly default?: never
  readonly exact: true
  readonly nullable?: never
  readonly onNoneEncoding?: never
} | {
  readonly as: "Option"
  readonly default?: never
  readonly exact: true
  readonly nullable: true
  readonly onNoneEncoding?: LazyArg<option_.Option<null>>
} | undefined

/**
 * @category api interface
 * @since 0.67.10
 */
export interface optional<S extends Schema.All> extends
  PropertySignature<
    "?:",
    Schema.Type<S> | undefined,
    never,
    "?:",
    Schema.Encoded<S> | undefined,
    false,
    Schema.Context<S>
  >
{
  readonly from: S
  annotations(annotations: PropertySignature.Annotations<Schema.Type<S> | undefined>): optional<S>
}

/**
 * @category api interface
 * @since 0.69.0
 */
export interface optionalWith<S extends Schema.All, Options> extends
  PropertySignature<
    Types.Has<Options, "as" | "default"> extends true ? ":" : "?:",
    | (Types.Has<Options, "as"> extends true ? option_.Option<Schema.Type<S>> : Schema.Type<S>)
    | (Types.Has<Options, "as" | "default" | "exact"> extends true ? never : undefined),
    never,
    "?:",
    | Schema.Encoded<S>
    | (Types.Has<Options, "nullable"> extends true ? null : never)
    | (Types.Has<Options, "exact"> extends true ? never : undefined),
    Types.Has<Options, "default">,
    Schema.Context<S>
  >
{
  readonly from: S
  annotations(
    annotations: PropertySignature.Annotations<
      | (Types.Has<Options, "as"> extends true ? option_.Option<Schema.Type<S>> : Schema.Type<S>)
      | (Types.Has<Options, "as" | "default" | "exact"> extends true ? never : undefined)
    >
  ): optionalWith<S, Options>
}

const optionalPropertySignatureAST = <A, I, R>(
  self: Schema<A, I, R>,
  options?: {
    readonly exact?: true
    readonly default?: () => A
    readonly nullable?: true
    readonly as?: "Option"
    readonly onNoneEncoding?: () => option_.Option<never>
  }
): PropertySignature.AST => {
  const isExact = options?.exact
  const defaultValue = options?.default
  const isNullable = options?.nullable
  const asOption = options?.as == "Option"
  const asOptionEncode = options?.onNoneEncoding ? option_.orElse(options.onNoneEncoding) : identity

  if (isExact) {
    if (defaultValue) {
      if (isNullable) {
        return withConstructorDefault(
          optionalToRequired(
            NullOr(self),
            typeSchema(self),
            {
              decode: option_.match({ onNone: defaultValue, onSome: (a) => a === null ? defaultValue() : a }),
              encode: option_.some
            }
          ),
          defaultValue
        ).ast
      } else {
        return withConstructorDefault(
          optionalToRequired(
            self,
            typeSchema(self),
            { decode: option_.match({ onNone: defaultValue, onSome: identity }), encode: option_.some }
          ),
          defaultValue
        ).ast
      }
    } else if (asOption) {
      if (isNullable) {
        return optionalToRequired(
          NullOr(self),
          OptionFromSelf(typeSchema(self)),
          {
            decode: option_.filter(Predicate.isNotNull<A | null>),
            encode: asOptionEncode
          }
        ).ast
      } else {
        return optionalToRequired(
          self,
          OptionFromSelf(typeSchema(self)),
          { decode: identity, encode: identity }
        ).ast
      }
    } else {
      if (isNullable) {
        return optionalToOptional(
          NullOr(self),
          typeSchema(self),
          { decode: option_.filter(Predicate.isNotNull<A | null>), encode: identity }
        ).ast
      } else {
        return new PropertySignatureDeclaration(self.ast, true, true, {}, undefined)
      }
    }
  } else {
    if (defaultValue) {
      if (isNullable) {
        return withConstructorDefault(
          optionalToRequired(
            NullishOr(self),
            typeSchema(self),
            {
              decode: option_.match({ onNone: defaultValue, onSome: (a) => (a == null ? defaultValue() : a) }),
              encode: option_.some
            }
          ),
          defaultValue
        ).ast
      } else {
        return withConstructorDefault(
          optionalToRequired(
            UndefinedOr(self),
            typeSchema(self),
            {
              decode: option_.match({ onNone: defaultValue, onSome: (a) => (a === undefined ? defaultValue() : a) }),
              encode: option_.some
            }
          ),
          defaultValue
        ).ast
      }
    } else if (asOption) {
      if (isNullable) {
        return optionalToRequired(
          NullishOr(self),
          OptionFromSelf(typeSchema(self)),
          {
            decode: option_.filter<A | null | undefined, A>((a): a is A => a != null),
            encode: asOptionEncode
          }
        ).ast
      } else {
        return optionalToRequired(
          UndefinedOr(self),
          OptionFromSelf(typeSchema(self)),
          {
            decode: option_.filter(Predicate.isNotUndefined<A | undefined>),
            encode: asOptionEncode
          }
        ).ast
      }
    } else {
      if (isNullable) {
        return optionalToOptional(
          NullishOr(self),
          UndefinedOr(typeSchema(self)),
          { decode: option_.filter(Predicate.isNotNull<A | null | undefined>), encode: identity }
        ).ast
      } else {
        return new PropertySignatureDeclaration(UndefinedOr(self).ast, true, true, {}, undefined)
      }
    }
  }
}

/**
 * @category PropertySignature
 * @since 0.69.0
 */
export const optional = <S extends Schema.Any>(self: S): optional<S> =>
  new PropertySignatureWithFromImpl(
    new PropertySignatureDeclaration(UndefinedOr(self).ast, true, true, {}, undefined),
    self
  )

/**
 * @category PropertySignature
 * @since 0.69.0
 */
export const optionalWith: {
  <S extends Schema.All, Options extends OptionalOptions<Schema.Type<S>>>(
    options: Options
  ): (self: S) => optionalWith<S, Options>
  <S extends Schema.All, Options extends OptionalOptions<Schema.Type<S>>>(
    self: S,
    options: Options
  ): optionalWith<S, Options>
} = dual((args) => isSchema(args[0]), (self, options) => {
  return new PropertySignatureWithFromImpl(optionalPropertySignatureAST(self, options), self)
})

/**
 * @since 0.67.0
 */
export declare namespace Struct {
  /**
   * @since 0.67.0
   */
  export type Fields = {
    readonly [x: PropertyKey]:
      | Schema.All
      | PropertySignature.All
  }

  type Key<F extends Fields, K extends keyof F> = [K] extends [never] ? never :
    F[K] extends PropertySignature.All<infer Key> ? [Key] extends [never] ? K : Key :
    K

  type EncodedTokenKeys<Fields extends Struct.Fields> = {
    [K in keyof Fields]: Fields[K] extends
      | PropertySignature<PropertySignature.Token, any, PropertyKey, "?:", any, boolean, unknown>
      | PropertySignature<PropertySignature.Token, any, PropertyKey, "?:", never, boolean, unknown>
      | PropertySignature<PropertySignature.Token, never, PropertyKey, "?:", any, boolean, unknown>
      | PropertySignature<PropertySignature.Token, never, PropertyKey, "?:", never, boolean, unknown> ? K
      : never
  }[keyof Fields]

  type TypeTokenKeys<Fields extends Struct.Fields> = {
    [K in keyof Fields]: Fields[K] extends OptionalPropertySignature ? K : never
  }[keyof Fields]

  type OptionalPropertySignature =
    | PropertySignature<"?:", any, PropertyKey, PropertySignature.Token, any, boolean, unknown>
    | PropertySignature<"?:", any, PropertyKey, PropertySignature.Token, never, boolean, unknown>
    | PropertySignature<"?:", never, PropertyKey, PropertySignature.Token, any, boolean, unknown>
    | PropertySignature<"?:", never, PropertyKey, PropertySignature.Token, never, boolean, unknown>

  /**
   * @since 0.67.0
   */
  export type Type<F extends Fields> = Types.UnionToIntersection<
    {
      [K in keyof F]: F[K] extends OptionalPropertySignature ? { readonly [H in K]?: Schema.Type<F[H]> } :
        { readonly [h in K]: Schema.Type<F[h]> }
    }[keyof F]
  > extends infer Q ? Q : never

  /**
   * @since 0.67.0
   */
  export type Encoded<F extends Fields> =
    & { readonly [K in Exclude<keyof F, EncodedTokenKeys<F>> as Key<F, K>]: Schema.Encoded<F[K]> }
    & { readonly [K in EncodedTokenKeys<F> as Key<F, K>]?: Schema.Encoded<F[K]> }

  /**
   * @since 0.67.0
   */
  export type Context<F extends Fields> = Schema.Context<F[keyof F]>

  type PropertySignatureWithDefault =
    | PropertySignature<PropertySignature.Token, any, PropertyKey, PropertySignature.Token, any, true, unknown>
    | PropertySignature<PropertySignature.Token, any, PropertyKey, PropertySignature.Token, never, true, unknown>
    | PropertySignature<PropertySignature.Token, never, PropertyKey, PropertySignature.Token, any, true, unknown>
    | PropertySignature<PropertySignature.Token, never, PropertyKey, PropertySignature.Token, never, true, unknown>

  /**
   * @since 0.67.0
   */
  export type Constructor<F extends Fields> = Types.UnionToIntersection<
    {
      [K in keyof F]: F[K] extends OptionalPropertySignature ? { readonly [H in K]?: Schema.Type<F[H]> } :
        F[K] extends PropertySignatureWithDefault ? { readonly [H in K]?: Schema.Type<F[H]> } :
        { readonly [h in K]: Schema.Type<F[h]> }
    }[keyof F]
  > extends infer Q ? Q : never
}

/**
 * @since 0.67.0
 */
export declare namespace IndexSignature {
  /**
   * @since 0.67.0
   */
  export type Record = { readonly key: Schema.All; readonly value: Schema.All }

  /**
   * @since 0.67.0
   */
  export type Records = ReadonlyArray<Record>

  /**
   * @since 0.67.0
   */
  export type NonEmptyRecords = array_.NonEmptyReadonlyArray<Record>

  /**
   * @since 0.67.0
   */
  export type Type<
    Records extends IndexSignature.Records
  > = Types.UnionToIntersection<
    {
      [K in keyof Records]: {
        readonly [P in Schema.Type<Records[K]["key"]>]: Schema.Type<Records[K]["value"]>
      }
    }[number]
  >

  /**
   * @since 0.67.0
   */
  export type Encoded<
    Records extends IndexSignature.Records
  > = Types.UnionToIntersection<
    {
      [K in keyof Records]: {
        readonly [P in Schema.Encoded<Records[K]["key"]>]: Schema.Encoded<Records[K]["value"]>
      }
    }[number]
  >

  /**
   * @since 0.67.0
   */
  export type Context<Records extends IndexSignature.Records> = {
    [K in keyof Records]: Schema.Context<Records[K]["key"]> | Schema.Context<Records[K]["value"]>
  }[number]
}

/**
 * @since 0.67.0
 */
export declare namespace TypeLiteral {
  /**
   * @since 0.67.0
   */
  export type Type<Fields extends Struct.Fields, Records extends IndexSignature.Records> =
    & Struct.Type<Fields>
    & IndexSignature.Type<Records>

  /**
   * @since 0.67.0
   */
  export type Encoded<Fields extends Struct.Fields, Records extends IndexSignature.Records> =
    & Struct.Encoded<Fields>
    & IndexSignature.Encoded<Records>

  /**
   * @since 0.67.0
   */
  export type Constructor<Fields extends Struct.Fields, Records extends IndexSignature.Records> =
    & Struct.Constructor<Fields>
    & IndexSignature.Type<Records>
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface TypeLiteral<
  Fields extends Struct.Fields,
  Records extends IndexSignature.Records
> extends
  AnnotableClass<
    TypeLiteral<Fields, Records>,
    Simplify<TypeLiteral.Type<Fields, Records>>,
    Simplify<TypeLiteral.Encoded<Fields, Records>>,
    | Struct.Context<Fields>
    | IndexSignature.Context<Records>
  >
{
  readonly fields: { readonly [K in keyof Fields]: Fields[K] }
  readonly records: Readonly<Records>
  annotations(
    annotations: Annotations.Schema<Simplify<TypeLiteral.Type<Fields, Records>>>
  ): TypeLiteral<Fields, Records>
  make(
    props: Simplify<TypeLiteral.Constructor<Fields, Records>>,
    options?: MakeOptions
  ): Simplify<TypeLiteral.Type<Fields, Records>>
}

const isPropertySignature = (u: unknown): u is PropertySignature.All =>
  Predicate.hasProperty(u, PropertySignatureTypeId)

const getDefaultTypeLiteralAST = <
  Fields extends Struct.Fields,
  const Records extends IndexSignature.Records
>(fields: Fields, records: Records) => {
  const ownKeys = util_.ownKeys(fields)
  const pss: Array<AST.PropertySignature> = []
  if (ownKeys.length > 0) {
    const from: Array<AST.PropertySignature> = []
    const to: Array<AST.PropertySignature> = []
    const transformations: Array<AST.PropertySignatureTransformation> = []
    for (let i = 0; i < ownKeys.length; i++) {
      const key = ownKeys[i]
      const field = fields[key]
      if (isPropertySignature(field)) {
        const ast: PropertySignature.AST = field.ast
        switch (ast._tag) {
          case "PropertySignatureDeclaration": {
            const type = ast.type
            const isOptional = ast.isOptional
            const toAnnotations = ast.annotations
            from.push(new AST.PropertySignature(key, type, isOptional, true))
            to.push(new AST.PropertySignature(key, AST.typeAST(type), isOptional, true, toAnnotations))
            pss.push(
              new AST.PropertySignature(key, type, isOptional, true, toAnnotations)
            )
            break
          }
          case "PropertySignatureTransformation": {
            const fromKey = ast.from.fromKey ?? key
            from.push(
              new AST.PropertySignature(fromKey, ast.from.type, ast.from.isOptional, true, ast.from.annotations)
            )
            to.push(
              new AST.PropertySignature(key, ast.to.type, ast.to.isOptional, true, ast.to.annotations)
            )
            transformations.push(new AST.PropertySignatureTransformation(fromKey, key, ast.decode, ast.encode))
            break
          }
        }
      } else {
        from.push(new AST.PropertySignature(key, field.ast, false, true))
        to.push(new AST.PropertySignature(key, AST.typeAST(field.ast), false, true))
        pss.push(new AST.PropertySignature(key, field.ast, false, true))
      }
    }
    if (array_.isNonEmptyReadonlyArray(transformations)) {
      const issFrom: Array<AST.IndexSignature> = []
      const issTo: Array<AST.IndexSignature> = []
      for (const r of records) {
        const { indexSignatures, propertySignatures } = AST.record(r.key.ast, r.value.ast)
        propertySignatures.forEach((ps) => {
          from.push(ps)
          to.push(
            new AST.PropertySignature(ps.name, AST.typeAST(ps.type), ps.isOptional, ps.isReadonly, ps.annotations)
          )
        })
        indexSignatures.forEach((is) => {
          issFrom.push(is)
          issTo.push(new AST.IndexSignature(is.parameter, AST.typeAST(is.type), is.isReadonly))
        })
      }
      return new AST.Transformation(
        new AST.TypeLiteral(from, issFrom, { [AST.TitleAnnotationId]: "Struct (Encoded side)" }),
        new AST.TypeLiteral(to, issTo, { [AST.TitleAnnotationId]: "Struct (Type side)" }),
        new AST.TypeLiteralTransformation(transformations)
      )
    }
  }
  const iss: Array<AST.IndexSignature> = []
  for (const r of records) {
    const { indexSignatures, propertySignatures } = AST.record(r.key.ast, r.value.ast)
    propertySignatures.forEach((ps) => pss.push(ps))
    indexSignatures.forEach((is) => iss.push(is))
  }
  return new AST.TypeLiteral(pss, iss)
}

const lazilyMergeDefaults = (
  fields: Struct.Fields,
  out: Record<PropertyKey, unknown>
): { [x: string | symbol]: unknown } => {
  const ownKeys = util_.ownKeys(fields)
  for (const key of ownKeys) {
    const field = fields[key]
    if (out[key] === undefined && isPropertySignature(field)) {
      const ast = field.ast
      const defaultValue = ast._tag === "PropertySignatureDeclaration" ? ast.defaultValue : ast.to.defaultValue
      if (defaultValue !== undefined) {
        out[key] = defaultValue()
      }
    }
  }
  return out
}

const makeTypeLiteralClass = <
  Fields extends Struct.Fields,
  const Records extends IndexSignature.Records
>(
  fields: Fields,
  records: Records,
  ast: AST.AST = getDefaultTypeLiteralAST(fields, records)
): TypeLiteral<Fields, Records> => {
  return class TypeLiteralClass extends make<
    Simplify<TypeLiteral.Type<Fields, Records>>,
    Simplify<TypeLiteral.Encoded<Fields, Records>>,
    | Struct.Context<Fields>
    | IndexSignature.Context<Records>
  >(ast) {
    static override annotations(
      annotations: Annotations.Schema<Simplify<TypeLiteral.Type<Fields, Records>>>
    ): TypeLiteral<Fields, Records> {
      return makeTypeLiteralClass(this.fields, this.records, mergeSchemaAnnotations(this.ast, annotations))
    }

    static fields = { ...fields }

    static records = [...records] as Records

    static make = (
      props: Simplify<TypeLiteral.Constructor<Fields, Records>>,
      options?: MakeOptions
    ): Simplify<TypeLiteral.Type<Fields, Records>> => {
      const propsWithDefaults: any = lazilyMergeDefaults(fields, { ...props as any })
      return getDisableValidationMakeOption(options)
        ? propsWithDefaults
        : ParseResult.validateSync(this)(propsWithDefaults)
    }

    static pick(...keys: Array<keyof Fields>): Struct<Simplify<Pick<Fields, typeof keys[number]>>> {
      return Struct(struct_.pick(fields, ...keys) as any)
    }

    static omit(...keys: Array<keyof Fields>): Struct<Simplify<Omit<Fields, typeof keys[number]>>> {
      return Struct(struct_.omit(fields, ...keys) as any)
    }
  }
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Struct<Fields extends Struct.Fields> extends TypeLiteral<Fields, []> {
  annotations(annotations: Annotations.Schema<Simplify<Struct.Type<Fields>>>): Struct<Fields>
  /** @since 0.68.17 */
  pick<Keys extends ReadonlyArray<keyof Fields>>(...keys: Keys): Struct<Simplify<Pick<Fields, Keys[number]>>>
  /** @since 0.68.17 */
  omit<Keys extends ReadonlyArray<keyof Fields>>(...keys: Keys): Struct<Simplify<Omit<Fields, Keys[number]>>>
}

/**
 * @category constructors
 * @since 0.67.0
 */
export function Struct<Fields extends Struct.Fields, const Records extends IndexSignature.NonEmptyRecords>(
  fields: Fields,
  ...records: Records
): TypeLiteral<Fields, Records>
export function Struct<Fields extends Struct.Fields>(fields: Fields): Struct<Fields>
export function Struct<Fields extends Struct.Fields, const Records extends IndexSignature.Records>(
  fields: Fields,
  ...records: Records
): TypeLiteral<Fields, Records> {
  return makeTypeLiteralClass(fields, records)
}

/**
 * @category api interface
 * @since 0.67.14
 */
export interface tag<Tag extends AST.LiteralValue> extends PropertySignature<":", Tag, never, ":", Tag, true, never> {}

/**
 * Returns a property signature that represents a tag.
 * A tag is a literal value that is used to distinguish between different types of objects.
 * The tag is optional when using the `make` method.
 *
 * @see {@link TaggedStruct}
 *
 * @example
 * import { Schema } from "@effect/schema"
 *
 * const User = Schema.Struct({
 *   _tag: Schema.tag("User"),
 *   name: Schema.String,
 *   age: Schema.Number
 * })
 *
 * assert.deepStrictEqual(User.make({ name: "John", age: 44 }), { _tag: "User", name: "John", age: 44 })
 *
 * @since 0.67.14
 */
export const tag = <Tag extends AST.LiteralValue>(tag: Tag): tag<Tag> =>
  Literal(tag).pipe(propertySignature, withConstructorDefault(() => tag))

/**
 * @category api interface
 * @since 0.67.14
 */
export type TaggedStruct<Tag extends AST.LiteralValue, Fields extends Struct.Fields> = Struct<
  { _tag: tag<Tag> } & Fields
>

/**
 * A tagged struct is a struct that has a tag property that is used to distinguish between different types of objects.
 *
 * The tag is optional when using the `make` method.
 *
 * @example
 * import { Schema } from "@effect/schema"
 *
 * const User = Schema.TaggedStruct("User", {
 *   name: Schema.String,
 *   age: Schema.Number
 * })
 *
 * assert.deepStrictEqual(User.make({ name: "John", age: 44 }), { _tag: "User", name: "John", age: 44 })
 *
 * @category constructors
 * @since 0.67.14
 */
export const TaggedStruct = <Tag extends AST.LiteralValue, Fields extends Struct.Fields>(
  value: Tag,
  fields: Fields
): TaggedStruct<Tag, Fields> => Struct({ _tag: tag(value), ...fields })

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Record$<K extends Schema.All, V extends Schema.All> extends TypeLiteral<{}, [{ key: K; value: V }]> {
  readonly key: K
  readonly value: V
  annotations(
    annotations: Annotations.Schema<Simplify<TypeLiteral.Type<{}, [{ key: K; value: V }]>>>
  ): Record$<K, V>
}

const makeRecordClass = <K extends Schema.All, V extends Schema.All>(key: K, value: V, ast?: AST.AST): Record$<K, V> =>
  class RecordClass extends makeTypeLiteralClass({}, [{ key, value }], ast) {
    static override annotations(
      annotations: Annotations.Schema<Simplify<TypeLiteral.Type<{}, [{ key: K; value: V }]>>>
    ) {
      return makeRecordClass(key, value, mergeSchemaAnnotations(this.ast, annotations))
    }

    static key = key

    static value = value
  }

/**
 * @category constructors
 * @since 0.67.0
 */
export const Record = <K extends Schema.All, V extends Schema.All>(
  options: { readonly key: K; readonly value: V }
): Record$<K, V> => makeRecordClass(options.key, options.value)

/**
 * @category struct transformations
 * @since 0.67.0
 */
export const pick = <A, I, Keys extends ReadonlyArray<keyof A & keyof I>>(...keys: Keys) =>
<R>(
  self: Schema<A, I, R>
): SchemaClass<Simplify<Pick<A, Keys[number]>>, Simplify<Pick<I, Keys[number]>>, R> => make(AST.pick(self.ast, keys))

/**
 * @category struct transformations
 * @since 0.67.0
 */
export const omit = <A, I, Keys extends ReadonlyArray<keyof A & keyof I>>(...keys: Keys) =>
<R>(
  self: Schema<A, I, R>
): SchemaClass<Simplify<Omit<A, Keys[number]>>, Simplify<Omit<I, Keys[number]>>, R> => make(AST.omit(self.ast, keys))

/**
 * Given a schema `Schema<A, I, R>` and a key `key: K`, this function extracts a specific field from the `A` type,
 * producing a new schema that represents a transformation from the `{ readonly [key]: I[K] }` type to `A[K]`.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 *
 * // ---------------------------------------------
 * // use case: pull out a single field from a
 * // struct through a transformation
 * // ---------------------------------------------
 *
 * const mytable = S.Struct({
 *   column1: S.NumberFromString,
 *   column2: S.Number
 * })
 *
 * // const pullOutColumn: S.Schema<number, {
 * //     readonly column1: string;
 * // }, never>
 * const pullOutColumn = mytable.pipe(S.pluck("column1"))
 *
 * console.log(S.decodeUnknownEither(S.Array(pullOutColumn))([{ column1: "1", column2: 100 }, { column1: "2", column2: 300 }]))
 * // Output: { _id: 'Either', _tag: 'Right', right: [ 1, 2 ] }
 *
 * @category struct transformations
 * @since 0.67.0
 */
export const pluck: {
  <A, I, K extends keyof A & keyof I>(
    key: K
  ): <R>(schema: Schema<A, I, R>) => Schema<A[K], { readonly [P in K]: I[P] }, R>
  <A, I, R, K extends keyof A & keyof I>(
    schema: Schema<A, I, R>,
    key: K
  ): Schema<A[K], { readonly [P in K]: I[P] }, R>
} = dual(
  2,
  <A, I, R, K extends keyof A & keyof I>(
    schema: Schema<A, I, R>,
    key: K
  ): Schema<A[K], Pick<I, K>, R> => {
    const ps = AST.getPropertyKeyIndexedAccess(AST.typeAST(schema.ast), key)
    const value = make<A[K], A[K], R>(ps.isOptional ? AST.orUndefined(ps.type) : ps.type)
    return transform(
      schema.pipe(pick(key)),
      value,
      {
        strict: true,
        decode: (a: any) => a[key],
        encode: (ak) => ps.isOptional && ak === undefined ? {} : { [key]: ak } as any
      }
    )
  }
)

/**
 * @category branding
 * @since 0.67.0
 */
export interface BrandSchema<A extends Brand<any>, I = A, R = never>
  extends AnnotableClass<BrandSchema<A, I, R>, A, I, R>
{
  make(a: Brand.Unbranded<A>, options?: MakeOptions): A
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface brand<S extends Schema.Any, B extends string | symbol>
  extends BrandSchema<Schema.Type<S> & Brand<B>, Schema.Encoded<S>, Schema.Context<S>>
{
  annotations(annotations: Annotations.Schema<Schema.Type<S> & Brand<B>>): brand<S, B>
}

const makeBrandClass = <S extends Schema.Any, B extends string | symbol>(ast: AST.AST): brand<S, B> =>
  class BrandClass extends make<Schema.Type<S> & Brand<B>, Schema.Encoded<S>, Schema.Context<S>>(ast) {
    static override annotations(annotations: Annotations.Schema<Schema.Type<S> & Brand<B>>): brand<S, B> {
      return makeBrandClass(mergeSchemaAnnotations(this.ast, annotations))
    }

    static make = (a: Brand.Unbranded<Schema.Type<S> & Brand<B>>, options?: MakeOptions): Schema.Type<S> & Brand<B> => {
      return getDisableValidationMakeOption(options) ? a : ParseResult.validateSync(this)(a)
    }
  }

/**
 * Returns a nominal branded schema by applying a brand to a given schema.
 *
 * ```
 * Schema<A> + B -> Schema<A & Brand<B>>
 * ```
 *
 * @param self - The input schema to be combined with the brand.
 * @param brand - The brand to apply.
 *
 * @example
 * import * as Schema from "@effect/schema/Schema"
 *
 * const Int = Schema.Number.pipe(Schema.int(), Schema.brand("Int"))
 * type Int = Schema.Schema.Type<typeof Int> // number & Brand<"Int">
 *
 * @category branding
 * @since 0.67.0
 */
export const brand = <S extends Schema.AnyNoContext, B extends string | symbol>(
  brand: B,
  annotations?: Annotations.Schema<Schema.Type<S> & Brand<B>>
) =>
(self: S): brand<S, B> => {
  const annotation: AST.BrandAnnotation = option_.match(AST.getBrandAnnotation(self.ast), {
    onNone: () => [brand],
    onSome: (brands) => [...brands, brand]
  })
  const ast = AST.annotations(
    self.ast,
    toASTAnnotations({
      // add a default title annotation containing the brand
      title: String(self.ast) + ` & Brand<${util_.formatUnknown(brand)}>`,
      ...annotations,
      [AST.BrandAnnotationId]: annotation
    })
  )
  return makeBrandClass(ast)
}

/**
 * @category combinators
 * @since 0.69.0
 */
export const partial = <A, I, R>(
  self: Schema<A, I, R>
): SchemaClass<{ [K in keyof A]?: A[K] | undefined }, { [K in keyof I]?: I[K] | undefined }, R> =>
  make(AST.partial(self.ast))

/**
 * @category combinators
 * @since 0.69.0
 */
export const partialWith: {
  <const Options extends { readonly exact: true }>(options: Options): <A, I, R>(
    self: Schema<A, I, R>
  ) => SchemaClass<{ [K in keyof A]?: A[K] }, { [K in keyof I]?: I[K] }, R>
  <A, I, R, const Options extends { readonly exact: true } | undefined>(
    self: Schema<A, I, R>,
    options: Options
  ): SchemaClass<{ [K in keyof A]?: A[K] }, { [K in keyof I]?: I[K] }, R>
} = dual((args) => isSchema(args[0]), <A, I, R>(
  self: Schema<A, I, R>,
  options: { readonly exact: true }
): SchemaClass<Partial<A>, Partial<I>, R> => make(AST.partial(self.ast, options)))

/**
 * @category combinators
 * @since 0.67.0
 */
export const required = <A, I, R>(
  self: Schema<A, I, R>
): SchemaClass<{ [K in keyof A]-?: A[K] }, { [K in keyof I]-?: I[K] }, R> => make(AST.required(self.ast))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface mutable<S extends Schema.Any> extends
  AnnotableClass<
    mutable<S>,
    SimplifyMutable<Schema.Type<S>>,
    SimplifyMutable<Schema.Encoded<S>>,
    Schema.Context<S>
  >
{}

/**
 * Creates a new schema with shallow mutability applied to its properties.
 *
 * @param schema - The original schema to make properties mutable (shallowly).
 *
 * @category combinators
 * @since 0.67.0
 */
export const mutable = <S extends Schema.Any>(schema: S): mutable<S> => make(AST.mutable(schema.ast))

const intersectTypeLiterals = (
  x: AST.AST,
  y: AST.AST,
  path: ReadonlyArray<PropertyKey>
): AST.TypeLiteral => {
  if (AST.isTypeLiteral(x) && AST.isTypeLiteral(y)) {
    const propertySignatures = [...x.propertySignatures]
    for (const ps of y.propertySignatures) {
      const name = ps.name
      const i = propertySignatures.findIndex((ps) => ps.name === name)
      if (i === -1) {
        propertySignatures.push(ps)
      } else {
        const { isOptional, type } = propertySignatures[i]
        propertySignatures[i] = new AST.PropertySignature(
          name,
          extendAST(type, ps.type, path.concat(name)),
          isOptional,
          true
        )
      }
    }
    return new AST.TypeLiteral(
      propertySignatures,
      x.indexSignatures.concat(y.indexSignatures)
    )
  }
  throw new Error(errors_.getSchemaExtendErrorMessage(x, y, path))
}

const preserveRefinementAnnotations = AST.blackListAnnotations([
  AST.IdentifierAnnotationId
])

const addRefinementToMembers = (refinement: AST.Refinement, asts: ReadonlyArray<AST.AST>): Array<AST.Refinement> =>
  asts.map((ast) => new AST.Refinement(ast, refinement.filter, preserveRefinementAnnotations(refinement)))

const extendAST = (
  x: AST.AST,
  y: AST.AST,
  path: ReadonlyArray<PropertyKey>
): AST.AST => AST.Union.make(intersectUnionMembers([x], [y], path))

const getTypes = (ast: AST.AST): ReadonlyArray<AST.AST> => AST.isUnion(ast) ? ast.types : [ast]

const intersectUnionMembers = (
  xs: ReadonlyArray<AST.AST>,
  ys: ReadonlyArray<AST.AST>,
  path: ReadonlyArray<PropertyKey>
): Array<AST.AST> =>
  array_.flatMap(xs, (x) =>
    array_.flatMap(ys, (y) => {
      switch (y._tag) {
        case "Literal": {
          if (
            (Predicate.isString(y.literal) && AST.isStringKeyword(x) ||
              (Predicate.isNumber(y.literal) && AST.isNumberKeyword(x)) ||
              (Predicate.isBoolean(y.literal) && AST.isBooleanKeyword(x)))
          ) {
            return [y]
          }
          break
        }
        case "StringKeyword": {
          if (y === AST.stringKeyword) {
            if (AST.isStringKeyword(x) || (AST.isLiteral(x) && Predicate.isString(x.literal))) {
              return [x]
            } else if (AST.isRefinement(x)) {
              return addRefinementToMembers(x, intersectUnionMembers(getTypes(x.from), [y], path))
            }
          } else if (x === AST.stringKeyword) {
            return [y]
          }
          break
        }
        case "NumberKeyword": {
          if (y === AST.numberKeyword) {
            if (AST.isNumberKeyword(x) || (AST.isLiteral(x) && Predicate.isNumber(x.literal))) {
              return [x]
            } else if (AST.isRefinement(x)) {
              return addRefinementToMembers(x, intersectUnionMembers(getTypes(x.from), [y], path))
            }
          } else if (x === AST.numberKeyword) {
            return [y]
          }
          break
        }
        case "BooleanKeyword": {
          if (y === AST.booleanKeyword) {
            if (AST.isBooleanKeyword(x) || (AST.isLiteral(x) && Predicate.isBoolean(x.literal))) {
              return [x]
            } else if (AST.isRefinement(x)) {
              return addRefinementToMembers(x, intersectUnionMembers(getTypes(x.from), [y], path))
            }
          } else if (x === AST.booleanKeyword) {
            return [y]
          }
          break
        }
        case "Union":
          return intersectUnionMembers(getTypes(x), y.types, path)
        case "Suspend":
          return [new AST.Suspend(() => extendAST(x, y.f(), path))]
        case "Refinement":
          return addRefinementToMembers(y, intersectUnionMembers(getTypes(x), getTypes(y.from), path))
        case "TypeLiteral": {
          switch (x._tag) {
            case "Union":
              return intersectUnionMembers(x.types, [y], path)
            case "Suspend":
              return [new AST.Suspend(() => extendAST(x.f(), y, path))]
            case "Refinement":
              return addRefinementToMembers(x, intersectUnionMembers(getTypes(x.from), [y], path))
            case "TypeLiteral":
              return [intersectTypeLiterals(x, y, path)]
            case "Transformation": {
              if (AST.isTypeLiteralTransformation(x.transformation)) {
                return [
                  new AST.Transformation(
                    intersectTypeLiterals(x.from, y, path),
                    intersectTypeLiterals(x.to, AST.typeAST(y), path),
                    new AST.TypeLiteralTransformation(
                      x.transformation.propertySignatureTransformations
                    )
                  )
                ]
              }
              break
            }
          }
          break
        }
        case "Transformation": {
          if (AST.isTypeLiteralTransformation(y.transformation)) {
            switch (x._tag) {
              case "Union":
                return intersectUnionMembers(x.types, [y], path)
              case "Suspend":
                return [new AST.Suspend(() => extendAST(x.f(), y, path))]
              case "Refinement":
                return addRefinementToMembers(x, intersectUnionMembers(getTypes(x.from), [y], path))
              case "TypeLiteral":
                return [
                  new AST.Transformation(
                    intersectTypeLiterals(x, y.from, path),
                    intersectTypeLiterals(AST.typeAST(x), y.to, path),
                    new AST.TypeLiteralTransformation(
                      y.transformation.propertySignatureTransformations
                    )
                  )
                ]
              case "Transformation":
                {
                  if (AST.isTypeLiteralTransformation(x.transformation)) {
                    return [
                      new AST.Transformation(
                        intersectTypeLiterals(x.from, y.from, path),
                        intersectTypeLiterals(x.to, y.to, path),
                        new AST.TypeLiteralTransformation(
                          y.transformation.propertySignatureTransformations.concat(
                            x.transformation.propertySignatureTransformations
                          )
                        )
                      )
                    ]
                  }
                }
                break
            }
          }
          break
        }
      }
      throw new Error(errors_.getSchemaExtendErrorMessage(x, y, path))
    }))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface extend<Self extends Schema.Any, That extends Schema.Any> extends
  AnnotableClass<
    extend<Self, That>,
    Schema.Type<Self> & Schema.Type<That>,
    Schema.Encoded<Self> & Schema.Encoded<That>,
    Schema.Context<Self> | Schema.Context<That>
  >
{}

/**
 * Extends a schema with another schema.
 *
 * Not all extensions are supported, and their support depends on the nature of the involved schemas.
 *
 * Possible extensions include:
 * - `Schema.String` with another `Schema.String` refinement or a string literal
 * - `Schema.Number` with another `Schema.Number` refinement or a number literal
 * - `Schema.Boolean` with another `Schema.Boolean` refinement or a boolean literal
 * - A struct with another struct where overlapping fields support extension
 * - A struct with in index signature
 * - A struct with a union of supported schemas
 * - A refinement of a struct with a supported schema
 * - A suspend of a struct with a supported schema
 *
 * @example
 * import * as Schema from "@effect/schema/Schema"
 *
 * const schema = Schema.Struct({
 *   a: Schema.String,
 *   b: Schema.String
 * })
 *
 * // const extended: Schema.Schema<
 * //   {
 * //     readonly a: string
 * //     readonly b: string
 * //   } & {
 * //     readonly c: string
 * //   } & {
 * //     readonly [x: string]: string
 * //   }
 * // >
 * const extended = Schema.asSchema(schema.pipe(
 *   Schema.extend(Schema.Struct({ c: Schema.String })), // <= you can add more fields
 *   Schema.extend(Schema.Record({ key: Schema.String, value: Schema.String })) // <= you can add index signatures
 * ))
 *
 * @category combinators
 * @since 0.67.0
 */
export const extend: {
  <That extends Schema.Any>(that: That): <Self extends Schema.Any>(self: Self) => extend<Self, That>
  <Self extends Schema.Any, That extends Schema.Any>(self: Self, that: That): extend<Self, That>
} = dual(
  2,
  <Self extends Schema.Any, That extends Schema.Any>(self: Self, that: That) => make(extendAST(self.ast, that.ast, []))
)

/**
 * @category combinators
 * @since 0.67.0
 */
export const compose: {
  <D, C extends B, R2, B>(
    to: Schema<D, C, R2>
  ): <A, R1>(from: Schema<B, A, R1>) => SchemaClass<D, A, R1 | R2>
  <D, C, R2>(
    to: Schema<D, C, R2>
  ): <B extends C, A, R1>(from: Schema<B, A, R1>) => SchemaClass<D, A, R1 | R2>
  <C, B, R2>(
    to: Schema<C, B, R2>,
    options?: { readonly strict: true }
  ): <A, R1>(from: Schema<B, A, R1>) => SchemaClass<C, A, R1 | R2>
  <D, C, R2>(
    to: Schema<D, C, R2>,
    options: { readonly strict: false }
  ): <B, A, R1>(from: Schema<B, A, R1>) => SchemaClass<D, A, R1 | R2>

  <B, A, R1, D, C extends B, R2>(
    from: Schema<B, A, R1>,
    to: Schema<D, C, R2>
  ): SchemaClass<D, A, R1 | R2>
  <B extends C, A, R1, D, C, R2>(
    from: Schema<B, A, R1>,
    to: Schema<D, C, R2>
  ): SchemaClass<D, A, R1 | R2>
  <B, A, R1, C, R2>(
    from: Schema<B, A, R1>,
    to: Schema<C, B, R2>,
    options?: { readonly strict: true }
  ): SchemaClass<C, A, R1 | R2>
  <B, A, R1, D, C, R2>(
    from: Schema<B, A, R1>,
    to: Schema<D, C, R2>,
    options: { readonly strict: false }
  ): SchemaClass<D, A, R1 | R2>
} = dual(
  (args) => isSchema(args[1]),
  <B, A, R1, D, C, R2>(from: Schema<B, A, R1>, to: Schema<D, C, R2>): SchemaClass<D, A, R1 | R2> =>
    make(AST.compose(from.ast, to.ast))
)

/**
 * @category api interface
 * @since 0.67.0
 */
export interface suspend<A, I, R> extends AnnotableClass<suspend<A, I, R>, A, I, R> {}

/**
 * @category constructors
 * @since 0.67.0
 */
export const suspend = <A, I, R>(f: () => Schema<A, I, R>): suspend<A, I, R> => make(new AST.Suspend(() => f().ast))

/**
 * @since 0.68.8
 * @category symbol
 */
export const refineTypeId: unique symbol = Symbol.for("@effect/schema/refine")

/**
 * @since 0.68.8
 * @category symbol
 */
export type refineTypeId = typeof refineTypeId

/**
 * @category api interface
 * @since 0.67.0
 */
export interface refine<A, From extends Schema.Any>
  extends AnnotableClass<refine<A, From>, A, Schema.Encoded<From>, Schema.Context<From>>
{
  readonly [refineTypeId]: From
  readonly from: From
  readonly filter: (
    a: Schema.Type<From>,
    options: ParseOptions,
    self: AST.Refinement
  ) => option_.Option<ParseResult.ParseIssue>
  make(a: Schema.Type<From>, options?: MakeOptions): A
}

const makeRefineClass = <From extends Schema.Any, A>(
  from: From,
  filter: (
    a: Schema.Type<From>,
    options: ParseOptions,
    self: AST.Refinement
  ) => option_.Option<ParseResult.ParseIssue>,
  ast: AST.AST
): refine<A, From> =>
  class RefineClass extends make<A, Schema.Encoded<From>, Schema.Context<From>>(ast) {
    static override annotations(annotations: Annotations.Schema<A>): refine<A, From> {
      return makeRefineClass(this.from, this.filter, mergeSchemaAnnotations(this.ast, annotations))
    }

    static [refineTypeId] = from

    static from = from

    static filter = filter

    static make = (a: Schema.Type<From>, options?: MakeOptions): A => {
      return getDisableValidationMakeOption(options) ? a : ParseResult.validateSync(this)(a)
    }
  }

/**
 * @category api interface
 * @since 0.67.0
 */
export interface filter<From extends Schema.Any> extends refine<Schema.Type<From>, From> {}

const fromFilterPredicateReturnTypeItem = (
  item: FilterOutput,
  ast: AST.Refinement | AST.Transformation,
  input: unknown
): option_.Option<ParseResult.ParseIssue> => {
  if (Predicate.isBoolean(item)) {
    return item
      ? option_.none()
      : option_.some(new ParseResult.Type(ast, input))
  }
  if (Predicate.isString(item)) {
    return option_.some(new ParseResult.Type(ast, input, item))
  }
  if (item !== undefined) {
    if ("_tag" in item) {
      return option_.some(item)
    }
    const issue = new ParseResult.Type(ast, input, item.message)
    return option_.some(
      array_.isNonEmptyReadonlyArray(item.path) ? new ParseResult.Pointer(item.path, input, issue) : issue
    )
  }
  return option_.none()
}

const toFilterParseIssue = (
  out: FilterReturnType,
  ast: AST.Refinement | AST.Transformation,
  input: unknown
): option_.Option<ParseResult.ParseIssue> => {
  if (util_.isSingle(out)) {
    return fromFilterPredicateReturnTypeItem(out, ast, input)
  }
  if (array_.isNonEmptyReadonlyArray(out)) {
    const issues = array_.filterMap(out, (issue) => fromFilterPredicateReturnTypeItem(issue, ast, input))
    if (array_.isNonEmptyReadonlyArray(issues)) {
      return option_.some(issues.length === 1 ? issues[0] : new ParseResult.Composite(ast, input, issues))
    }
  }
  return option_.none()
}

/**
 * @category filtering
 * @since 0.68.0
 */
export interface FilterIssue {
  readonly path: ReadonlyArray<PropertyKey>
  readonly message: string
}

/**
 * @category filtering
 * @since 0.68.0
 */
export type FilterOutput = undefined | boolean | string | ParseResult.ParseIssue | FilterIssue

type FilterReturnType = FilterOutput | ReadonlyArray<FilterOutput>

/**
 * @category filtering
 * @since 0.67.0
 */
export function filter<C extends A, B extends A, A = C>(
  refinement: (a: A, options: ParseOptions, self: AST.Refinement) => a is B,
  annotations?: Annotations.Filter<C & B, C>
): <I, R>(self: Schema<C, I, R>) => refine<C & B, Schema<A, I, R>>
export function filter<A, B extends A>(
  refinement: (a: A, options: ParseOptions, self: AST.Refinement) => a is B,
  annotations?: Annotations.Filter<B, A>
): <I, R>(self: Schema<A, I, R>) => refine<B, Schema<A, I, R>>
export function filter<S extends Schema.Any>(
  predicate: (
    a: Types.NoInfer<Schema.Type<S>>,
    options: ParseOptions,
    self: AST.Refinement
  ) => FilterReturnType,
  annotations?: Annotations.Filter<Types.NoInfer<Schema.Type<S>>>
): (self: S) => filter<S>
export function filter<A>(
  predicate: (
    a: A,
    options: ParseOptions,
    self: AST.Refinement
  ) => FilterReturnType,
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => refine<A, Schema<A, I, R>> {
  return <I, R>(self: Schema<A, I, R>) => {
    function filter(input: A, options: AST.ParseOptions, ast: AST.Refinement) {
      return toFilterParseIssue(predicate(input, options, ast), ast, input)
    }
    const ast = new AST.Refinement(
      self.ast,
      filter,
      toASTAnnotations(annotations)
    )
    return makeRefineClass(self, filter, ast)
  }
}

/**
 * @category api interface
 * @since 0.68.17
 */
export interface filterEffect<S extends Schema.Any, FD = never>
  extends transformOrFail<S, SchemaClass<Schema.Type<S>>, FD>
{}

/**
 * @category transformations
 * @since 0.68.17
 */
export const filterEffect: {
  <S extends Schema.Any, FD>(
    f: (
      a: Types.NoInfer<Schema.Type<S>>,
      options: ParseOptions,
      self: AST.Transformation
    ) => Effect.Effect<FilterReturnType, never, FD>
  ): (self: S) => filterEffect<S, FD>
  <S extends Schema.Any, RD>(
    self: S,
    f: (
      a: Types.NoInfer<Schema.Type<S>>,
      options: ParseOptions,
      self: AST.Transformation
    ) => Effect.Effect<FilterReturnType, never, RD>
  ): filterEffect<S, RD>
} = dual(2, <S extends Schema.Any, FD>(
  self: S,
  f: (
    a: Types.NoInfer<Schema.Type<S>>,
    options: ParseOptions,
    self: AST.Transformation
  ) => Effect.Effect<FilterReturnType, never, FD>
): filterEffect<S, FD> =>
  transformOrFail(
    self,
    typeSchema(self),
    {
      strict: true,
      decode: (a, options, ast) =>
        ParseResult.flatMap(
          f(a, options, ast),
          (filterReturnType) =>
            option_.match(toFilterParseIssue(filterReturnType, ast, a), {
              onNone: () => ParseResult.succeed(a),
              onSome: ParseResult.fail
            })
        ),
      encode: ParseResult.succeed
    }
  ))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface transformOrFail<From extends Schema.Any, To extends Schema.Any, R = never> extends
  AnnotableClass<
    transformOrFail<From, To, R>,
    Schema.Type<To>,
    Schema.Encoded<From>,
    Schema.Context<From> | Schema.Context<To> | R
  >
{
  readonly from: From
  readonly to: To
}

const makeTransformationClass = <From extends Schema.Any, To extends Schema.Any, R>(
  from: From,
  to: To,
  ast: AST.AST
): transformOrFail<From, To, R> =>
  class TransformationClass
    extends make<Schema.Type<To>, Schema.Encoded<From>, Schema.Context<From> | Schema.Context<To> | R>(ast)
  {
    static override annotations(annotations: Annotations.Schema<Schema.Type<To>>) {
      return makeTransformationClass<From, To, R>(
        this.from,
        this.to,
        mergeSchemaAnnotations(this.ast, annotations)
      )
    }

    static from = from

    static to = to
  }

/**
 * Create a new `Schema` by transforming the input and output of an existing `Schema`
 * using the provided decoding functions.
 *
 * @category transformations
 * @since 0.67.0
 */
export const transformOrFail: {
  <To extends Schema.Any, From extends Schema.Any, RD, RE>(
    to: To,
    options: {
      readonly decode: (
        fromA: Schema.Type<From>,
        options: ParseOptions,
        ast: AST.Transformation,
        fromI: Schema.Encoded<From>
      ) => Effect.Effect<Schema.Encoded<To>, ParseResult.ParseIssue, RD>
      readonly encode: (
        toI: Schema.Encoded<To>,
        options: ParseOptions,
        ast: AST.Transformation,
        toA: Schema.Type<To>
      ) => Effect.Effect<Schema.Type<From>, ParseResult.ParseIssue, RE>
      readonly strict?: true
    } | {
      readonly decode: (
        fromA: Schema.Type<From>,
        options: ParseOptions,
        ast: AST.Transformation,
        fromI: Schema.Encoded<From>
      ) => Effect.Effect<unknown, ParseResult.ParseIssue, RD>
      readonly encode: (
        toI: Schema.Encoded<To>,
        options: ParseOptions,
        ast: AST.Transformation,
        toA: Schema.Type<To>
      ) => Effect.Effect<unknown, ParseResult.ParseIssue, RE>
      readonly strict: false
    }
  ): (from: From) => transformOrFail<From, To, RD | RE>
  <To extends Schema.Any, From extends Schema.Any, RD, RE>(
    from: From,
    to: To,
    options: {
      readonly decode: (
        fromA: Schema.Type<From>,
        options: ParseOptions,
        ast: AST.Transformation,
        fromI: Schema.Encoded<From>
      ) => Effect.Effect<Schema.Encoded<To>, ParseResult.ParseIssue, RD>
      readonly encode: (
        toI: Schema.Encoded<To>,
        options: ParseOptions,
        ast: AST.Transformation,
        toA: Schema.Type<To>
      ) => Effect.Effect<Schema.Type<From>, ParseResult.ParseIssue, RE>
      readonly strict?: true
    } | {
      readonly decode: (
        fromA: Schema.Type<From>,
        options: ParseOptions,
        ast: AST.Transformation,
        fromI: Schema.Encoded<From>
      ) => Effect.Effect<unknown, ParseResult.ParseIssue, RD>
      readonly encode: (
        toI: Schema.Encoded<To>,
        options: ParseOptions,
        ast: AST.Transformation,
        toA: Schema.Type<To>
      ) => Effect.Effect<unknown, ParseResult.ParseIssue, RE>
      readonly strict: false
    }
  ): transformOrFail<From, To, RD | RE>
} = dual((args) => isSchema(args[0]) && isSchema(args[1]), <FromA, FromI, FromR, ToA, ToI, ToR, RD, RE>(
  from: Schema<FromA, FromI, FromR>,
  to: Schema<ToA, ToI, ToR>,
  options: {
    readonly decode: (
      fromA: FromA,
      options: ParseOptions,
      ast: AST.Transformation,
      fromI: FromI
    ) => Effect.Effect<ToI, ParseResult.ParseIssue, RD>
    readonly encode: (
      toI: ToI,
      options: ParseOptions,
      ast: AST.Transformation,
      toA: ToA
    ) => Effect.Effect<FromA, ParseResult.ParseIssue, RE>
  }
): Schema<ToA, FromI, FromR | ToR | RD | RE> =>
  makeTransformationClass(
    from,
    to,
    new AST.Transformation(
      from.ast,
      to.ast,
      new AST.FinalTransformation(options.decode, options.encode)
    )
  ))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface transform<From extends Schema.Any, To extends Schema.Any> extends transformOrFail<From, To> {
  annotations(annotations: Annotations.Schema<Schema.Type<To>>): transform<From, To>
}

/**
 * Create a new `Schema` by transforming the input and output of an existing `Schema`
 * using the provided mapping functions.
 *
 * @category transformations
 * @since 0.67.0
 */
export const transform: {
  <To extends Schema.Any, From extends Schema.Any>(
    to: To,
    options: {
      readonly decode: (fromA: Schema.Type<From>, fromI: Schema.Encoded<From>) => Schema.Encoded<To>
      readonly encode: (toI: Schema.Encoded<To>, toA: Schema.Type<To>) => Schema.Type<From>
      readonly strict?: true
    } | {
      readonly decode: (fromA: Schema.Type<From>, fromI: Schema.Encoded<From>) => unknown
      readonly encode: (toI: Schema.Encoded<To>, toA: Schema.Type<To>) => unknown
      readonly strict: false
    }
  ): (from: From) => transform<From, To>
  <To extends Schema.Any, From extends Schema.Any>(
    from: From,
    to: To,
    options: {
      readonly decode: (fromA: Schema.Type<From>, fromI: Schema.Encoded<From>) => Schema.Encoded<To>
      readonly encode: (toI: Schema.Encoded<To>, toA: Schema.Type<To>) => Schema.Type<From>
      readonly strict?: true
    } | {
      readonly decode: (fromA: Schema.Type<From>, fromI: Schema.Encoded<From>) => unknown
      readonly encode: (toI: Schema.Encoded<To>, toA: Schema.Type<To>) => unknown
      readonly strict: false
    }
  ): transform<From, To>
} = dual(
  (args) => isSchema(args[0]) && isSchema(args[1]),
  <FromA, FromI, FromR, ToA, ToI, ToR>(
    from: Schema<FromA, FromI, FromR>,
    to: Schema<ToA, ToI, ToR>,
    options: {
      readonly decode: (fromA: FromA, fromI: FromI) => ToI
      readonly encode: (toI: ToI, toA: ToA) => FromA
    }
  ): Schema<ToA, FromI, FromR | ToR> =>
    transformOrFail(
      from,
      to,
      {
        strict: true,
        decode: (fromA, _options, _ast, toA) => ParseResult.succeed(options.decode(fromA, toA)),
        encode: (toI, _options, _ast, toA) => ParseResult.succeed(options.encode(toI, toA))
      }
    )
)

/**
 * @category api interface
 * @since 0.67.0
 */
export interface transformLiteral<Type, Encoded> extends Annotable<transformLiteral<Type, Encoded>, Type, Encoded> {}

/**
 * Creates a new `Schema` which transforms literal values.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 *
 * const schema = S.transformLiteral(0, "a")
 *
 * assert.deepStrictEqual(S.decodeSync(schema)(0), "a")
 *
 * @category constructors
 * @since 0.67.0
 */
export const transformLiteral = <Encoded extends AST.LiteralValue, Type extends AST.LiteralValue>(
  from: Encoded,
  to: Type
): transformLiteral<Type, Encoded> =>
  transform(Literal(from), Literal(to), { strict: true, decode: () => to, encode: () => from })

/**
 * Creates a new `Schema` which maps between corresponding literal values.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 *
 * const Animal = S.transformLiterals(
 *   [0, "cat"],
 *   [1, "dog"],
 *   [2, "cow"]
 * )
 *
 * assert.deepStrictEqual(S.decodeSync(Animal)(1), "dog")
 *
 * @category constructors
 * @since 0.67.0
 */
export function transformLiterals<const A extends AST.Members<readonly [from: AST.LiteralValue, to: AST.LiteralValue]>>(
  ...pairs: A
): Union<{ -readonly [I in keyof A]: transformLiteral<A[I][1], A[I][0]> }>
export function transformLiterals<Encoded extends AST.LiteralValue, Type extends AST.LiteralValue>(
  pairs: [Encoded, Type]
): transformLiteral<Type, Encoded>
export function transformLiterals<
  const A extends ReadonlyArray<readonly [from: AST.LiteralValue, to: AST.LiteralValue]>
>(...pairs: A): Schema<A[number][1], A[number][0]>
export function transformLiterals<
  const A extends ReadonlyArray<readonly [from: AST.LiteralValue, to: AST.LiteralValue]>
>(...pairs: A): Schema<A[number][1], A[number][0]> {
  return Union(...pairs.map(([from, to]) => transformLiteral(from, to)))
}

/**
 * Attaches a property signature with the specified key and value to the schema.
 * This API is useful when you want to add a property to your schema which doesn't describe the shape of the input,
 * but rather maps to another schema, for example when you want to add a discriminant to a simple union.
 *
 * @param self - The input schema.
 * @param key - The name of the property to add to the schema.
 * @param value - The value of the property to add to the schema.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 * import { pipe } from "effect/Function"
 *
 * const Circle = S.Struct({ radius: S.Number })
 * const Square = S.Struct({ sideLength: S.Number })
 * const Shape = S.Union(
 *   Circle.pipe(S.attachPropertySignature("kind", "circle")),
 *   Square.pipe(S.attachPropertySignature("kind", "square"))
 * )
 *
 * assert.deepStrictEqual(S.decodeSync(Shape)({ radius: 10 }), {
 *   kind: "circle",
 *   radius: 10
 * })
 *
 * @category combinators
 * @since 0.67.0
 */
export const attachPropertySignature: {
  <K extends PropertyKey, V extends AST.LiteralValue | symbol, A>(
    key: K,
    value: V,
    annotations?: Annotations.Schema<Simplify<A & { readonly [k in K]: V }>>
  ): <I, R>(
    schema: SchemaClass<A, I, R>
  ) => Schema<Simplify<A & { readonly [k in K]: V }>, I, R>
  <A, I, R, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<A, I, R>,
    key: K,
    value: V,
    annotations?: Annotations.Schema<Simplify<A & { readonly [k in K]: V }>>
  ): SchemaClass<Simplify<A & { readonly [k in K]: V }>, I, R>
} = dual(
  (args) => isSchema(args[0]),
  <A, I, R, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<A, I, R>,
    key: K,
    value: V,
    annotations?: Annotations.Schema<Simplify<A & { readonly [k in K]: V }>>
  ): SchemaClass<Simplify<A & { readonly [k in K]: V }>, I, R> => {
    const ast = extend(
      typeSchema(schema),
      Struct({ [key]: Predicate.isSymbol(value) ? UniqueSymbolFromSelf(value) : Literal(value) })
    ).ast
    return make(
      new AST.Transformation(
        schema.ast,
        annotations ? mergeSchemaAnnotations(ast, annotations) : ast,
        new AST.TypeLiteralTransformation(
          [
            new AST.PropertySignatureTransformation(
              key,
              key,
              () => option_.some(value),
              () => option_.none()
            )
          ]
        )
      )
    )
  }
)

/**
 * @category annotations
 * @since 0.67.0
 */
export declare namespace Annotations {
  /**
   * @category annotations
   * @since 0.67.0
   */
  export interface Doc<A> extends AST.Annotations {
    readonly title?: AST.TitleAnnotation
    readonly description?: AST.DescriptionAnnotation
    readonly documentation?: AST.DocumentationAnnotation
    readonly examples?: AST.ExamplesAnnotation<A>
    readonly default?: AST.DefaultAnnotation<A>
  }

  /**
   * @since 0.67.0
   */
  export interface Schema<A, TypeParameters extends ReadonlyArray<any> = readonly []> extends Doc<A> {
    readonly identifier?: AST.IdentifierAnnotation
    readonly message?: AST.MessageAnnotation
    readonly typeId?: AST.TypeAnnotation | { id: AST.TypeAnnotation; annotation: unknown }
    readonly jsonSchema?: AST.JSONSchemaAnnotation
    readonly arbitrary?: (
      ...arbitraries: { readonly [K in keyof TypeParameters]: LazyArbitrary<TypeParameters[K]> }
    ) => LazyArbitrary<A>
    readonly pretty?: (
      ...pretties: { readonly [K in keyof TypeParameters]: pretty_.Pretty<TypeParameters[K]> }
    ) => pretty_.Pretty<A>
    readonly equivalence?: (
      ...equivalences: { readonly [K in keyof TypeParameters]: Equivalence.Equivalence<TypeParameters[K]> }
    ) => Equivalence.Equivalence<A>
    readonly concurrency?: AST.ConcurrencyAnnotation
    readonly batching?: AST.BatchingAnnotation
    readonly parseIssueTitle?: AST.ParseIssueTitleAnnotation
    readonly parseOptions?: AST.ParseOptions
  }

  /**
   * @since 0.67.0
   */
  export interface Filter<A, P = A> extends Schema<A, readonly [P]> {}
}

/**
 * Merges a set of new annotations with existing ones, potentially overwriting
 * any duplicates.
 *
 * @category annotations
 * @since 0.67.0
 */
export const annotations: {
  <S extends Annotable.All>(annotations: Annotations.Schema<Schema.Type<S>>): (self: S) => Annotable.Self<S>
  <S extends Annotable.All>(self: S, annotations: Annotations.Schema<Schema.Type<S>>): Annotable.Self<S>
} = dual(
  2,
  <A, I, R>(self: Schema<A, I, R>, annotations: Annotations.Schema<A>): Schema<A, I, R> => self.annotations(annotations)
)

type Rename<A, M> = {
  [
    K in keyof A as K extends keyof M ? M[K] extends PropertyKey ? M[K]
      : never
      : K
  ]: A[K]
}

/**
 * @category renaming
 * @since 0.67.0
 */
export const rename: {
  <
    A,
    const M extends
      & { readonly [K in keyof A]?: PropertyKey }
      & { readonly [K in Exclude<keyof M, keyof A>]: never }
  >(
    mapping: M
  ): <I, R>(self: Schema<A, I, R>) => SchemaClass<Simplify<Rename<A, M>>, I, R>
  <
    A,
    I,
    R,
    const M extends
      & { readonly [K in keyof A]?: PropertyKey }
      & { readonly [K in Exclude<keyof M, keyof A>]: never }
  >(
    self: Schema<A, I, R>,
    mapping: M
  ): SchemaClass<Simplify<Rename<A, M>>, I, R>
} = dual(
  2,
  <
    A,
    I,
    R,
    const M extends
      & { readonly [K in keyof A]?: PropertyKey }
      & { readonly [K in Exclude<keyof M, keyof A>]: never }
  >(
    self: Schema<A, I, R>,
    mapping: M
  ): SchemaClass<Simplify<Rename<A, M>>, I, R> => make(AST.rename(self.ast, mapping))
)

/**
 * @category type id
 * @since 0.67.0
 */
export const TrimmedTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Trimmed")

/**
 * Verifies that a string contains no leading or trailing whitespaces.
 *
 * Note. This combinator does not make any transformations, it only validates.
 * If what you were looking for was a combinator to trim strings, then check out the `trim` combinator.
 *
 * @category string filters
 * @since 0.67.0
 */
export const trimmed =
  <A extends string>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
    self.pipe(
      filter((a) => a === a.trim(), {
        typeId: TrimmedTypeId,
        description: "a string with no leading or trailing whitespace",
        jsonSchema: { pattern: "^\\S[\\s\\S]*\\S$|^\\S$|^$" },
        ...annotations
      })
    )

/**
 * @category type id
 * @since 0.67.0
 */
export const MaxLengthTypeId: unique symbol = filters_.MaxLengthTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type MaxLengthTypeId = typeof MaxLengthTypeId

/**
 * @category string filters
 * @since 0.67.0
 */
export const maxLength = <A extends string>(
  maxLength: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter(
      (a) => a.length <= maxLength,
      {
        typeId: MaxLengthTypeId,
        description: `a string at most ${maxLength} character(s) long`,
        jsonSchema: { maxLength },
        ...annotations
      }
    )
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const MinLengthTypeId: unique symbol = filters_.MinLengthTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type MinLengthTypeId = typeof MinLengthTypeId

/**
 * @category string filters
 * @since 0.67.0
 */
export const minLength = <A extends string>(
  minLength: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter(
      (a) => a.length >= minLength,
      {
        typeId: MinLengthTypeId,
        description: `a string at least ${minLength} character(s) long`,
        jsonSchema: { minLength },
        ...annotations
      }
    )
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const PatternTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Pattern")

/**
 * @category string filters
 * @since 0.67.0
 */
export const pattern = <A extends string>(
  regex: RegExp,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> => {
  const pattern = regex.source
  return self.pipe(
    filter(
      (a): a is A => {
        // The following line ensures that `lastIndex` is reset to `0` in case the user has specified the `g` flag
        regex.lastIndex = 0
        return regex.test(a)
      },
      {
        typeId: { id: PatternTypeId, annotation: { regex } },
        description: `a string matching the pattern ${pattern}`,
        jsonSchema: { pattern },
        arbitrary: () => (fc) => fc.stringMatching(regex) as any,
        ...annotations
      }
    )
  )
}

/**
 * @category type id
 * @since 0.67.0
 */
export const StartsWithTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/StartsWith")

/**
 * @category string filters
 * @since 0.67.0
 */
export const startsWith = <A extends string>(
  startsWith: string,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter(
      (a) => a.startsWith(startsWith),
      {
        typeId: { id: StartsWithTypeId, annotation: { startsWith } },
        description: `a string starting with ${JSON.stringify(startsWith)}`,
        jsonSchema: { pattern: `^${startsWith}` },
        ...annotations
      }
    )
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const EndsWithTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/EndsWith")

/**
 * @category string filters
 * @since 0.67.0
 */
export const endsWith = <A extends string>(
  endsWith: string,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter(
      (a) => a.endsWith(endsWith),
      {
        typeId: { id: EndsWithTypeId, annotation: { endsWith } },
        description: `a string ending with ${JSON.stringify(endsWith)}`,
        jsonSchema: { pattern: `^.*${endsWith}$` },
        ...annotations
      }
    )
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const IncludesTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Includes")

/**
 * @category string filters
 * @since 0.67.0
 */
export const includes = <A extends string>(
  searchString: string,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter(
      (a) => a.includes(searchString),
      {
        typeId: { id: IncludesTypeId, annotation: { includes: searchString } },
        description: `a string including ${JSON.stringify(searchString)}`,
        jsonSchema: { pattern: `.*${searchString}.*` },
        ...annotations
      }
    )
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const LowercasedTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Lowercased")

/**
 * Verifies that a string is lowercased.
 *
 * @category string filters
 * @since 0.67.0
 */
export const lowercased =
  <A extends string>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
    self.pipe(
      filter((a) => a === a.toLowerCase(), {
        typeId: LowercasedTypeId,
        description: "a lowercase string",
        ...annotations
      })
    )

/**
 * @category string constructors
 * @since 0.67.0
 */
export class Lowercased extends String$.pipe(
  lowercased({ identifier: "Lowercased", title: "Lowercased" })
) {}

/**
 * @category type id
 * @since 0.68.18
 */
export const CapitalizedTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Capitalized")

/**
 * Verifies that a string is capitalized.
 *
 * @category string filters
 * @since 0.68.18
 */
export const capitalized =
  <A extends string>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
    self.pipe(
      filter((a) => a[0]?.toUpperCase() === a[0], {
        typeId: CapitalizedTypeId,
        description: "a capitalized string",
        ...annotations
      })
    )

/**
 * @category string constructors
 * @since 0.68.18
 */
export class Capitalized extends String$.pipe(
  capitalized({ identifier: "Capitalized", title: "Capitalized" })
) {}

/**
 * @category type id
 * @since 0.68.18
 */
export const UncapitalizedTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Uncapitalized")

/**
 * Verifies that a string is uncapitalized.
 *
 * @category string filters
 * @since 0.68.18
 */
export const uncapitalized =
  <A extends string>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
    self.pipe(
      filter((a) => a[0]?.toLowerCase() === a[0], {
        typeId: UncapitalizedTypeId,
        description: "a uncapitalized string",
        ...annotations
      })
    )

/**
 * @category string constructors
 * @since 0.68.18
 */
export class Uncapitalized extends String$.pipe(
  uncapitalized({ identifier: "Uncapitalized", title: "Uncapitalized" })
) {}

/**
 * @category type id
 * @since 0.67.0
 */
export const UppercasedTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Uppercased")

/**
 * Verifies that a string is uppercased.
 *
 * @category string filters
 * @since 0.67.0
 */
export const uppercased =
  <A extends string>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
    self.pipe(
      filter((a) => a === a.toUpperCase(), {
        typeId: UppercasedTypeId,
        description: "an uppercase string",
        ...annotations
      })
    )

/**
 * @category string constructors
 * @since 0.67.0
 */
export class Uppercased extends String$.pipe(
  uppercased({ identifier: "Uppercased", title: "Uppercased" })
) {}

/**
 * @category type id
 * @since 0.67.0
 */
export const LengthTypeId: unique symbol = filters_.LengthTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type LengthTypeId = typeof LengthTypeId

/**
 * @category string filters
 * @since 0.67.0
 */
export const length = <A extends string>(
  length: number | { readonly min: number; readonly max: number },
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> => {
  const minLength = Predicate.isObject(length) ? Math.max(0, Math.floor(length.min)) : Math.max(0, Math.floor(length))
  const maxLength = Predicate.isObject(length) ? Math.max(minLength, Math.floor(length.max)) : minLength
  if (minLength !== maxLength) {
    return self.pipe(
      filter((a) => a.length >= minLength && a.length <= maxLength, {
        typeId: LengthTypeId,
        description: `a string at least ${minLength} character(s) and at most ${maxLength} character(s) long`,
        jsonSchema: { minLength, maxLength },
        ...annotations
      })
    )
  }
  return self.pipe(
    filter((a) => a.length === minLength, {
      typeId: LengthTypeId,
      description: minLength === 1 ? `a single character` : `a string ${minLength} character(s) long`,
      jsonSchema: { minLength, maxLength: minLength },
      ...annotations
    })
  )
}

/**
 * A schema representing a single character.
 *
 * @category string constructors
 * @since 0.67.0
 */
export class Char extends String$.pipe(length(1, { identifier: "Char" })) {}

/**
 * @category string filters
 * @since 0.69.0
 */
export const nonEmptyString = <A extends string>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => filter<Schema<A, I, R>> =>
  minLength(1, {
    description: "a non empty string",
    ...annotations
  })

/**
 * This schema converts a string to lowercase.
 *
 * @category string transformations
 * @since 0.67.0
 */
export class Lowercase extends transform(
  String$,
  Lowercased,
  { strict: true, decode: (s) => s.toLowerCase(), encode: identity }
).annotations({ identifier: "Lowercase" }) {}

/**
 * This schema converts a string to uppercase.
 *
 * @category string transformations
 * @since 0.67.0
 */
export class Uppercase extends transform(
  String$,
  Uppercased,
  { strict: true, decode: (s) => s.toUpperCase(), encode: identity }
).annotations({ identifier: "Uppercase" }) {}

/**
 * This schema converts a string to capitalized one.
 *
 * @category string transformations
 * @since 0.68.18
 */
export class Capitalize extends transform(
  String$,
  Capitalized,
  { strict: true, decode: (s) => string_.capitalize(s), encode: identity }
).annotations({ identifier: "Capitalize" }) {}

/**
 * This schema converts a string to uncapitalized one.
 *
 * @category string transformations
 * @since 0.68.18
 */
export class Uncapitalize extends transform(
  String$,
  Uncapitalized,
  { strict: true, decode: (s) => string_.uncapitalize(s), encode: identity }
).annotations({ identifier: "Uncapitalize" }) {}

/**
 * @category string constructors
 * @since 0.67.0
 */
export class Trimmed extends String$.pipe(
  trimmed({ identifier: "Trimmed", title: "Trimmed" })
) {}

/**
 * This schema allows removing whitespaces from the beginning and end of a string.
 *
 * @category string transformations
 * @since 0.67.0
 */
export class Trim extends transform(
  String$,
  Trimmed,
  { strict: true, decode: (s) => s.trim(), encode: identity }
).annotations({ identifier: "Trim" }) {}

/**
 * Returns a schema that allows splitting a string into an array of strings.
 *
 * @category string transformations
 * @since 0.67.0
 */
export const split = (separator: string): transform<typeof String$, Array$<typeof String$>> =>
  transform(
    String$,
    Array$(String$),
    { strict: true, decode: string_.split(separator), encode: array_.join(separator) }
  )

/**
 * @since 0.67.0
 */
export type ParseJsonOptions = {
  readonly reviver?: Parameters<typeof JSON.parse>[1]
  readonly replacer?: Parameters<typeof JSON.stringify>[1]
  readonly space?: Parameters<typeof JSON.stringify>[2]
}

const JsonString = String$.annotations({
  [AST.IdentifierAnnotationId]: "JsonString",
  [AST.TitleAnnotationId]: "JsonString",
  [AST.DescriptionAnnotationId]: "a JSON string"
})

const getParseJsonTransformation = (options?: ParseJsonOptions) =>
  transformOrFail(
    JsonString,
    Unknown,
    {
      strict: true,
      decode: (s, _, ast) =>
        ParseResult.try({
          try: () => JSON.parse(s, options?.reviver),
          catch: (e: any) => new ParseResult.Type(ast, s, e.message)
        }),
      encode: (u, _, ast) =>
        ParseResult.try({
          try: () => JSON.stringify(u, options?.replacer, options?.space),
          catch: (e: any) => new ParseResult.Type(ast, u, e.message)
        })
    }
  ).annotations({ typeId: filters_.ParseJsonTypeId })

/**
 * The `ParseJson` combinator provides a method to convert JSON strings into the `unknown` type using the underlying
 * functionality of `JSON.parse`. It also utilizes `JSON.stringify` for encoding.
 *
 * You can optionally provide a `ParseJsonOptions` to configure both `JSON.parse` and `JSON.stringify` executions.
 *
 * Optionally, you can pass a schema `Schema<A, I, R>` to obtain an `A` type instead of `unknown`.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 *
 * assert.deepStrictEqual(S.decodeUnknownSync(S.parseJson())(`{"a":"1"}`), { a: "1" })
 * assert.deepStrictEqual(S.decodeUnknownSync(S.parseJson(S.Struct({ a: S.NumberFromString })))(`{"a":"1"}`), { a: 1 })
 *
 * @category string transformations
 * @since 0.67.0
 */
export const parseJson: {
  <A, I, R>(schema: Schema<A, I, R>, options?: ParseJsonOptions): SchemaClass<A, string, R>
  (options?: ParseJsonOptions): SchemaClass<unknown, string>
} = <A, I, R>(schema?: Schema<A, I, R> | ParseJsonOptions, o?: ParseJsonOptions) =>
  isSchema(schema)
    ? compose(parseJson(o), schema) as any
    : getParseJsonTransformation(schema as ParseJsonOptions | undefined)

/**
 * @category string constructors
 * @since 0.69.0
 */
export class NonEmptyString extends String$.pipe(
  nonEmptyString({ identifier: "NonEmptyString", title: "NonEmptyString" })
) {}

/**
 * @category type id
 * @since 0.67.0
 */
export const UUIDTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/UUID")

const uuidRegexp = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

/**
 * Represents a Universally Unique Identifier (UUID).
 *
 * This schema ensures that the provided string adheres to the standard UUID format.
 *
 * @category string constructors
 * @since 0.67.0
 */
export class UUID extends String$.pipe(
  pattern(uuidRegexp, {
    typeId: UUIDTypeId,
    identifier: "UUID",
    title: "UUID",
    description: "a Universally Unique Identifier",
    arbitrary: (): LazyArbitrary<string> => (fc) => fc.uuid()
  })
) {}

/**
 * @category type id
 * @since 0.67.0
 */
export const ULIDTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/ULID")

const ulidRegexp = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i

/**
 * Represents a Universally Unique Lexicographically Sortable Identifier (ULID).
 *
 * ULIDs are designed to be compact, URL-safe, and ordered, making them suitable for use as identifiers.
 * This schema ensures that the provided string adheres to the standard ULID format.
 *
 * @category string constructors
 * @since 0.67.0
 */
export class ULID extends String$.pipe(
  pattern(ulidRegexp, {
    typeId: ULIDTypeId,
    identifier: "ULID",
    title: "ULID",
    description: "a Universally Unique Lexicographically Sortable Identifier",
    arbitrary: (): LazyArbitrary<string> => (fc) => fc.ulid()
  })
) {}

/**
 * @category type id
 * @since 0.67.0
 */
export const FiniteTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Finite")

/**
 * Ensures that the provided value is a finite number.
 *
 * This schema filters out non-finite numeric values, allowing only finite numbers to pass through.
 *
 * @category number filters
 * @since 0.67.0
 */
export const finite =
  <A extends number>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
    self.pipe(
      filter((a) => Number.isFinite(a), {
        typeId: FiniteTypeId,
        description: "a finite number",
        ...annotations
      })
    )

/**
 * @category type id
 * @since 0.67.0
 */
export const GreaterThanTypeId: unique symbol = filters_.GreaterThanTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type GreaterThanTypeId = typeof GreaterThanTypeId

/**
 * This filter checks whether the provided number is greater than the specified minimum.
 *
 * @category number filters
 * @since 0.67.0
 */
export const greaterThan = <A extends number>(
  min: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a > min, {
      typeId: GreaterThanTypeId,
      description: min === 0 ? "a positive number" : `a number greater than ${min}`,
      jsonSchema: { exclusiveMinimum: min },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const GreaterThanOrEqualToTypeId: unique symbol = filters_.GreaterThanOrEqualToTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type GreaterThanOrEqualToTypeId = typeof GreaterThanOrEqualToTypeId

/**
 * This filter checks whether the provided number is greater than or equal to the specified minimum.
 *
 * @category number filters
 * @since 0.67.0
 */
export const greaterThanOrEqualTo = <A extends number>(
  min: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a >= min, {
      typeId: GreaterThanOrEqualToTypeId,
      description: min === 0 ? "a non-negative number" : `a number greater than or equal to ${min}`,
      jsonSchema: { minimum: min },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const MultipleOfTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/MultipleOf")

/**
 * @category number filters
 * @since 0.67.0
 */
export const multipleOf = <A extends number>(
  divisor: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => number_.remainder(a, divisor) === 0, {
      typeId: MultipleOfTypeId,
      description: `a number divisible by ${divisor}`,
      jsonSchema: { multipleOf: Math.abs(divisor) }, // spec requires positive divisor
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const IntTypeId: unique symbol = filters_.IntTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type IntTypeId = typeof IntTypeId

/**
 * @category number filters
 * @since 0.67.0
 */
export const int =
  <A extends number>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
    self.pipe(
      filter((a) => Number.isSafeInteger(a), {
        typeId: IntTypeId,
        title: "integer",
        description: "an integer",
        jsonSchema: { type: "integer" },
        ...annotations
      })
    )

/**
 * @category type id
 * @since 0.67.0
 */
export const LessThanTypeId: unique symbol = filters_.LessThanTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type LessThanTypeId = typeof LessThanTypeId

/**
 * This filter checks whether the provided number is less than the specified maximum.
 *
 * @category number filters
 * @since 0.67.0
 */
export const lessThan =
  <A extends number>(max: number, annotations?: Annotations.Filter<A>) =>
  <I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
    self.pipe(
      filter((a) => a < max, {
        typeId: LessThanTypeId,
        description: max === 0 ? "a negative number" : `a number less than ${max}`,
        jsonSchema: { exclusiveMaximum: max },
        ...annotations
      })
    )

/**
 * @category type id
 * @since 0.67.0
 */
export const LessThanOrEqualToTypeId: unique symbol = filters_.LessThanOrEqualToTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type LessThanOrEqualToTypeId = typeof LessThanOrEqualToTypeId

/**
 * This schema checks whether the provided number is less than or equal to the specified maximum.
 *
 * @category number filters
 * @since 0.67.0
 */
export const lessThanOrEqualTo = <A extends number>(
  max: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a <= max, {
      typeId: LessThanOrEqualToTypeId,
      description: max === 0 ? "a non-positive number" : `a number less than or equal to ${max}`,
      jsonSchema: { maximum: max },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const BetweenTypeId: unique symbol = filters_.BetweenTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type BetweenTypeId = typeof BetweenTypeId

/**
 * This filter checks whether the provided number falls within the specified minimum and maximum values.
 *
 * @category number filters
 * @since 0.67.0
 */
export const between = <A extends number>(
  min: number,
  max: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a >= min && a <= max, {
      typeId: BetweenTypeId,
      description: `a number between ${min} and ${max}`,
      jsonSchema: { maximum: max, minimum: min },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const NonNaNTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/NonNaN")

/**
 * @category number filters
 * @since 0.67.0
 */
export const nonNaN =
  <A extends number>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
    self.pipe(
      filter((a) => !Number.isNaN(a), {
        typeId: NonNaNTypeId,
        description: "a number excluding NaN",
        ...annotations
      })
    )

/**
 * @category number filters
 * @since 0.67.0
 */
export const positive = <A extends number>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => filter<Schema<A, I, R>> => greaterThan(0, annotations)

/**
 * @category number filters
 * @since 0.67.0
 */
export const negative = <A extends number>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => filter<Schema<A, I, R>> => lessThan(0, annotations)

/**
 * @category number filters
 * @since 0.67.0
 */
export const nonPositive = <A extends number>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => filter<Schema<A, I, R>> => lessThanOrEqualTo(0, annotations)

/**
 * @category number filters
 * @since 0.67.0
 */
export const nonNegative = <A extends number>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => filter<Schema<A, I, R>> => greaterThanOrEqualTo(0, annotations)

/**
 * Clamps a number between a minimum and a maximum value.
 *
 * @category number transformations
 * @since 0.67.0
 */
export const clamp =
  (minimum: number, maximum: number) =>
  <A extends number, I, R>(self: Schema<A, I, R>): transform<Schema<A, I, R>, filter<Schema<A>>> =>
    transform(
      self,
      self.pipe(typeSchema, between(minimum, maximum)),
      { strict: false, decode: (self) => number_.clamp(self, { minimum, maximum }), encode: identity }
    )

/**
 * Transforms a `string` into a `number` by parsing the string using the `parse` function of the `effect/Number` module.
 *
 * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
 *
 * The following special string values are supported: "NaN", "Infinity", "-Infinity".
 *
 * @category number transformations
 * @since 0.67.0
 */
export const parseNumber = <A extends string, I, R>(
  self: Schema<A, I, R>
): transformOrFail<Schema<A, I, R>, typeof Number$> =>
  transformOrFail(
    self,
    Number$,
    {
      strict: false,
      decode: (s, _, ast) => ParseResult.fromOption(number_.parse(s), () => new ParseResult.Type(ast, s)),
      encode: (n) => ParseResult.succeed(String(n))
    }
  )

/**
 * This schema transforms a `string` into a `number` by parsing the string using the `parse` function of the `effect/Number` module.
 *
 * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
 *
 * The following special string values are supported: "NaN", "Infinity", "-Infinity".
 *
 * @category number constructors
 * @since 0.67.0
 */
export class NumberFromString extends parseNumber(String$).annotations({ identifier: "NumberFromString" }) {}

/**
 * @category number constructors
 * @since 0.67.0
 */
export class Finite extends Number$.pipe(finite({ identifier: "Finite", title: "Finite" })) {}

/**
 * @category number constructors
 * @since 0.67.0
 */
export class Int extends Number$.pipe(int({ identifier: "Int", title: "Int" })) {}

/**
 * @category number constructors
 * @since 0.67.0
 */
export class NonNaN extends Number$.pipe(nonNaN({ identifier: "NonNaN", title: "NonNaN" })) {}

/**
 * @category number constructors
 * @since 0.67.0
 */
export class Positive extends Number$.pipe(
  positive({ identifier: "Positive", title: "Positive" })
) {}

/**
 * @category number constructors
 * @since 0.67.0
 */
export class Negative extends Number$.pipe(
  negative({ identifier: "Negative", title: "Negative" })
) {}

/**
 * @category number constructors
 * @since 0.67.0
 */
export class NonPositive extends Number$.pipe(
  nonPositive({ identifier: "NonPositive", title: "NonPositive" })
) {}

/**
 * @category number constructors
 * @since 0.67.0
 */
export class NonNegative extends Number$.pipe(
  nonNegative({ identifier: "NonNegative", title: "NonNegative" })
) {}

/**
 * @category type id
 * @since 0.67.0
 */
export const JsonNumberTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/JsonNumber")

/**
 * The `JsonNumber` is a schema for representing JSON numbers. It ensures that the provided value is a valid
 * number by filtering out `NaN` and `(+/-) Infinity`. This is useful when you want to validate and represent numbers in JSON
 * format.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 *
 * const is = S.is(S.JsonNumber)
 *
 * assert.deepStrictEqual(is(42), true)
 * assert.deepStrictEqual(is(Number.NaN), false)
 * assert.deepStrictEqual(is(Number.POSITIVE_INFINITY), false)
 * assert.deepStrictEqual(is(Number.NEGATIVE_INFINITY), false)
 *
 * @category number constructors
 * @since 0.67.0
 */
export class JsonNumber extends Number$.pipe(
  filter((n) => !Number.isNaN(n) && Number.isFinite(n), {
    typeId: JsonNumberTypeId,
    identifier: "JsonNumber",
    title: "JSON-compatible number",
    description: "a JSON-compatible number, excluding NaN, +Infinity, and -Infinity",
    jsonSchema: { type: "number" }
  })
) {}

/**
 * @category boolean transformations
 * @since 0.67.0
 */
export class Not extends transform(Boolean$, Boolean$, { strict: true, decode: boolean_.not, encode: boolean_.not }) {}

/** @ignore */
class Symbol$ extends transform(
  String$,
  SymbolFromSelf,
  { strict: false, decode: (s) => Symbol.for(s), encode: (sym) => sym.description }
).annotations({ identifier: "symbol" }) {}

export {
  /**
   * This schema transforms a `string` into a `symbol`.
   *
   * @category symbol transformations
   * @since 0.67.0
   */
  Symbol$ as Symbol
}

/**
 * @category type id
 * @since 0.67.0
 */
export const GreaterThanBigIntTypeId: unique symbol = filters_.GreaterThanBigintTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type GreaterThanBigIntTypeId = typeof GreaterThanBigIntTypeId

/**
 * @category bigint filters
 * @since 0.67.0
 */
export const greaterThanBigInt = <A extends bigint>(
  min: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a > min, {
      typeId: { id: GreaterThanBigIntTypeId, annotation: { min } },
      description: min === 0n ? "a positive bigint" : `a bigint greater than ${min}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const GreaterThanOrEqualToBigIntTypeId: unique symbol = filters_.GreaterThanOrEqualToBigIntTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type GreaterThanOrEqualToBigIntTypeId = typeof GreaterThanOrEqualToBigIntTypeId

/**
 * @category bigint filters
 * @since 0.67.0
 */
export const greaterThanOrEqualToBigInt = <A extends bigint>(
  min: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a >= min, {
      typeId: { id: GreaterThanOrEqualToBigIntTypeId, annotation: { min } },
      description: min === 0n
        ? "a non-negative bigint"
        : `a bigint greater than or equal to ${min}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const LessThanBigIntTypeId: unique symbol = filters_.LessThanBigIntTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type LessThanBigIntTypeId = typeof LessThanBigIntTypeId

/**
 * @category bigint filters
 * @since 0.67.0
 */
export const lessThanBigInt = <A extends bigint>(
  max: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a < max, {
      typeId: { id: LessThanBigIntTypeId, annotation: { max } },
      description: max === 0n ? "a negative bigint" : `a bigint less than ${max}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const LessThanOrEqualToBigIntTypeId: unique symbol = filters_.LessThanOrEqualToBigIntTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type LessThanOrEqualToBigIntTypeId = typeof LessThanOrEqualToBigIntTypeId

/**
 * @category bigint filters
 * @since 0.67.0
 */
export const lessThanOrEqualToBigInt = <A extends bigint>(
  max: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a <= max, {
      typeId: { id: LessThanOrEqualToBigIntTypeId, annotation: { max } },
      description: max === 0n ? "a non-positive bigint" : `a bigint less than or equal to ${max}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const BetweenBigIntTypeId: unique symbol = filters_.BetweenBigintTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type BetweenBigIntTypeId = typeof BetweenBigIntTypeId

/**
 * @category bigint filters
 * @since 0.67.0
 */
export const betweenBigInt = <A extends bigint>(
  min: bigint,
  max: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a >= min && a <= max, {
      typeId: { id: BetweenBigIntTypeId, annotation: { max, min } },
      description: `a bigint between ${min}n and ${max}n`,
      ...annotations
    })
  )

/**
 * @category bigint filters
 * @since 0.67.0
 */
export const positiveBigInt = <A extends bigint>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => filter<Schema<A, I, R>> => greaterThanBigInt(0n, annotations)

/**
 * @category bigint filters
 * @since 0.67.0
 */
export const negativeBigInt = <A extends bigint>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => filter<Schema<A, I, R>> => lessThanBigInt(0n, annotations)

/**
 * @category bigint filters
 * @since 0.67.0
 */
export const nonNegativeBigInt = <A extends bigint>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => filter<Schema<A, I, R>> => greaterThanOrEqualToBigInt(0n, annotations)

/**
 * @category bigint filters
 * @since 0.67.0
 */
export const nonPositiveBigInt = <A extends bigint>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => filter<Schema<A, I, R>> => lessThanOrEqualToBigInt(0n, annotations)

/**
 * Clamps a bigint between a minimum and a maximum value.
 *
 * @category bigint transformations
 * @since 0.67.0
 */
export const clampBigInt =
  (minimum: bigint, maximum: bigint) =>
  <A extends bigint, I, R>(self: Schema<A, I, R>): transform<Schema<A, I, R>, filter<Schema<A>>> =>
    transform(
      self,
      self.pipe(typeSchema, betweenBigInt(minimum, maximum)),
      { strict: false, decode: (self) => bigInt_.clamp(self, { minimum, maximum }), encode: identity }
    )

/** @ignore */
class BigInt$ extends transformOrFail(
  String$,
  BigIntFromSelf,
  {
    strict: true,
    decode: (s, _, ast) => ParseResult.fromOption(bigInt_.fromString(s), () => new ParseResult.Type(ast, s)),
    encode: (n) => ParseResult.succeed(String(n))
  }
).annotations({ identifier: "bigint" }) {}

export {
  /**
   * This schema transforms a `string` into a `bigint` by parsing the string using the `BigInt` function.
   *
   * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
   *
   * @category bigint transformations
   * @since 0.67.0
   */
  BigInt$ as BigInt
}

/**
 * @category bigint constructors
 * @since 0.67.0
 */
export const PositiveBigIntFromSelf: filter<Schema<bigint>> = BigIntFromSelf.pipe(
  positiveBigInt({ identifier: "PositiveBigintFromSelf", title: "PositiveBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 0.67.0
 */
export const PositiveBigInt: filter<Schema<bigint, string>> = BigInt$.pipe(
  positiveBigInt({ identifier: "PositiveBigint", title: "PositiveBigint" })
)

/**
 * @category bigint constructors
 * @since 0.67.0
 */
export const NegativeBigIntFromSelf: filter<Schema<bigint>> = BigIntFromSelf.pipe(
  negativeBigInt({ identifier: "NegativeBigintFromSelf", title: "NegativeBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 0.67.0
 */
export const NegativeBigInt: filter<Schema<bigint, string>> = BigInt$.pipe(
  negativeBigInt({ identifier: "NegativeBigint", title: "NegativeBigint" })
)

/**
 * @category bigint constructors
 * @since 0.67.0
 */
export const NonPositiveBigIntFromSelf: filter<Schema<bigint>> = BigIntFromSelf.pipe(
  nonPositiveBigInt({ identifier: "NonPositiveBigintFromSelf", title: "NonPositiveBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 0.67.0
 */
export const NonPositiveBigInt: filter<Schema<bigint, string>> = BigInt$.pipe(
  nonPositiveBigInt({ identifier: "NonPositiveBigint", title: "NonPositiveBigint" })
)

/**
 * @category bigint constructors
 * @since 0.67.0
 */
export const NonNegativeBigIntFromSelf: filter<Schema<bigint>> = BigIntFromSelf.pipe(
  nonNegativeBigInt({ identifier: "NonNegativeBigintFromSelf", title: "NonNegativeBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 0.67.0
 */
export const NonNegativeBigInt: filter<Schema<bigint, string>> = BigInt$.pipe(
  nonNegativeBigInt({ identifier: "NonNegativeBigint", title: "NonNegativeBigint" })
)

/**
 * This schema transforms a `number` into a `bigint` by parsing the number using the `BigInt` function.
 *
 * It returns an error if the value can't be safely encoded as a `number` due to being out of range.
 *
 * @category bigint transformations
 * @since 0.67.0
 */
export class BigIntFromNumber extends transformOrFail(
  Number$,
  BigIntFromSelf,
  {
    strict: true,
    decode: (n, _, ast) =>
      ParseResult.fromOption(
        bigInt_.fromNumber(n),
        () => new ParseResult.Type(ast, n)
      ),
    encode: (b, _, ast) => ParseResult.fromOption(bigInt_.toNumber(b), () => new ParseResult.Type(ast, b))
  }
).annotations({ identifier: "BigintFromNumber" }) {}

const redactedArbitrary = <A>(value: LazyArbitrary<A>): LazyArbitrary<redacted_.Redacted<A>> => (fc) =>
  value(fc).map((x) => redacted_.make(x))

const toComposite = <A, R, B>(
  eff: Effect.Effect<A, ParseResult.ParseIssue, R>,
  onSuccess: (a: A) => B,
  ast: AST.AST,
  actual: unknown
): Effect.Effect<B, ParseResult.Composite, R> =>
  ParseResult.mapBoth(eff, {
    onFailure: (e) => new ParseResult.Composite(ast, actual, e),
    onSuccess
  })

const redactedParse = <A, R>(
  decodeUnknown: ParseResult.DecodeUnknown<A, R>
): ParseResult.DeclarationDecodeUnknown<redacted_.Redacted<A>, R> =>
(u, options, ast) =>
  redacted_.isRedacted(u) ?
    toComposite(decodeUnknown(redacted_.value(u), options), redacted_.make, ast, u) :
    ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.21
 */
export interface RedactedFromSelf<Value extends Schema.Any> extends
  AnnotableClass<
    RedactedFromSelf<Value>,
    redacted_.Redacted<Schema.Type<Value>>,
    redacted_.Redacted<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Redacted constructors
 * @since 0.67.21
 */
export const RedactedFromSelf = <Value extends Schema.Any>(
  value: Value
): RedactedFromSelf<Value> =>
  declare(
    [value],
    {
      decode: (value) => redactedParse(ParseResult.decodeUnknown(value)),
      encode: (value) => redactedParse(ParseResult.encodeUnknown(value))
    },
    {
      description: "Redacted(<redacted>)",
      pretty: () => () => "Redacted(<redacted>)",
      arbitrary: redactedArbitrary,
      equivalence: redacted_.getEquivalence
    }
  )

/**
 * @category api interface
 * @since 0.67.21
 */
export interface Redacted<Value extends Schema.Any> extends
  AnnotableClass<
    Redacted<Value>,
    redacted_.Redacted<Schema.Type<Value>>,
    Schema.Encoded<Value>,
    Schema.Context<Value>
  >
{}

/**
 * A schema that transforms any type `A` into a `Redacted<A>`.
 *
 * @category Redacted transformations
 * @since 0.67.21
 */
export const Redacted = <Value extends Schema.Any>(
  value: Value
): Redacted<Value> => {
  return transform(
    value,
    RedactedFromSelf(typeSchema(value)),
    {
      strict: true,
      decode: (value) => redacted_.make(value),
      encode: (value) => redacted_.value(value)
    }
  )
}

/**
 * @category Duration constructors
 * @since 0.67.0
 */
export class DurationFromSelf extends declare(
  duration_.isDuration,
  {
    identifier: "DurationFromSelf",
    pretty: (): pretty_.Pretty<duration_.Duration> => String,
    arbitrary: (): LazyArbitrary<duration_.Duration> => (fc) =>
      fc.oneof(
        fc.constant(duration_.infinity),
        fc.bigUint().map((_) => duration_.nanos(_)),
        fc.bigUint().map((_) => duration_.micros(_)),
        fc.maxSafeNat().map((_) => duration_.millis(_)),
        fc.maxSafeNat().map((_) => duration_.seconds(_)),
        fc.maxSafeNat().map((_) => duration_.minutes(_)),
        fc.maxSafeNat().map((_) => duration_.hours(_)),
        fc.maxSafeNat().map((_) => duration_.days(_)),
        fc.maxSafeNat().map((_) => duration_.weeks(_))
      ),
    equivalence: (): Equivalence.Equivalence<duration_.Duration> => duration_.Equivalence
  }
) {}

/**
 * A schema that transforms a `bigint` tuple into a `Duration`.
 * Treats the value as the number of nanoseconds.
 *
 * @category Duration transformations
 * @since 0.67.0
 */
export class DurationFromNanos extends transformOrFail(
  BigIntFromSelf,
  DurationFromSelf,
  {
    strict: true,
    decode: (nanos) => ParseResult.succeed(duration_.nanos(nanos)),
    encode: (duration, _, ast) =>
      option_.match(duration_.toNanos(duration), {
        onNone: () => ParseResult.fail(new ParseResult.Type(ast, duration)),
        onSome: (val) => ParseResult.succeed(val)
      })
  }
).annotations({ identifier: "DurationFromNanos" }) {}

/**
 * A schema that transforms a `number` tuple into a `Duration`.
 * Treats the value as the number of milliseconds.
 *
 * @category Duration transformations
 * @since 0.67.0
 */
export class DurationFromMillis extends transform(
  Number$,
  DurationFromSelf,
  { strict: true, decode: (ms) => duration_.millis(ms), encode: (n) => duration_.toMillis(n) }
).annotations({ identifier: "DurationFromMillis" }) {}

const hrTime: Schema<readonly [seconds: number, nanos: number]> = Tuple(
  NonNegative.pipe(
    finite({
      [AST.TitleAnnotationId]: "seconds",
      [AST.DescriptionAnnotationId]: "seconds"
    })
  ),
  NonNegative.pipe(
    finite({
      [AST.TitleAnnotationId]: "nanos",
      [AST.DescriptionAnnotationId]: "nanos"
    })
  )
)

/**
 * A schema that transforms a `[number, number]` tuple into a `Duration`.
 *
 * @category Duration transformations
 * @since 0.67.0
 */
export class Duration extends transform(
  hrTime,
  DurationFromSelf,
  {
    strict: true,
    decode: ([seconds, nanos]) => duration_.nanos(BigInt(seconds) * BigInt(1e9) + BigInt(nanos)),
    encode: (duration) => duration_.toHrTime(duration)
  }
).annotations({ identifier: "Duration" }) {}

/**
 * Clamps a `Duration` between a minimum and a maximum value.
 *
 * @category Duration transformations
 * @since 0.67.0
 */
export const clampDuration =
  (minimum: duration_.DurationInput, maximum: duration_.DurationInput) =>
  <A extends duration_.Duration, I, R>(self: Schema<A, I, R>): transform<Schema<A, I, R>, filter<Schema<A>>> =>
    transform(
      self,
      self.pipe(typeSchema, betweenDuration(minimum, maximum)),
      { strict: false, decode: (self) => duration_.clamp(self, { minimum, maximum }), encode: identity }
    )

/**
 * @category type id
 * @since 0.67.0
 */
export const LessThanDurationTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/LessThanDuration")

/**
 * @category Duration filters
 * @since 0.67.0
 */
export const lessThanDuration = <A extends duration_.Duration>(
  max: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => duration_.lessThan(a, max), {
      typeId: { id: LessThanDurationTypeId, annotation: { max } },
      description: `a Duration less than ${duration_.decode(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const LessThanOrEqualToDurationTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/LessThanOrEqualToDuration"
)

/**
 * @category Duration filters
 * @since 0.67.0
 */
export const lessThanOrEqualToDuration = <A extends duration_.Duration>(
  max: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => duration_.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanDurationTypeId, annotation: { max } },
      description: `a Duration less than or equal to ${duration_.decode(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const GreaterThanDurationTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/GreaterThanDuration")

/**
 * @category Duration filters
 * @since 0.67.0
 */
export const greaterThanDuration = <A extends duration_.Duration>(
  min: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => duration_.greaterThan(a, min), {
      typeId: { id: GreaterThanDurationTypeId, annotation: { min } },
      description: `a Duration greater than ${duration_.decode(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const GreaterThanOrEqualToDurationTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/GreaterThanOrEqualToDuration"
)

/**
 * @category Duration filters
 * @since 0.67.0
 */
export const greaterThanOrEqualToDuration = <A extends duration_.Duration>(
  min: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => duration_.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToDurationTypeId, annotation: { min } },
      description: `a Duration greater than or equal to ${duration_.decode(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const BetweenDurationTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/BetweenDuration")

/**
 * @category Duration filters
 * @since 0.67.0
 */
export const betweenDuration = <A extends duration_.Duration>(
  minimum: duration_.DurationInput,
  maximum: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => duration_.between(a, { minimum, maximum }), {
      typeId: { id: BetweenDurationTypeId, annotation: { maximum, minimum } },
      description: `a Duration between ${duration_.decode(minimum)} and ${duration_.decode(maximum)}`,
      ...annotations
    })
  )

/**
 * @category Uint8Array constructors
 * @since 0.67.0
 */
export const Uint8ArrayFromSelf: Schema<Uint8Array> = declare(
  Predicate.isUint8Array,
  {
    identifier: "Uint8ArrayFromSelf",
    pretty: (): pretty_.Pretty<Uint8Array> => (u8arr) => `new Uint8Array(${JSON.stringify(Array.from(u8arr))})`,
    arbitrary: (): LazyArbitrary<Uint8Array> => (fc) => fc.uint8Array(),
    equivalence: (): Equivalence.Equivalence<Uint8Array> => array_.getEquivalence(Equal.equals) as any
  }
)

const Uint8Array$: Schema<Uint8Array, ReadonlyArray<number>> = transform(
  Array$(Number$.pipe(
    between(0, 255, {
      title: "8-bit unsigned integer",
      description: "a 8-bit unsigned integer"
    })
  )).annotations({ description: "an array of 8-bit unsigned integers" }),
  Uint8ArrayFromSelf,
  { strict: true, decode: (numbers) => Uint8Array.from(numbers), encode: (uint8Array) => Array.from(uint8Array) }
).annotations({ identifier: "Uint8Array" })

export {
  /**
   * A schema that transforms an array of numbers into a `Uint8Array`.
   *
   * @category Uint8Array transformations
   * @since 0.67.0
   */
  Uint8Array$ as Uint8Array
}

const makeUint8ArrayTransformation = (
  id: string,
  decode: (s: string) => either_.Either<Uint8Array, Encoding.DecodeException>,
  encode: (u: Uint8Array) => string
) =>
  transformOrFail(
    String$,
    Uint8ArrayFromSelf,
    {
      strict: true,
      decode: (s, _, ast) =>
        either_.mapLeft(
          decode(s),
          (decodeException) => new ParseResult.Type(ast, s, decodeException.message)
        ),
      encode: (u) => ParseResult.succeed(encode(u))
    }
  ).annotations({ identifier: id })

/**
 * Decodes a base64 (RFC4648) encoded string into a `Uint8Array`.
 *
 * @category Uint8Array transformations
 * @since 0.67.0
 */
export const Uint8ArrayFromBase64: Schema<Uint8Array, string> = makeUint8ArrayTransformation(
  "Uint8ArrayFromBase64",
  Encoding.decodeBase64,
  Encoding.encodeBase64
)

/**
 * Decodes a base64 (URL) encoded string into a `Uint8Array`.
 *
 * @category Uint8Array transformations
 * @since 0.67.0
 */
export const Uint8ArrayFromBase64Url: Schema<Uint8Array, string> = makeUint8ArrayTransformation(
  "Uint8ArrayFromBase64Url",
  Encoding.decodeBase64Url,
  Encoding.encodeBase64Url
)

/**
 * Decodes a hex encoded string into a `Uint8Array`.
 *
 * @category Uint8Array transformations
 * @since 0.67.0
 */
export const Uint8ArrayFromHex: Schema<Uint8Array, string> = makeUint8ArrayTransformation(
  "Uint8ArrayFromHex",
  Encoding.decodeHex,
  Encoding.encodeHex
)

const makeStringTransformation = (
  id: string,
  decode: (s: string) => either_.Either<string, Encoding.DecodeException>,
  encode: (u: string) => string
) =>
  transformOrFail(
    String$,
    String$,
    {
      strict: true,
      decode: (s, _, ast) =>
        either_.mapLeft(
          decode(s),
          (decodeException) => new ParseResult.Type(ast, s, decodeException.message)
        ),
      encode: (u) => ParseResult.succeed(encode(u))
    }
  ).annotations({ identifier: id })

/**
 * Decodes a base64 (RFC4648) encoded string into a UTF-8 string.
 *
 * @category string transformations
 * @since 0.67.0
 */
export const StringFromBase64: Schema<string> = makeStringTransformation(
  "StringFromBase64",
  Encoding.decodeBase64String,
  Encoding.encodeBase64
)

/**
 * Decodes a base64 (URL) encoded string into a UTF-8 string.
 *
 * @category string transformations
 * @since 0.67.0
 */
export const StringFromBase64Url: Schema<string> = makeStringTransformation(
  "StringFromBase64Url",
  Encoding.decodeBase64UrlString,
  Encoding.encodeBase64Url
)

/**
 * Decodes a hex encoded string into a UTF-8 string.
 *
 * @category string transformations
 * @since 0.67.0
 */
export const StringFromHex: Schema<string> = makeStringTransformation(
  "StringFromHex",
  Encoding.decodeHexString,
  Encoding.encodeHex
)

/**
 * @category type id
 * @since 0.67.0
 */
export const MinItemsTypeId: unique symbol = filters_.MinItemsTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type MinItemsTypeId = typeof MinItemsTypeId

/**
 * @category ReadonlyArray filters
 * @since 0.67.0
 */
export const minItems = <A>(
  n: number,
  annotations?: Annotations.Filter<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): filter<Schema<ReadonlyArray<A>, I, R>> => {
  const minItems = Math.floor(n)
  if (minItems < 1) {
    throw new Error(
      errors_.getInvalidArgumentErrorMessage(`Expected an integer greater than or equal to 1, actual ${n}`)
    )
  }
  return self.pipe(
    filter(
      (a) => a.length >= minItems,
      {
        typeId: MinItemsTypeId,
        description: `an array of at least ${minItems} items`,
        jsonSchema: { minItems },
        [AST.StableFilterAnnotationId]: true,
        ...annotations
      }
    )
  )
}

/**
 * @category type id
 * @since 0.67.0
 */
export const MaxItemsTypeId: unique symbol = filters_.MaxItemsTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type MaxItemsTypeId = typeof MaxItemsTypeId

/**
 * @category ReadonlyArray filters
 * @since 0.67.0
 */
export const maxItems = <A>(
  n: number,
  annotations?: Annotations.Filter<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): filter<Schema<ReadonlyArray<A>, I, R>> =>
  self.pipe(
    filter((a) => a.length <= n, {
      typeId: MaxItemsTypeId,
      description: `an array of at most ${n} items`,
      jsonSchema: { maxItems: n },
      [AST.StableFilterAnnotationId]: true,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const ItemsCountTypeId: unique symbol = filters_.ItemsCountTypeId

/**
 * @category type id
 * @since 0.67.0
 */
export type ItemsCountTypeId = typeof ItemsCountTypeId

/**
 * @category ReadonlyArray filters
 * @since 0.67.0
 */
export const itemsCount = <A>(
  n: number,
  annotations?: Annotations.Filter<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): filter<Schema<ReadonlyArray<A>, I, R>> =>
  self.pipe(
    filter((a) => a.length === n, {
      typeId: ItemsCountTypeId,
      description: `an array of exactly ${n} item(s)`,
      jsonSchema: { minItems: n, maxItems: n },
      [AST.StableFilterAnnotationId]: true,
      ...annotations
    })
  )

/**
 * @category ReadonlyArray transformations
 * @since 0.67.0
 */
export const getNumberIndexedAccess = <A extends ReadonlyArray<any>, I extends ReadonlyArray<any>, R>(
  self: Schema<A, I, R>
): SchemaClass<A[number], I[number], R> => make(AST.getNumberIndexedAccess(self.ast))

/**
 * Get the first element of a `ReadonlyArray`, or `None` if the array is empty.
 *
 * @category ReadonlyArray transformations
 * @since 0.67.0
 */
export const head = <A, I, R>(self: Schema<ReadonlyArray<A>, I, R>): SchemaClass<option_.Option<A>, I, R> =>
  transform(
    self,
    OptionFromSelf(getNumberIndexedAccess(typeSchema(self))),
    { strict: true, decode: array_.head, encode: option_.match({ onNone: () => [], onSome: array_.of }) }
  )

/**
 * Retrieves the first element of a `ReadonlyArray`.
 *
 * If the array is empty, it returns the `fallback` argument if provided; otherwise, it fails.
 *
 * @category ReadonlyArray transformations
 * @since 0.67.0
 */
export const headOrElse: {
  <A>(fallback?: LazyArg<A>): <I, R>(self: Schema<ReadonlyArray<A>, I, R>) => SchemaClass<A, I, R>
  <A, I, R>(self: Schema<ReadonlyArray<A>, I, R>, fallback?: LazyArg<A>): SchemaClass<A, I, R>
} = dual(
  (args) => isSchema(args[0]),
  <A, I, R>(self: Schema<ReadonlyArray<A>, I, R>, fallback?: LazyArg<A>): SchemaClass<A, I, R> =>
    transformOrFail(
      self,
      getNumberIndexedAccess(typeSchema(self)),
      {
        strict: true,
        decode: (as, _, ast) =>
          as.length > 0
            ? ParseResult.succeed(as[0])
            : fallback
            ? ParseResult.succeed(fallback())
            : ParseResult.fail(new ParseResult.Type(ast, as)),
        encode: (a) => ParseResult.succeed(array_.of(a))
      }
    )
)

/**
 * @category type id
 * @since 0.67.0
 */
export const ValidDateTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/ValidDate")

/**
 * Defines a filter that specifically rejects invalid dates, such as `new
 * Date("Invalid Date")`. This filter ensures that only properly formatted and
 * valid date objects are accepted, enhancing data integrity by preventing
 * erroneous date values from being processed.
 *
 * @category Date filters
 * @since 0.67.0
 */
export const validDate =
  (annotations?: Annotations.Filter<Date>) => <I, R>(self: Schema<Date, I, R>): filter<Schema<Date, I, R>> =>
    self.pipe(
      filter((a) => !Number.isNaN(a.getTime()), {
        typeId: ValidDateTypeId,
        description: "a valid Date",
        ...annotations
      })
    )

/**
 * Describes a schema that accommodates potentially invalid `Date` instances,
 * such as `new Date("Invalid Date")`, without rejection.
 *
 * @category Date constructors
 * @since 0.67.0
 */
export class DateFromSelf extends declare(
  Predicate.isDate,
  {
    identifier: "DateFromSelf",
    description: "a potentially invalid Date instance",
    pretty: (): pretty_.Pretty<Date> => (date) => `new Date(${JSON.stringify(date)})`,
    arbitrary: (): LazyArbitrary<Date> => (fc) => fc.date({ noInvalidDate: false }),
    equivalence: () => Equivalence.Date
  }
) {}

/**
 * Defines a schema that ensures only valid dates are accepted. This schema
 * rejects values like `new Date("Invalid Date")`, which, despite being a `Date`
 * instance, represents an invalid date. Such stringent validation ensures that
 * all date objects processed through this schema are properly formed and
 * represent real dates.
 *
 * @category Date constructors
 * @since 0.67.0
 */
export class ValidDateFromSelf extends DateFromSelf.pipe(
  validDate({
    identifier: "ValidDateFromSelf",
    description: "a valid Date instance"
  })
) {}

/**
 * Defines a schema that attempts to convert a `string` to a `Date` object using
 * the `new Date` constructor. This conversion is lenient, meaning it does not
 * reject strings that do not form valid dates (e.g., using `new Date("Invalid
 * Date")` results in a `Date` object, despite being invalid).
 *
 * @category Date transformations
 * @since 0.67.0
 */
export class DateFromString extends transform(
  String$,
  DateFromSelf,
  { strict: true, decode: (s) => new Date(s), encode: (d) => d.toISOString() }
).annotations({ identifier: "DateFromString" }) {}

/** @ignore */
class Date$ extends DateFromString.pipe(
  validDate({ identifier: "Date" })
) {}

export {
  /**
   * This schema converts a `string` into a `Date` object using the `new Date`
   * constructor. It ensures that only valid date strings are accepted,
   * rejecting any strings that would result in an invalid date, such as `new
   * Date("Invalid Date")`.
   *
   * @category Date transformations
   * @since 0.67.0
   */
  Date$ as Date
}

/**
 * Defines a schema that converts a `number` into a `Date` object using the `new
 * Date` constructor. This schema does not validate the numerical input,
 * allowing potentially invalid values such as `NaN`, `Infinity`, and
 * `-Infinity` to be converted into `Date` objects. During the encoding process,
 * any invalid `Date` object will be encoded to `NaN`.
 *
 * @category Date transformations
 * @since 0.67.0
 */
export class DateFromNumber extends transform(
  Number$,
  DateFromSelf,
  { strict: true, decode: (n) => new Date(n), encode: (d) => d.getTime() }
).annotations({ identifier: "DateFromNumber" }) {}

/**
 * @category Option utils
 * @since 0.67.0
 */
export type OptionEncoded<I> =
  | {
    readonly _tag: "None"
  }
  | {
    readonly _tag: "Some"
    readonly value: I
  }

const OptionNoneEncoded = Struct({
  _tag: Literal("None")
}).annotations({ description: "NoneEncoded" })

const optionSomeEncoded = <A, I, R>(value: Schema<A, I, R>) =>
  Struct({
    _tag: Literal("Some"),
    value
  }).annotations({ description: `SomeEncoded<${format(value)}>` })

const optionEncoded = <A, I, R>(value: Schema<A, I, R>) =>
  Union(
    OptionNoneEncoded,
    optionSomeEncoded(value)
  ).annotations({
    description: `OptionEncoded<${format(value)}>`
  })

const optionDecode = <A>(input: OptionEncoded<A>): option_.Option<A> =>
  input._tag === "None" ? option_.none() : option_.some(input.value)

const optionArbitrary = <A>(value: LazyArbitrary<A>): LazyArbitrary<option_.Option<A>> => (fc) =>
  fc.oneof(
    fc.record({ _tag: fc.constant("None" as const) }),
    fc.record({ _tag: fc.constant("Some" as const), value: value(fc) })
  ).map(optionDecode)

const optionPretty = <A>(value: pretty_.Pretty<A>): pretty_.Pretty<option_.Option<A>> =>
  option_.match({
    onNone: () => "none()",
    onSome: (a) => `some(${value(a)})`
  })

const optionParse =
  <A, R>(decodeUnknown: ParseResult.DecodeUnknown<A, R>): ParseResult.DeclarationDecodeUnknown<option_.Option<A>, R> =>
  (u, options, ast) =>
    option_.isOption(u) ?
      option_.isNone(u) ?
        ParseResult.succeed(option_.none())
        : toComposite(decodeUnknown(u.value, options), option_.some, ast, u)
      : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface OptionFromSelf<Value extends Schema.Any> extends
  AnnotableClass<
    OptionFromSelf<Value>,
    option_.Option<Schema.Type<Value>>,
    option_.Option<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 0.67.0
 */
export const OptionFromSelf = <Value extends Schema.Any>(
  value: Value
): OptionFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (value) => optionParse(ParseResult.decodeUnknown(value)),
      encode: (value) => optionParse(ParseResult.encodeUnknown(value))
    },
    {
      description: `Option<${format(value)}>`,
      pretty: optionPretty,
      arbitrary: optionArbitrary,
      equivalence: option_.getEquivalence
    }
  )
}

const makeNoneEncoded = {
  _tag: "None"
} as const
const makeSomeEncoded = <A>(value: A) => ({
  _tag: "Some",
  value
} as const)

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Option<Value extends Schema.Any> extends
  AnnotableClass<
    Option<Value>,
    option_.Option<Schema.Type<Value>>,
    OptionEncoded<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 0.67.0
 */
export const Option = <Value extends Schema.Any>(value: Value): Option<Value> => {
  const value_ = asSchema(value)
  return transform(
    optionEncoded(value_),
    OptionFromSelf(typeSchema(value_)),
    {
      strict: true,
      decode: optionDecode,
      encode: option_.match({
        onNone: () => makeNoneEncoded,
        onSome: makeSomeEncoded
      })
    }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface OptionFromNullOr<Value extends Schema.Any> extends
  AnnotableClass<
    OptionFromNullOr<Value>,
    option_.Option<Schema.Type<Value>>,
    Schema.Encoded<Value> | null,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 0.67.0
 */
export const OptionFromNullOr = <Value extends Schema.Any>(
  value: Value
): OptionFromNullOr<Value> => {
  const value_ = asSchema(value)
  return transform(NullOr(value_), OptionFromSelf(typeSchema(value_)), {
    strict: true,
    decode: option_.fromNullable,
    encode: option_.getOrNull
  })
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface OptionFromNullishOr<Value extends Schema.Any> extends
  AnnotableClass<
    OptionFromNullishOr<Value>,
    option_.Option<Schema.Type<Value>>,
    Schema.Encoded<Value> | null | undefined,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 0.67.0
 */
export const OptionFromNullishOr = <Value extends Schema.Any>(
  value: Value,
  onNoneEncoding: null | undefined
): OptionFromNullishOr<Value> => {
  const value_ = asSchema(value)
  return transform(
    NullishOr(value_),
    OptionFromSelf(typeSchema(value_)),
    {
      strict: true,
      decode: option_.fromNullable,
      encode: onNoneEncoding === null ? option_.getOrNull : option_.getOrUndefined
    }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface OptionFromUndefinedOr<Value extends Schema.Any> extends
  AnnotableClass<
    OptionFromUndefinedOr<Value>,
    option_.Option<Schema.Type<Value>>,
    Schema.Encoded<Value> | undefined,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 0.67.0
 */
export const OptionFromUndefinedOr = <Value extends Schema.Any>(
  value: Value
): OptionFromUndefinedOr<Value> => {
  const value_ = asSchema(value)
  return transform(UndefinedOr(value_), OptionFromSelf(typeSchema(value_)), {
    strict: true,
    decode: option_.fromNullable,
    encode: option_.getOrUndefined
  })
}

/**
 * @category Either utils
 * @since 0.67.0
 */
export type RightEncoded<IA> = {
  readonly _tag: "Right"
  readonly right: IA
}

/**
 * @category Either utils
 * @since 0.67.0
 */
export type LeftEncoded<IE> = {
  readonly _tag: "Left"
  readonly left: IE
}

/**
 * @category Either utils
 * @since 0.67.0
 */
export type EitherEncoded<IR, IL> = RightEncoded<IR> | LeftEncoded<IL>

const rightEncoded = <RA, RI, RR>(right: Schema<RA, RI, RR>): Schema<RightEncoded<RA>, RightEncoded<RI>, RR> =>
  Struct({
    _tag: Literal("Right"),
    right
  }).annotations({ description: `RightEncoded<${format(right)}>` })

const leftEncoded = <LA, LI, LR>(left: Schema<LA, LI, LR>): Schema<LeftEncoded<LA>, LeftEncoded<LI>, LR> =>
  Struct({
    _tag: Literal("Left"),
    left
  }).annotations({ description: `LeftEncoded<${format(left)}>` })

const eitherEncoded = <RA, RI, RR, LA, LI, LR>(
  right: Schema<RA, RI, RR>,
  left: Schema<LA, LI, LR>
) =>
  Union(rightEncoded(right), leftEncoded(left)).annotations({
    description: `EitherEncoded<${format(left)}, ${format(right)}>`
  })

const eitherDecode = <R, L>(input: EitherEncoded<R, L>): either_.Either<R, L> =>
  input._tag === "Left" ? either_.left(input.left) : either_.right(input.right)

const eitherArbitrary = <R, L>(
  right: LazyArbitrary<R>,
  left: LazyArbitrary<L>
): LazyArbitrary<either_.Either<R, L>> =>
(fc) =>
  fc.oneof(
    fc.record({ _tag: fc.constant("Left" as const), left: left(fc) }),
    fc.record({ _tag: fc.constant("Right" as const), right: right(fc) })
  ).map(eitherDecode)

const eitherPretty = <R, L>(
  right: pretty_.Pretty<R>,
  left: pretty_.Pretty<L>
): pretty_.Pretty<either_.Either<R, L>> =>
  either_.match({
    onLeft: (e) => `left(${left(e)})`,
    onRight: (a) => `right(${right(a)})`
  })

const eitherParse = <RR, R, LR, L>(
  parseRight: ParseResult.DecodeUnknown<R, RR>,
  decodeUnknownLeft: ParseResult.DecodeUnknown<L, LR>
): ParseResult.DeclarationDecodeUnknown<either_.Either<R, L>, LR | RR> =>
(u, options, ast) =>
  either_.isEither(u) ?
    either_.match(u, {
      onLeft: (left) => toComposite(decodeUnknownLeft(left, options), either_.left, ast, u),
      onRight: (right) => toComposite(parseRight(right, options), either_.right, ast, u)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface EitherFromSelf<R extends Schema.Any, L extends Schema.Any> extends
  AnnotableClass<
    EitherFromSelf<R, L>,
    either_.Either<Schema.Type<R>, Schema.Type<L>>,
    either_.Either<Schema.Encoded<R>, Schema.Encoded<L>>,
    Schema.Context<R> | Schema.Context<L>
  >
{}

/**
 * @category Either transformations
 * @since 0.67.0
 */
export const EitherFromSelf = <R extends Schema.Any, L extends Schema.Any>({ left, right }: {
  readonly left: L
  readonly right: R
}): EitherFromSelf<R, L> => {
  return declare(
    [right, left],
    {
      decode: (right, left) => eitherParse(ParseResult.decodeUnknown(right), ParseResult.decodeUnknown(left)),
      encode: (right, left) => eitherParse(ParseResult.encodeUnknown(right), ParseResult.encodeUnknown(left))
    },
    {
      description: `Either<${format(right)}, ${format(left)}>`,
      pretty: eitherPretty,
      arbitrary: eitherArbitrary,
      equivalence: (right, left) => either_.getEquivalence({ left, right })
    }
  )
}

const makeLeftEncoded = <E>(left: E) => (({
  _tag: "Left",
  left
}) as const)
const makeRightEncoded = <A>(right: A) => (({
  _tag: "Right",
  right
}) as const)

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Either<R extends Schema.Any, L extends Schema.Any> extends
  AnnotableClass<
    Either<R, L>,
    either_.Either<Schema.Type<R>, Schema.Type<L>>,
    EitherEncoded<Schema.Encoded<R>, Schema.Encoded<L>>,
    Schema.Context<R> | Schema.Context<L>
  >
{}

/**
 * @category Either transformations
 * @since 0.67.0
 */
export const Either = <R extends Schema.Any, L extends Schema.Any>({ left, right }: {
  readonly left: L
  readonly right: R
}): Either<R, L> => {
  const right_ = asSchema(right)
  const left_ = asSchema(left)
  return transform(
    eitherEncoded(right_, left_),
    EitherFromSelf({ left: typeSchema(left_), right: typeSchema(right_) }),
    {
      strict: true,
      decode: eitherDecode,
      encode: either_.match({ onLeft: makeLeftEncoded, onRight: makeRightEncoded })
    }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface EitherFromUnion<R extends Schema.Any, L extends Schema.Any> extends
  AnnotableClass<
    EitherFromUnion<R, L>,
    either_.Either<Schema.Type<R>, Schema.Type<L>>,
    Schema.Encoded<R> | Schema.Encoded<L>,
    Schema.Context<R> | Schema.Context<L>
  >
{}

/**
 * @example
 * import * as Schema from "@effect/schema/Schema"
 *
 * // Schema<string | number, Either<string, number>>
 * Schema.EitherFromUnion({ left: Schema.String, right: Schema.Number })
 *
 * @category Either transformations
 * @since 0.67.0
 */
export const EitherFromUnion = <R extends Schema.Any, L extends Schema.Any>({ left, right }: {
  readonly left: L
  readonly right: R
}): EitherFromUnion<R, L> => {
  const right_ = asSchema(right)
  const left_ = asSchema(left)
  const toright = typeSchema(right_)
  const toleft = typeSchema(left_)
  const fromRight = transform(right_, rightEncoded(toright), {
    strict: true,
    decode: makeRightEncoded,
    encode: (r) => r.right
  })
  const fromLeft = transform(left_, leftEncoded(toleft), {
    strict: true,
    decode: makeLeftEncoded,
    encode: (l) => l.left
  })
  return transform(
    Union(fromRight, fromLeft),
    EitherFromSelf({ left: toleft, right: toright }),
    {
      strict: true,
      decode: (from) => from._tag === "Left" ? either_.left(from.left) : either_.right(from.right),
      encode: either_.match({ onLeft: makeLeftEncoded, onRight: makeRightEncoded })
    }
  )
}

const mapArbitrary = <K, V>(
  key: LazyArbitrary<K>,
  value: LazyArbitrary<V>
): LazyArbitrary<Map<K, V>> =>
(fc) => fc.array(fc.tuple(key(fc), value(fc))).map((as) => new Map(as))

const readonlyMapPretty = <K, V>(
  key: pretty_.Pretty<K>,
  value: pretty_.Pretty<V>
): pretty_.Pretty<ReadonlyMap<K, V>> =>
(map) =>
  `new Map([${
    Array.from(map.entries())
      .map(([k, v]) => `[${key(k)}, ${value(v)}]`)
      .join(", ")
  }])`

const readonlyMapEquivalence = <K, V>(
  key: Equivalence.Equivalence<K>,
  value: Equivalence.Equivalence<V>
): Equivalence.Equivalence<ReadonlyMap<K, V>> => {
  const arrayEquivalence = array_.getEquivalence(
    Equivalence.make<[K, V]>(([ka, va], [kb, vb]) => key(ka, kb) && value(va, vb))
  )
  return Equivalence.make((a, b) => arrayEquivalence(Array.from(a.entries()), Array.from(b.entries())))
}

const readonlyMapParse = <R, K, V>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<readonly [K, V]>, R>
): ParseResult.DeclarationDecodeUnknown<ReadonlyMap<K, V>, R> =>
(u, options, ast) =>
  Predicate.isMap(u) ?
    toComposite(decodeUnknown(Array.from(u.entries()), options), (as) => new Map(as), ast, u)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface ReadonlyMapFromSelf<K extends Schema.Any, V extends Schema.Any> extends
  AnnotableClass<
    ReadonlyMapFromSelf<K, V>,
    ReadonlyMap<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyMap<Schema.Encoded<K>, Schema.Encoded<V>>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

const mapFromSelf_ = <K extends Schema.Any, V extends Schema.Any>(
  key: K,
  value: V,
  description: string
): ReadonlyMapFromSelf<K, V> =>
  declare(
    [key, value],
    {
      decode: (Key, Value) => readonlyMapParse(ParseResult.decodeUnknown(Array$(Tuple(Key, Value)))),
      encode: (Key, Value) => readonlyMapParse(ParseResult.encodeUnknown(Array$(Tuple(Key, Value))))
    },
    {
      description,
      pretty: readonlyMapPretty,
      arbitrary: mapArbitrary,
      equivalence: readonlyMapEquivalence
    }
  )

/**
 * @category ReadonlyMap
 * @since 0.67.0
 */
export const ReadonlyMapFromSelf = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): ReadonlyMapFromSelf<K, V> => mapFromSelf_(key, value, `ReadonlyMap<${format(key)}, ${format(value)}>`)

/**
 * @category api interface
 * @since 0.67.0
 */
export interface MapFromSelf<K extends Schema.Any, V extends Schema.Any> extends
  AnnotableClass<
    MapFromSelf<K, V>,
    Map<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyMap<Schema.Encoded<K>, Schema.Encoded<V>>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category Map
 * @since 0.67.0
 */
export const MapFromSelf = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): MapFromSelf<K, V> => mapFromSelf_(key, value, `Map<${format(key)}, ${format(value)}>`) as any

/**
 * @category api interface
 * @since 0.67.0
 */
export interface ReadonlyMap$<K extends Schema.Any, V extends Schema.Any> extends
  AnnotableClass<
    ReadonlyMap$<K, V>,
    ReadonlyMap<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyArray<readonly [Schema.Encoded<K>, Schema.Encoded<V>]>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category ReadonlyMap transformations
 * @since 0.67.0
 */
export const ReadonlyMap = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): ReadonlyMap$<K, V> => {
  const key_ = asSchema(key)
  const value_ = asSchema(value)
  return transform(
    Array$(Tuple(key_, value_)),
    ReadonlyMapFromSelf({ key: typeSchema(key_), value: typeSchema(value_) }),
    { strict: true, decode: (as) => new Map(as), encode: (map) => Array.from(map.entries()) }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Map$<K extends Schema.Any, V extends Schema.Any> extends
  AnnotableClass<
    Map$<K, V>,
    Map<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyArray<readonly [Schema.Encoded<K>, Schema.Encoded<V>]>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

const map = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): Map$<K, V> => {
  const key_ = asSchema(key)
  const value_ = asSchema(value)
  return transform(
    Array$(Tuple(key_, value_)),
    MapFromSelf({ key: typeSchema(key_), value: typeSchema(value_) }),
    { strict: true, decode: (as) => new Map(as), encode: (map) => Array.from(map.entries()) }
  )
}

export {
  /**
   * @category Map transformations
   * @since 0.67.0
   */
  map as Map
}

/**
 * @category ReadonlyMap transformations
 * @since 0.68.15
 */
export const ReadonlyMapFromRecord = <KA, KR, VA, VI, VR>({ key, value }: {
  key: Schema<KA, string, KR>
  value: Schema<VA, VI, VR>
}): Schema<ReadonlyMap<KA, VA>, { readonly [x: string]: VI }, KR | VR> =>
  transform(Record({ key: encodedBoundSchema(key), value }), ReadonlyMapFromSelf({ key, value: typeSchema(value) }), {
    strict: true,
    decode: (record) => new Map(Object.entries(record)),
    encode: record_.fromEntries
  })

/**
 * @category Map transformations
 * @since 0.68.15
 */
export const MapFromRecord = <KA, KR, VA, VI, VR>({ key, value }: {
  key: Schema<KA, string, KR>
  value: Schema<VA, VI, VR>
}): Schema<Map<KA, VA>, { readonly [x: string]: VI }, KR | VR> =>
  transform(Record({ key: encodedBoundSchema(key), value }), MapFromSelf({ key, value: typeSchema(value) }), {
    strict: true,
    decode: (record) => new Map(Object.entries(record)),
    encode: record_.fromEntries
  })

const setArbitrary = <A>(item: LazyArbitrary<A>): LazyArbitrary<ReadonlySet<A>> => (fc) =>
  fc.array(item(fc)).map((as) => new Set(as))

const readonlySetPretty = <A>(item: pretty_.Pretty<A>): pretty_.Pretty<ReadonlySet<A>> => (set) =>
  `new Set([${Array.from(set.values()).map((a) => item(a)).join(", ")}])`

const readonlySetEquivalence = <A>(
  item: Equivalence.Equivalence<A>
): Equivalence.Equivalence<ReadonlySet<A>> => {
  const arrayEquivalence = array_.getEquivalence(item)
  return Equivalence.make((a, b) => arrayEquivalence(Array.from(a.values()), Array.from(b.values())))
}

const readonlySetParse = <A, R>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<ReadonlySet<A>, R> =>
(u, options, ast) =>
  Predicate.isSet(u) ?
    toComposite(decodeUnknown(Array.from(u.values()), options), (as) => new Set(as), ast, u)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface ReadonlySetFromSelf<Value extends Schema.Any> extends
  AnnotableClass<
    ReadonlySetFromSelf<Value>,
    ReadonlySet<Schema.Type<Value>>,
    ReadonlySet<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

const setFromSelf_ = <Value extends Schema.Any>(value: Value, description: string): ReadonlySetFromSelf<Value> =>
  declare(
    [value],
    {
      decode: (item) => readonlySetParse(ParseResult.decodeUnknown(Array$(item))),
      encode: (item) => readonlySetParse(ParseResult.encodeUnknown(Array$(item)))
    },
    {
      description,
      pretty: readonlySetPretty,
      arbitrary: setArbitrary,
      equivalence: readonlySetEquivalence
    }
  )

/**
 * @category ReadonlySet
 * @since 0.67.0
 */
export const ReadonlySetFromSelf = <Value extends Schema.Any>(value: Value): ReadonlySetFromSelf<Value> =>
  setFromSelf_(value, `ReadonlySet<${format(value)}>`)

/**
 * @category api interface
 * @since 0.67.0
 */
export interface SetFromSelf<Value extends Schema.Any> extends
  AnnotableClass<
    SetFromSelf<Value>,
    Set<Schema.Type<Value>>,
    ReadonlySet<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Set
 * @since 0.67.0
 */
export const SetFromSelf = <Value extends Schema.Any>(value: Value): SetFromSelf<Value> =>
  setFromSelf_(value, `Set<${format(value)}>`) as any

/**
 * @category api interface
 * @since 0.67.0
 */
export interface ReadonlySet$<Value extends Schema.Any> extends
  AnnotableClass<
    ReadonlySet$<Value>,
    ReadonlySet<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category ReadonlySet transformations
 * @since 0.67.0
 */
export const ReadonlySet = <Value extends Schema.Any>(value: Value): ReadonlySet$<Value> => {
  const value_ = asSchema(value)
  return transform(
    Array$(value_),
    ReadonlySetFromSelf(typeSchema(value_)),
    { strict: true, decode: (as) => new Set(as), encode: (set) => Array.from(set) }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Set$<Value extends Schema.Any> extends
  AnnotableClass<
    Set$<Value>,
    Set<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

const set = <Value extends Schema.Any>(value: Value): Set$<Value> => {
  const value_ = asSchema(value)
  return transform(
    Array$(value_),
    SetFromSelf(typeSchema(value_)),
    { strict: true, decode: (as) => new Set(as), encode: (set) => Array.from(set) }
  )
}

export {
  /**
   * @category Set transformations
   * @since 0.67.0
   */
  set as Set
}

const bigDecimalPretty = (): pretty_.Pretty<bigDecimal_.BigDecimal> => (val) =>
  `BigDecimal(${bigDecimal_.format(bigDecimal_.normalize(val))})`

const bigDecimalArbitrary = (): LazyArbitrary<bigDecimal_.BigDecimal> => (fc) =>
  fc.tuple(fc.bigInt(), fc.integer()).map(([value, scale]) => bigDecimal_.make(value, scale))

/**
 * @category BigDecimal constructors
 * @since 0.67.0
 */
export class BigDecimalFromSelf extends declare(
  bigDecimal_.isBigDecimal,
  {
    identifier: "BigDecimalFromSelf",
    pretty: bigDecimalPretty,
    arbitrary: bigDecimalArbitrary,
    equivalence: () => bigDecimal_.Equivalence
  }
) {}

/**
 * @category BigDecimal transformations
 * @since 0.67.0
 */
export class BigDecimal extends transformOrFail(
  String$,
  BigDecimalFromSelf,
  {
    strict: true,
    decode: (num, _, ast) =>
      bigDecimal_.fromString(num).pipe(option_.match({
        onNone: () => ParseResult.fail(new ParseResult.Type(ast, num)),
        onSome: (val) => ParseResult.succeed(bigDecimal_.normalize(val))
      })),
    encode: (val) => ParseResult.succeed(bigDecimal_.format(bigDecimal_.normalize(val)))
  }
).annotations({ identifier: "BigDecimal" }) {}

/**
 * A schema that transforms a `number` into a `BigDecimal`.
 * When encoding, this Schema will produce incorrect results if the BigDecimal exceeds the 64-bit range of a number.
 *
 * @category BigDecimal transformations
 * @since 0.67.0
 */
export class BigDecimalFromNumber extends transformOrFail(
  Number$,
  BigDecimalFromSelf,
  {
    strict: true,
    decode: (num) => ParseResult.succeed(bigDecimal_.fromNumber(num)),
    encode: (val) => ParseResult.succeed(bigDecimal_.unsafeToNumber(val))
  }
).annotations({ identifier: "BigDecimalFromNumber" }) {}

/**
 * @category type id
 * @since 0.67.0
 */
export const GreaterThanBigDecimalTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/GreaterThanBigDecimal")

/**
 * @category BigDecimal filters
 * @since 0.67.0
 */
export const greaterThanBigDecimal = <A extends bigDecimal_.BigDecimal>(
  min: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => bigDecimal_.greaterThan(a, min), {
      typeId: { id: GreaterThanBigDecimalTypeId, annotation: { min } },
      description: `a BigDecimal greater than ${bigDecimal_.format(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const GreaterThanOrEqualToBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/GreaterThanOrEqualToBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 0.67.0
 */
export const greaterThanOrEqualToBigDecimal = <A extends bigDecimal_.BigDecimal>(
  min: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => bigDecimal_.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToBigDecimalTypeId, annotation: { min } },
      description: `a BigDecimal greater than or equal to ${bigDecimal_.format(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const LessThanBigDecimalTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/LessThanBigDecimal")

/**
 * @category BigDecimal filters
 * @since 0.67.0
 */
export const lessThanBigDecimal = <A extends bigDecimal_.BigDecimal>(
  max: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => bigDecimal_.lessThan(a, max), {
      typeId: { id: LessThanBigDecimalTypeId, annotation: { max } },
      description: `a BigDecimal less than ${bigDecimal_.format(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const LessThanOrEqualToBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/LessThanOrEqualToBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 0.67.0
 */
export const lessThanOrEqualToBigDecimal = <A extends bigDecimal_.BigDecimal>(
  max: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => bigDecimal_.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanOrEqualToBigDecimalTypeId, annotation: { max } },
      description: `a BigDecimal less than or equal to ${bigDecimal_.format(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 0.67.0
 */
export const PositiveBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/PositiveBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 0.67.0
 */
export const positiveBigDecimal = <A extends bigDecimal_.BigDecimal>(
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => bigDecimal_.isPositive(a), {
      typeId: { id: PositiveBigDecimalTypeId, annotation: {} },
      description: `a positive BigDecimal`,
      ...annotations
    })
  )

/**
 * @category BigDecimal constructors
 * @since 0.67.0
 */
export const PositiveBigDecimalFromSelf: filter<Schema<bigDecimal_.BigDecimal>> = BigDecimalFromSelf.pipe(
  positiveBigDecimal({
    identifier: "PositiveBigDecimalFromSelf",
    title: "PositiveBigDecimalFromSelf"
  })
)

/**
 * @category type id
 * @since 0.67.0
 */
export const NonNegativeBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/NonNegativeBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 0.67.0
 */
export const nonNegativeBigDecimal = <A extends bigDecimal_.BigDecimal>(
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a.value >= 0n, {
      typeId: { id: NonNegativeBigDecimalTypeId, annotation: {} },
      description: `a non-negative BigDecimal`,
      ...annotations
    })
  )

/**
 * @category BigDecimal constructors
 * @since 0.67.0
 */
export const NonNegativeBigDecimalFromSelf: filter<Schema<bigDecimal_.BigDecimal>> = BigDecimalFromSelf.pipe(
  nonNegativeBigDecimal({
    identifier: "NonNegativeBigDecimalFromSelf",
    title: "NonNegativeBigDecimalFromSelf"
  })
)

/**
 * @category type id
 * @since 0.67.0
 */
export const NegativeBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/NegativeBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 0.67.0
 */
export const negativeBigDecimal = <A extends bigDecimal_.BigDecimal>(
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => bigDecimal_.isNegative(a), {
      typeId: { id: NegativeBigDecimalTypeId, annotation: {} },
      description: `a negative BigDecimal`,
      ...annotations
    })
  )

/**
 * @category BigDecimal constructors
 * @since 0.67.0
 */
export const NegativeBigDecimalFromSelf: filter<Schema<bigDecimal_.BigDecimal>> = BigDecimalFromSelf.pipe(
  negativeBigDecimal({
    identifier: "NegativeBigDecimalFromSelf",
    title: "NegativeBigDecimalFromSelf"
  })
)

/**
 * @category type id
 * @since 0.67.0
 */
export const NonPositiveBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/NonPositiveBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 0.67.0
 */
export const nonPositiveBigDecimal = <A extends bigDecimal_.BigDecimal>(
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => a.value <= 0n, {
      typeId: { id: NonPositiveBigDecimalTypeId, annotation: {} },
      description: `a non-positive BigDecimal`,
      ...annotations
    })
  )

/**
 * @category BigDecimal constructors
 * @since 0.67.0
 */
export const NonPositiveBigDecimalFromSelf: filter<Schema<bigDecimal_.BigDecimal>> = BigDecimalFromSelf.pipe(
  nonPositiveBigDecimal({
    identifier: "NonPositiveBigDecimalFromSelf",
    title: "NonPositiveBigDecimalFromSelf"
  })
)

/**
 * @category type id
 * @since 0.67.0
 */
export const BetweenBigDecimalTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/BetweenBigDecimal")

/**
 * @category BigDecimal filters
 * @since 0.67.0
 */
export const betweenBigDecimal = <A extends bigDecimal_.BigDecimal>(
  minimum: bigDecimal_.BigDecimal,
  maximum: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): filter<Schema<A, I, R>> =>
  self.pipe(
    filter((a) => bigDecimal_.between(a, { minimum, maximum }), {
      typeId: { id: BetweenBigDecimalTypeId, annotation: { maximum, minimum } },
      description: `a BigDecimal between ${bigDecimal_.format(minimum)} and ${bigDecimal_.format(maximum)}`,
      ...annotations
    })
  )

/**
 * Clamps a `BigDecimal` between a minimum and a maximum value.
 *
 * @category BigDecimal transformations
 * @since 0.67.0
 */
export const clampBigDecimal =
  (minimum: bigDecimal_.BigDecimal, maximum: bigDecimal_.BigDecimal) =>
  <A extends bigDecimal_.BigDecimal, I, R>(self: Schema<A, I, R>): transform<Schema<A, I, R>, filter<Schema<A>>> =>
    transform(
      self,
      self.pipe(typeSchema, betweenBigDecimal(minimum, maximum)),
      { strict: false, decode: (self) => bigDecimal_.clamp(self, { minimum, maximum }), encode: identity }
    )

const chunkArbitrary = <A>(item: LazyArbitrary<A>): LazyArbitrary<chunk_.Chunk<A>> => (fc) =>
  fc.array(item(fc)).map(chunk_.fromIterable)

const chunkPretty = <A>(item: pretty_.Pretty<A>): pretty_.Pretty<chunk_.Chunk<A>> => (c) =>
  `Chunk(${chunk_.toReadonlyArray(c).map(item).join(", ")})`

const chunkParse = <A, R>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<chunk_.Chunk<A>, R> =>
(u, options, ast) =>
  chunk_.isChunk(u) ?
    chunk_.isEmpty(u) ?
      ParseResult.succeed(chunk_.empty())
      : toComposite(decodeUnknown(chunk_.toReadonlyArray(u), options), chunk_.fromIterable, ast, u)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface ChunkFromSelf<Value extends Schema.Any> extends
  AnnotableClass<
    ChunkFromSelf<Value>,
    chunk_.Chunk<Schema.Type<Value>>,
    chunk_.Chunk<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Chunk
 * @since 0.67.0
 */
export const ChunkFromSelf = <Value extends Schema.Any>(value: Value): ChunkFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (item) => chunkParse(ParseResult.decodeUnknown(Array$(item))),
      encode: (item) => chunkParse(ParseResult.encodeUnknown(Array$(item)))
    },
    {
      description: `Chunk<${format(value)}>`,
      pretty: chunkPretty,
      arbitrary: chunkArbitrary,
      equivalence: chunk_.getEquivalence
    }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Chunk<Value extends Schema.Any> extends
  AnnotableClass<
    Chunk<Value>,
    chunk_.Chunk<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Chunk transformations
 * @since 0.67.0
 */
export const Chunk = <Value extends Schema.Any>(value: Value): Chunk<Value> => {
  const value_ = asSchema(value)
  return transform(
    Array$(value_),
    ChunkFromSelf(typeSchema(value_)),
    {
      strict: true,
      decode: (as) => as.length === 0 ? chunk_.empty() : chunk_.fromIterable(as),
      encode: chunk_.toReadonlyArray
    }
  )
}

/**
 * @category api interface
 * @since 0.67.23
 */
export interface NonEmptyChunkFromSelf<Value extends Schema.Any> extends
  AnnotableClass<
    NonEmptyChunkFromSelf<Value>,
    chunk_.NonEmptyChunk<Schema.Type<Value>>,
    chunk_.NonEmptyChunk<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

const nonEmptyChunkArbitrary = <A>(item: LazyArbitrary<A>): LazyArbitrary<chunk_.NonEmptyChunk<A>> => (fc) =>
  fastCheck_.array(item(fc), { minLength: 1 }).map((as) => chunk_.unsafeFromNonEmptyArray(as as any))

const nonEmptyChunkPretty = <A>(item: pretty_.Pretty<A>): pretty_.Pretty<chunk_.NonEmptyChunk<A>> => (c) =>
  `NonEmptyChunk(${chunk_.toReadonlyArray(c).map(item).join(", ")})`

const nonEmptyChunkParse = <A, R>(
  decodeUnknown: ParseResult.DecodeUnknown<array_.NonEmptyReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<chunk_.NonEmptyChunk<A>, R> =>
(u, options, ast) =>
  chunk_.isChunk(u) && chunk_.isNonEmpty(u)
    ? toComposite(decodeUnknown(chunk_.toReadonlyArray(u), options), chunk_.unsafeFromNonEmptyArray, ast, u)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category Chunk
 * @since 0.67.23
 */
export const NonEmptyChunkFromSelf = <Value extends Schema.Any>(value: Value): NonEmptyChunkFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (item) => nonEmptyChunkParse(ParseResult.decodeUnknown(NonEmptyArray(item))),
      encode: (item) => nonEmptyChunkParse(ParseResult.encodeUnknown(NonEmptyArray(item)))
    },
    {
      description: `NonEmptyChunk<${format(value)}>`,
      pretty: nonEmptyChunkPretty,
      arbitrary: nonEmptyChunkArbitrary,
      equivalence: chunk_.getEquivalence
    }
  )
}

/**
 * @category api interface
 * @since 0.67.23
 */
export interface NonEmptyChunk<Value extends Schema.Any> extends
  AnnotableClass<
    NonEmptyChunk<Value>,
    chunk_.NonEmptyChunk<Schema.Type<Value>>,
    array_.NonEmptyReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Chunk transformations
 * @since 0.67.23
 */
export const NonEmptyChunk = <Value extends Schema.Any>(value: Value): NonEmptyChunk<Value> => {
  const value_ = asSchema(value)
  return transform(
    NonEmptyArray(value_),
    NonEmptyChunkFromSelf(typeSchema(value_)),
    { strict: true, decode: chunk_.unsafeFromNonEmptyArray, encode: chunk_.toReadonlyArray }
  )
}

const toData = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(a: A): A =>
  Array.isArray(a) ? data_.array(a) : data_.struct(a)

const dataArbitrary = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: LazyArbitrary<A>
): LazyArbitrary<A> =>
(fc) => item(fc).map(toData)

const dataPretty = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: pretty_.Pretty<A>
): pretty_.Pretty<A> =>
(d) => `Data(${item(d)})`

const dataParse = <R, A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  decodeUnknown: ParseResult.DecodeUnknown<A, R>
): ParseResult.DeclarationDecodeUnknown<A, R> =>
(u, options, ast) =>
  Equal.isEqual(u) ?
    toComposite(decodeUnknown(u, options), toData, ast, u)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category Data transformations
 * @since 0.67.0
 */
export const DataFromSelf = <
  R,
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<A, I, R>
): SchemaClass<A, I, R> =>
  declare(
    [item],
    {
      decode: (item) => dataParse(ParseResult.decodeUnknown(item)),
      encode: (item) => dataParse(ParseResult.encodeUnknown(item))
    },
    {
      description: `Data<${format(item)}>`,
      pretty: dataPretty,
      arbitrary: dataArbitrary
    }
  )

/**
 * @category Data transformations
 * @since 0.67.0
 */
export const Data = <
  R,
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<A, I, R>
): SchemaClass<A, I, R> =>
  transform(
    item,
    DataFromSelf(typeSchema(item)),
    { strict: false, decode: toData, encode: (a) => Array.isArray(a) ? Array.from(a) : Object.assign({}, a) }
  )

type MissingSelfGeneric<Usage extends string, Params extends string = ""> =
  `Missing \`Self\` generic - use \`class Self extends ${Usage}<Self>()(${Params}{ ... })\``

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

/**
 * @category api interface
 * @since 0.67.0
 */
export interface Class<Self, Fields extends Struct.Fields, I, R, C, Inherited, Proto>
  extends Schema<Self, Simplify<I>, R>
{
  new(
    props: RequiredKeys<C> extends never ? void | Simplify<C> : Simplify<C>,
    options?: MakeOptions
  ): Struct.Type<Fields> & Omit<Inherited, keyof Fields> & Proto

  make<Args extends Array<any>, X>(this: { new(...args: Args): X }, ...args: Args): X

  annotations(annotations: Annotations.Schema<Self>): SchemaClass<Self, Simplify<I>, R>

  readonly fields: { readonly [K in keyof Fields]: Fields[K] }

  readonly identifier: string

  extend<Extended = never>(identifier: string): <newFields extends Struct.Fields>(
    fields: newFields | HasFields<newFields>,
    annotations?: Annotations.Schema<Extended>
  ) => [Extended] extends [never] ? MissingSelfGeneric<"Base.extend">
    : Class<
      Extended,
      Fields & newFields,
      I & Struct.Encoded<newFields>,
      R | Struct.Context<newFields>,
      C & Struct.Constructor<newFields>,
      Self,
      Proto
    >

  transformOrFail<Transformed = never>(identifier: string): <
    newFields extends Struct.Fields,
    R2,
    R3
  >(
    fields: newFields,
    options: {
      readonly decode: (
        input: Simplify<Struct.Type<Fields>>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<Simplify<Struct.Type<Fields & newFields>>, ParseResult.ParseIssue, R2>
      readonly encode: (
        input: Simplify<Struct.Type<Fields & newFields>>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<Struct.Type<Fields>, ParseResult.ParseIssue, R3>
    },
    annotations?: Annotations.Schema<Transformed>
  ) => [Transformed] extends [never] ? MissingSelfGeneric<"Base.transformOrFail">
    : Class<
      Transformed,
      Fields & newFields,
      I,
      R | Struct.Context<newFields> | R2 | R3,
      C & Struct.Constructor<newFields>,
      Self,
      Proto
    >

  transformOrFailFrom<Transformed = never>(identifier: string): <
    newFields extends Struct.Fields,
    R2,
    R3
  >(
    fields: newFields,
    options: {
      readonly decode: (
        input: Simplify<I>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<Simplify<I & Struct.Encoded<newFields>>, ParseResult.ParseIssue, R2>
      readonly encode: (
        input: Simplify<I & Struct.Encoded<newFields>>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<I, ParseResult.ParseIssue, R3>
    },
    annotations?: Annotations.Schema<Transformed>
  ) => [Transformed] extends [never] ? MissingSelfGeneric<"Base.transformOrFailFrom">
    : Class<
      Transformed,
      Fields & newFields,
      I,
      R | Struct.Context<newFields> | R2 | R3,
      C & Struct.Constructor<newFields>,
      Self,
      Proto
    >
}

type HasFields<Fields extends Struct.Fields> = Struct<Fields> | {
  readonly [refineTypeId]: HasFields<Fields>
}

const isField = (u: unknown) => isSchema(u) || isPropertySignature(u)

const isFields = <Fields extends Struct.Fields>(fields: object): fields is Fields =>
  util_.ownKeys(fields).every((key) => isField((fields as any)[key]))

const getFields = <Fields extends Struct.Fields>(hasFields: HasFields<Fields>): Fields =>
  "fields" in hasFields ? hasFields.fields : getFields(hasFields[refineTypeId])

const getSchemaFromFieldsOr = <Fields extends Struct.Fields>(fieldsOr: Fields | HasFields<Fields>): Schema.Any =>
  isFields(fieldsOr) ? Struct(fieldsOr) : isSchema(fieldsOr) ? fieldsOr : Struct(getFields(fieldsOr))

const getFieldsFromFieldsOr = <Fields extends Struct.Fields>(fieldsOr: Fields | HasFields<Fields>): Fields =>
  isFields(fieldsOr) ? fieldsOr : getFields(fieldsOr)

/**
 * @category classes
 * @since 0.67.0
 */
export const Class = <Self = never>(identifier: string) =>
<Fields extends Struct.Fields>(
  fieldsOr: Fields | HasFields<Fields>,
  annotations?: Annotations.Schema<Self>
): [Self] extends [never] ? MissingSelfGeneric<"Class">
  : Class<
    Self,
    Fields,
    Struct.Encoded<Fields>,
    Struct.Context<Fields>,
    Struct.Constructor<Fields>,
    {},
    {}
  > =>
  makeClass({
    kind: "Class",
    identifier,
    schema: getSchemaFromFieldsOr(fieldsOr),
    fields: getFieldsFromFieldsOr(fieldsOr),
    Base: data_.Class,
    annotations
  })

/** @internal */
export const getClassTag = <Tag extends string>(tag: Tag) =>
  withConstructorDefault(propertySignature(Literal(tag)), () => tag)

/**
 * @category api interface
 * @since 0.67.0
 */
export interface TaggedClass<Self, Tag extends string, Fields extends Struct.Fields> extends
  Class<
    Self,
    Fields,
    Struct.Encoded<Fields>,
    Struct.Context<Fields>,
    Struct.Constructor<Omit<Fields, "_tag">>,
    {},
    {}
  >
{
  readonly _tag: Tag
}

/**
 * @category classes
 * @since 0.67.0
 */
export const TaggedClass = <Self = never>(identifier?: string) =>
<Tag extends string, Fields extends Struct.Fields>(
  tag: Tag,
  fieldsOr: Fields | HasFields<Fields>,
  annotations?: Annotations.Schema<Self>
): [Self] extends [never] ? MissingSelfGeneric<"TaggedClass", `"Tag", `>
  : TaggedClass<Self, Tag, { readonly _tag: tag<Tag> } & Fields> =>
{
  const fields = getFieldsFromFieldsOr(fieldsOr)
  const schema = getSchemaFromFieldsOr(fieldsOr)
  const newFields = { _tag: getClassTag(tag) }
  const taggedFields = extendFields(newFields, fields)
  return class TaggedClass extends makeClass({
    kind: "TaggedClass",
    identifier: identifier ?? tag,
    schema: extend(schema, Struct(newFields)),
    fields: taggedFields,
    Base: data_.Class,
    annotations
  }) {
    static _tag = tag
  } as any
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface TaggedErrorClass<Self, Tag extends string, Fields extends Struct.Fields> extends
  Class<
    Self,
    Fields,
    Struct.Encoded<Fields>,
    Struct.Context<Fields>,
    Struct.Constructor<Omit<Fields, "_tag">>,
    {},
    cause_.YieldableError
  >
{
  readonly _tag: Tag
}

/**
 * @category classes
 * @since 0.67.0
 */
export const TaggedError = <Self = never>(identifier?: string) =>
<Tag extends string, Fields extends Struct.Fields>(
  tag: Tag,
  fieldsOr: Fields | HasFields<Fields>,
  annotations?: Annotations.Schema<Self>
): [Self] extends [never] ? MissingSelfGeneric<"TaggedError", `"Tag", `>
  : TaggedErrorClass<
    Self,
    Tag,
    { readonly _tag: tag<Tag> } & Fields
  > =>
{
  class Base extends data_.Error {}
  ;(Base.prototype as any).name = tag
  const fields = getFieldsFromFieldsOr(fieldsOr)
  const schema = getSchemaFromFieldsOr(fieldsOr)
  const newFields = { _tag: getClassTag(tag) }
  const taggedFields = extendFields(newFields, fields)
  return class TaggedErrorClass extends makeClass({
    kind: "TaggedError",
    identifier: identifier ?? tag,
    schema: extend(schema, Struct(newFields)),
    fields: taggedFields,
    Base,
    annotations,
    disableToString: true
  }) {
    static _tag = tag
    get message(): string {
      return `{ ${
        util_.ownKeys(fields).map((p: any) => `${util_.formatPropertyKey(p)}: ${util_.formatUnknown(this[p])}`)
          .join(", ")
      } }`
    }
  } as any
}

/**
 * @since 0.67.0
 */
export interface TaggedRequest<
  Tag extends string,
  A,
  I,
  R,
  SuccessType,
  SuccessEncoded,
  FailureType,
  FailureEncoded,
  ResultR
> extends
  Request.Request<SuccessType, FailureType>,
  Serializable.SerializableWithResult<
    A,
    I,
    R,
    SuccessType,
    SuccessEncoded,
    FailureType,
    FailureEncoded,
    ResultR
  >
{
  readonly _tag: Tag
}

/**
 * @since 0.67.0
 */
export declare namespace TaggedRequest {
  /**
   * @since 0.69.0
   */
  export type Any = TaggedRequest<string, any, any, any, any, any, any, any, unknown>
  /**
   * @since 0.69.0
   */
  export type All =
    | Any
    | TaggedRequest<string, any, any, any, any, any, never, never, unknown>
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface TaggedRequestClass<
  Self,
  Tag extends string,
  Payload extends Struct.Fields,
  Success extends Schema.All,
  Failure extends Schema.All
> extends
  Class<
    Self,
    Payload,
    Struct.Encoded<Payload>,
    Struct.Context<Payload>,
    Struct.Constructor<Omit<Payload, "_tag">>,
    TaggedRequest<
      Tag,
      Self,
      Struct.Encoded<Payload>,
      Struct.Context<Payload>,
      Schema.Type<Success>,
      Schema.Encoded<Success>,
      Schema.Type<Failure>,
      Schema.Encoded<Failure>,
      Schema.Context<Success> | Schema.Context<Failure>
    >,
    {}
  >
{
  readonly _tag: Tag
  /** @since 0.69.1 */
  readonly success: Success
  /** @since 0.69.1 */
  readonly failure: Failure
}

/**
 * @category classes
 * @since 0.67.0
 */
export const TaggedRequest =
  <Self = never>(identifier?: string) =>
  <Tag extends string, Payload extends Struct.Fields, Success extends Schema.All, Failure extends Schema.All>(
    tag: Tag,
    options: {
      failure: Failure
      success: Success
      payload: Payload
    },
    annotations?: Annotations.Schema<Self>
  ): [Self] extends [never] ? MissingSelfGeneric<"TaggedRequest", `"Tag", SuccessSchema, FailureSchema, `>
    : TaggedRequestClass<
      Self,
      Tag,
      { readonly _tag: tag<Tag> } & Payload,
      Success,
      Failure
    > =>
  {
    const taggedFields = extendFields({ _tag: getClassTag(tag) }, options.payload)
    return class TaggedRequestClass extends makeClass({
      kind: "TaggedRequest",
      identifier: identifier ?? tag,
      schema: Struct(taggedFields),
      fields: taggedFields,
      Base: Request.Class<any, any, { readonly _tag: string }>,
      annotations
    }) {
      static _tag = tag
      static success = options.success
      static failure = options.failure
      get [serializable_.symbol]() {
        return this.constructor
      }
      get [serializable_.symbolResult]() {
        return {
          failure: options.failure,
          success: options.success
        }
      }
    } as any
  }

const extendFields = (a: Struct.Fields, b: Struct.Fields): Struct.Fields => {
  const out = { ...a }
  for (const key of util_.ownKeys(b)) {
    if (key in a) {
      throw new Error(errors_.getASTDuplicatePropertySignatureErrorMessage(key))
    }
    out[key] = b[key]
  }
  return out
}

// does not overwrite existing title annotation
const orElseTitleAnnotation = <A, I, R>(schema: Schema<A, I, R>, title: string): Schema<A, I, R> => {
  const annotation = AST.getTitleAnnotation(schema.ast)
  if (option_.isNone(annotation)) {
    return schema.annotations({ title })
  }
  return schema
}

type MakeOptions = boolean | {
  readonly disableValidation?: boolean
}

const getDisableValidationMakeOption = (options: MakeOptions | undefined): boolean =>
  Predicate.isBoolean(options) ? options : options?.disableValidation ?? false

const makeClass = ({ Base, annotations, disableToString, fields, identifier, kind, schema }: {
  kind: "Class" | "TaggedClass" | "TaggedError" | "TaggedRequest"
  identifier: string
  schema: Schema.Any
  fields: Struct.Fields
  Base: new(...args: ReadonlyArray<any>) => any
  annotations?: Annotations.Schema<any> | undefined
  disableToString?: boolean | undefined
}): any => {
  const classSymbol = Symbol.for(`@effect/schema/${kind}/${identifier}`)
  const validateSchema = orElseTitleAnnotation(schema, `${identifier} (Constructor)`)
  const encodedSide: Schema.Any = orElseTitleAnnotation(schema, `${identifier} (Encoded side)`)
  const typeSide = orElseTitleAnnotation(typeSchema(schema), `${identifier} (Type side)`)
  const fallbackInstanceOf = (u: unknown) => Predicate.hasProperty(u, classSymbol) && ParseResult.is(typeSide)(u)
  const klass = class extends Base {
    constructor(
      props: { [x: string | symbol]: unknown } = {},
      options: MakeOptions = false
    ) {
      props = { ...props }
      if (kind !== "Class") {
        delete props["_tag"]
      }
      props = lazilyMergeDefaults(fields, props)
      if (!getDisableValidationMakeOption(options)) {
        props = ParseResult.validateSync(validateSchema)(props)
      }
      super(props, true)
    }

    // ----------------
    // Schema interface
    // ----------------

    static [TypeId] = variance

    static get ast() {
      const declaration: Schema.Any = declare(
        [typeSide],
        {
          decode: () => (input, _, ast) =>
            input instanceof this || fallbackInstanceOf(input)
              ? ParseResult.succeed(input)
              : ParseResult.fail(new ParseResult.Type(ast, input)),
          encode: () => (input, options) =>
            input instanceof this
              ? ParseResult.succeed(input)
              : ParseResult.map(
                ParseResult.encodeUnknown(typeSide)(input, options),
                (props) => new this(props, true)
              )
        },
        {
          identifier,
          title: identifier,
          description: `an instance of ${identifier}`,
          pretty: (pretty) => (self: any) => `${identifier}(${pretty(self)})`,
          arbitrary: (arb) => (fc: any) => arb(fc).map((props: any) => new this(props)),
          equivalence: identity,
          [AST.SurrogateAnnotationId]: typeSide.ast,
          ...annotations
        }
      )
      const transformation = transform(
        encodedSide,
        declaration,
        { strict: true, decode: (input) => new this(input, true), encode: identity }
      ).annotations({ [AST.SurrogateAnnotationId]: schema.ast })
      return transformation.ast
    }

    static pipe() {
      return pipeArguments(this, arguments)
    }

    static annotations(annotations: Annotations.Schema<any>) {
      return make(this.ast).annotations(annotations)
    }

    static toString() {
      return `(${String(encodedSide)} <-> ${identifier})`
    }

    // ----------------
    // Class interface
    // ----------------

    static make(...args: Array<any>) {
      return new this(...args)
    }

    static fields = { ...fields }

    static identifier = identifier

    static extend<Extended>(identifier: string) {
      return (newFieldsOr: Struct.Fields | HasFields<Struct.Fields>, annotations?: Annotations.Schema<Extended>) => {
        const newFields = getFieldsFromFieldsOr(newFieldsOr)
        const newSchema = getSchemaFromFieldsOr(newFieldsOr)
        const extendedFields = extendFields(fields, newFields)
        return makeClass({
          kind,
          identifier,
          schema: extend(schema, newSchema),
          fields: extendedFields,
          Base: this,
          annotations
        })
      }
    }

    static transformOrFail<Transformed>(identifier: string) {
      return (newFields: Struct.Fields, options: any, annotations?: Annotations.Schema<Transformed>) => {
        const transformedFields: Struct.Fields = extendFields(fields, newFields)
        return makeClass({
          kind,
          identifier,
          schema: transformOrFail(
            schema,
            typeSchema(Struct(transformedFields)),
            options
          ),
          fields: transformedFields,
          Base: this,
          annotations
        })
      }
    }

    static transformOrFailFrom<Transformed>(identifier: string) {
      return (newFields: Struct.Fields, options: any, annotations?: Annotations.Schema<Transformed>) => {
        const transformedFields: Struct.Fields = extendFields(fields, newFields)
        return makeClass({
          kind,
          identifier,
          schema: transformOrFail(
            encodedSchema(schema),
            Struct(transformedFields),
            options
          ),
          fields: transformedFields,
          Base: this,
          annotations
        })
      }
    }

    // ----------------
    // other
    // ----------------

    get [classSymbol]() {
      return classSymbol
    }
  }
  if (disableToString !== true) {
    Object.defineProperty(klass.prototype, "toString", {
      value() {
        return `${identifier}({ ${
          util_.ownKeys(fields).map((p: any) => `${util_.formatPropertyKey(p)}: ${util_.formatUnknown(this[p])}`)
            .join(", ")
        } })`
      },
      configurable: true
    })
  }
  return klass
}

/**
 * @category FiberId
 * @since 0.67.0
 */
export type FiberIdEncoded =
  | {
    readonly _tag: "Composite"
    readonly left: FiberIdEncoded
    readonly right: FiberIdEncoded
  }
  | {
    readonly _tag: "None"
  }
  | {
    readonly _tag: "Runtime"
    readonly id: number
    readonly startTimeMillis: number
  }

const FiberIdNoneEncoded = Struct({
  _tag: Literal("None")
}).annotations({ identifier: "FiberIdNoneEncoded" })

const FiberIdRuntimeEncoded = Struct({
  _tag: Literal("Runtime"),
  id: Int.annotations({
    title: "id",
    description: "id"
  }),
  startTimeMillis: Int.annotations({
    title: "startTimeMillis",
    description: "startTimeMillis"
  })
}).annotations({ identifier: "FiberIdRuntimeEncoded" })

const FiberIdCompositeEncoded = Struct({
  _tag: Literal("Composite"),
  left: suspend(() => FiberIdEncoded),
  right: suspend(() => FiberIdEncoded)
}).annotations({ identifier: "FiberIdCompositeEncoded" })

const FiberIdEncoded: Schema<FiberIdEncoded> = Union(
  FiberIdNoneEncoded,
  FiberIdRuntimeEncoded,
  FiberIdCompositeEncoded
).annotations({ identifier: "FiberIdEncoded" })

const fiberIdArbitrary: LazyArbitrary<fiberId_.FiberId> = (fc) =>
  fc.letrec((tie) => ({
    None: fc.record({ _tag: fc.constant("None" as const) }),
    Runtime: fc.record({ _tag: fc.constant("Runtime" as const), id: fc.integer(), startTimeMillis: fc.integer() }),
    Composite: fc.record({ _tag: fc.constant("Composite" as const), left: tie("FiberId"), right: tie("FiberId") }),
    FiberId: fc.oneof(tie("None"), tie("Runtime"), tie("Composite")) as any as fastCheck_.Arbitrary<fiberId_.FiberId>
  })).FiberId.map(fiberIdDecode)

const fiberIdPretty: pretty_.Pretty<fiberId_.FiberId> = (fiberId) => {
  switch (fiberId._tag) {
    case "None":
      return "FiberId.none"
    case "Runtime":
      return `FiberId.runtime(${fiberId.id}, ${fiberId.startTimeMillis})`
    case "Composite":
      return `FiberId.composite(${fiberIdPretty(fiberId.right)}, ${fiberIdPretty(fiberId.left)})`
  }
}

/**
 * @category FiberId constructors
 * @since 0.67.0
 */
export class FiberIdFromSelf extends declare(
  fiberId_.isFiberId,
  {
    identifier: "FiberIdFromSelf",
    pretty: () => fiberIdPretty,
    arbitrary: () => fiberIdArbitrary
  }
) {}

const fiberIdDecode = (input: FiberIdEncoded): fiberId_.FiberId => {
  switch (input._tag) {
    case "None":
      return fiberId_.none
    case "Runtime":
      return fiberId_.runtime(input.id, input.startTimeMillis)
    case "Composite":
      return fiberId_.composite(fiberIdDecode(input.left), fiberIdDecode(input.right))
  }
}

const fiberIdEncode = (input: fiberId_.FiberId): FiberIdEncoded => {
  switch (input._tag) {
    case "None":
      return { _tag: "None" }
    case "Runtime":
      return { _tag: "Runtime", id: input.id, startTimeMillis: input.startTimeMillis }
    case "Composite":
      return {
        _tag: "Composite",
        left: fiberIdEncode(input.left),
        right: fiberIdEncode(input.right)
      }
  }
}

/**
 * @category FiberId transformations
 * @since 0.67.0
 */
export class FiberId extends transform(
  FiberIdEncoded,
  FiberIdFromSelf,
  { strict: true, decode: fiberIdDecode, encode: fiberIdEncode }
).annotations({ identifier: "FiberId" }) {}

/**
 * @category Cause utils
 * @since 0.69.0
 */
export type CauseEncoded<E, D> =
  | {
    readonly _tag: "Empty"
  }
  | {
    readonly _tag: "Fail"
    readonly error: E
  }
  | {
    readonly _tag: "Die"
    readonly defect: D
  }
  | {
    readonly _tag: "Interrupt"
    readonly fiberId: FiberIdEncoded
  }
  | {
    readonly _tag: "Sequential"
    readonly left: CauseEncoded<E, D>
    readonly right: CauseEncoded<E, D>
  }
  | {
    readonly _tag: "Parallel"
    readonly left: CauseEncoded<E, D>
    readonly right: CauseEncoded<E, D>
  }

const causeDieEncoded = <D, DI, R>(defect: Schema<D, DI, R>) =>
  Struct({
    _tag: Literal("Die"),
    defect
  })

const CauseEmptyEncoded = Struct({
  _tag: Literal("Empty")
})

const causeFailEncoded = <E, EI, R>(error: Schema<E, EI, R>) =>
  Struct({
    _tag: Literal("Fail"),
    error
  })

const CauseInterruptEncoded = Struct({
  _tag: Literal("Interrupt"),
  fiberId: FiberIdEncoded
})

const causeParallelEncoded = <E, EI, D, DI, R>(causeEncoded: Schema<CauseEncoded<E, D>, CauseEncoded<EI, DI>, R>) =>
  Struct({
    _tag: Literal("Parallel"),
    left: causeEncoded,
    right: causeEncoded
  })

const causeSequentialEncoded = <E, EI, D, DI, R>(causeEncoded: Schema<CauseEncoded<E, D>, CauseEncoded<EI, DI>, R>) =>
  Struct({
    _tag: Literal("Sequential"),
    left: causeEncoded,
    right: causeEncoded
  })

const causeEncoded = <E, EI, D, DI, R1, R2>(
  error: Schema<E, EI, R1>,
  defect: Schema<D, DI, R2>
): Schema<CauseEncoded<E, D>, CauseEncoded<EI, DI>, R1 | R2> => {
  const recur = suspend(() => out)
  const out: Schema<CauseEncoded<E, D>, CauseEncoded<EI, DI>, R1 | R2> = Union(
    CauseEmptyEncoded,
    causeFailEncoded(error),
    causeDieEncoded(defect),
    CauseInterruptEncoded,
    causeSequentialEncoded(recur),
    causeParallelEncoded(recur)
  ).annotations({ title: `CauseEncoded<${format(error)}>` })
  return out
}

const causeArbitrary = <E>(
  error: LazyArbitrary<E>,
  defect: LazyArbitrary<unknown>
): LazyArbitrary<cause_.Cause<E>> =>
(fc) =>
  fc.letrec((tie) => ({
    Empty: fc.record({ _tag: fc.constant("Empty" as const) }),
    Fail: fc.record({ _tag: fc.constant("Fail" as const), error: error(fc) }),
    Die: fc.record({ _tag: fc.constant("Die" as const), defect: defect(fc) }),
    Interrupt: fc.record({ _tag: fc.constant("Interrupt" as const), fiberId: fiberIdArbitrary(fc) }),
    Sequential: fc.record({ _tag: fc.constant("Sequential" as const), left: tie("Cause"), right: tie("Cause") }),
    Parallel: fc.record({ _tag: fc.constant("Parallel" as const), left: tie("Cause"), right: tie("Cause") }),
    Cause: fc.oneof(
      tie("Empty"),
      tie("Fail"),
      tie("Die"),
      tie("Interrupt"),
      tie("Sequential"),
      tie("Parallel")
    ) as any as fastCheck_.Arbitrary<cause_.Cause<E>>
  })).Cause.map(causeDecode)

const causePretty = <E>(error: pretty_.Pretty<E>): pretty_.Pretty<cause_.Cause<E>> => (cause) => {
  const f = (cause: cause_.Cause<E>): string => {
    switch (cause._tag) {
      case "Empty":
        return "Cause.empty"
      case "Fail":
        return `Cause.fail(${error(cause.error)})`
      case "Die":
        return `Cause.die(${cause_.pretty(cause)})`
      case "Interrupt":
        return `Cause.interrupt(${fiberIdPretty(cause.fiberId)})`
      case "Sequential":
        return `Cause.sequential(${f(cause.left)}, ${f(cause.right)})`
      case "Parallel":
        return `Cause.parallel(${f(cause.left)}, ${f(cause.right)})`
    }
  }
  return f(cause)
}

const causeParse = <A, D, R>(
  decodeUnknown: ParseResult.DecodeUnknown<CauseEncoded<A, D>, R>
): ParseResult.DeclarationDecodeUnknown<cause_.Cause<A>, R> =>
(u, options, ast) =>
  cause_.isCause(u) ?
    toComposite(decodeUnknown(causeEncode(u), options), causeDecode, ast, u)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.69.0
 */
export interface CauseFromSelf<E extends Schema.All, D extends Schema.All> extends
  AnnotableClass<
    CauseFromSelf<E, D>,
    cause_.Cause<Schema.Type<E>>,
    cause_.Cause<Schema.Encoded<E>>,
    Schema.Context<E> | Schema.Context<D>
  >
{}

/**
 * @category Cause transformations
 * @since 0.69.0
 */
export const CauseFromSelf = <E extends Schema.All, D extends Schema.All>({ defect, error }: {
  readonly error: E
  readonly defect: D
}): CauseFromSelf<E, D> => {
  return declare(
    [error, defect],
    {
      decode: (error, defect) => causeParse(ParseResult.decodeUnknown(causeEncoded(error, defect))),
      encode: (error, defect) => causeParse(ParseResult.encodeUnknown(causeEncoded(error, defect)))
    },
    {
      title: `Cause<${error.ast}>`,
      pretty: causePretty,
      arbitrary: causeArbitrary
    }
  )
}

function causeDecode<E>(cause: CauseEncoded<E, unknown>): cause_.Cause<E> {
  switch (cause._tag) {
    case "Empty":
      return cause_.empty
    case "Fail":
      return cause_.fail(cause.error)
    case "Die":
      return cause_.die(cause.defect)
    case "Interrupt":
      return cause_.interrupt(fiberIdDecode(cause.fiberId))
    case "Sequential":
      return cause_.sequential(causeDecode(cause.left), causeDecode(cause.right))
    case "Parallel":
      return cause_.parallel(causeDecode(cause.left), causeDecode(cause.right))
  }
}

function causeEncode<E>(cause: cause_.Cause<E>): CauseEncoded<E, unknown> {
  switch (cause._tag) {
    case "Empty":
      return { _tag: "Empty" }
    case "Fail":
      return { _tag: "Fail", error: cause.error }
    case "Die":
      return { _tag: "Die", defect: cause.defect }
    case "Interrupt":
      return { _tag: "Interrupt", fiberId: cause.fiberId }
    case "Sequential":
      return {
        _tag: "Sequential",
        left: causeEncode(cause.left),
        right: causeEncode(cause.right)
      }
    case "Parallel":
      return {
        _tag: "Parallel",
        left: causeEncode(cause.left),
        right: causeEncode(cause.right)
      }
  }
}

/**
 * @category api interface
 * @since 0.69.0
 */
export interface Cause<E extends Schema.All, D extends Schema.All> extends
  AnnotableClass<
    Cause<E, D>,
    cause_.Cause<Schema.Type<E>>,
    CauseEncoded<Schema.Encoded<E>, Schema.Encoded<D>>,
    Schema.Context<E> | Schema.Context<D>
  >
{}

/**
 * @category Cause transformations
 * @since 0.69.0
 */
export const Cause = <E extends Schema.All, D extends Schema.All>({ defect, error }: {
  readonly error: E
  readonly defect: D
}): Cause<E, D> => {
  const error_ = asSchema(error)
  const defect_ = asSchema(defect)
  return transform(
    causeEncoded(error_, defect_),
    CauseFromSelf({ error: typeSchema(error_), defect: Unknown }),
    { strict: false, decode: causeDecode, encode: causeEncode }
  )
}

/**
 * @category api interface
 * @since 0.69.0
 */
export interface Defect extends transform<typeof Unknown, typeof Unknown> {}

/**
 * Defines a schema for handling JavaScript errors (`Error` instances) and other types of defects.
 * It decodes objects into Error instances if they match the expected structure (i.e., have a `message` and optionally a `name` and `stack`),
 * or converts other values to their string representations.
 *
 * When encoding, it converts `Error` instances back into plain objects containing only the error's name and message,
 * or other values into their string forms.
 *
 * This is useful for serializing and deserializing errors across network boundaries where error objects do not natively serialize.
 *
 * @category defect
 * @since 0.69.0
 */
export const Defect: Defect = transform(
  Unknown,
  Unknown,
  {
    strict: true,
    decode: (u) => {
      if (Predicate.isObject(u) && "message" in u && typeof u.message === "string") {
        const err = new Error(u.message, { cause: u })
        if ("name" in u && typeof u.name === "string") {
          err.name = u.name
        }
        err.stack = "stack" in u && typeof u.stack === "string" ? u.stack : ""
        return err
      }
      return String(u)
    },
    encode: (defect) => {
      if (defect instanceof Error) {
        return {
          name: defect.name,
          message: defect.message
          // no stack because of security reasons
        }
      }
      return String(defect)
    }
  }
).annotations({ identifier: "Defect" })

/**
 * @category Exit utils
 * @since 0.69.0
 */
export type ExitEncoded<A, E, D> =
  | {
    readonly _tag: "Failure"
    readonly cause: CauseEncoded<E, D>
  }
  | {
    readonly _tag: "Success"
    readonly value: A
  }

const exitFailureEncoded = <E, EI, ER, D, DI, DR>(
  error: Schema<E, EI, ER>,
  defect: Schema<D, DI, DR>
) =>
  Struct({
    _tag: Literal("Failure"),
    cause: causeEncoded(error, defect)
  })

const exitSuccessEncoded = <A, I, R>(
  value: Schema<A, I, R>
) =>
  Struct({
    _tag: Literal("Success"),
    value
  })

const exitEncoded = <A, I, R, E, EI, ER, D, DI, DR>(
  value: Schema<A, I, R>,
  error: Schema<E, EI, ER>,
  defect: Schema<D, DI, DR>
): Schema<ExitEncoded<A, E, D>, ExitEncoded<I, EI, DI>, R | ER | DR> =>
  Union(
    exitFailureEncoded(error, defect),
    exitSuccessEncoded(value)
  ).annotations({
    title: `ExitEncoded<${format(value)}, ${format(error)}, ${format(defect)}>`
  })

const exitDecode = <A, E>(input: ExitEncoded<A, E, unknown>): exit_.Exit<A, E> => {
  switch (input._tag) {
    case "Failure":
      return exit_.failCause(causeDecode(input.cause))
    case "Success":
      return exit_.succeed(input.value)
  }
}

const exitArbitrary = <A, E>(
  value: LazyArbitrary<A>,
  error: LazyArbitrary<E>,
  defect: LazyArbitrary<unknown>
): LazyArbitrary<exit_.Exit<A, E>> =>
(fc) =>
  fc.oneof(
    fc.record({ _tag: fc.constant("Failure" as const), cause: causeArbitrary(error, defect)(fc) }),
    fc.record({ _tag: fc.constant("Success" as const), value: value(fc) })
  ).map(exitDecode)

const exitPretty =
  <A, E>(value: pretty_.Pretty<A>, error: pretty_.Pretty<E>): pretty_.Pretty<exit_.Exit<A, E>> => (exit) =>
    exit._tag === "Failure"
      ? `Exit.failCause(${causePretty(error)(exit.cause)})`
      : `Exit.succeed(${value(exit.value)})`

const exitParse = <A, R, E, ER>(
  decodeUnknownValue: ParseResult.DecodeUnknown<A, R>,
  decodeUnknownCause: ParseResult.DecodeUnknown<cause_.Cause<E>, ER>
): ParseResult.DeclarationDecodeUnknown<exit_.Exit<A, E>, ER | R> =>
(u, options, ast) =>
  exit_.isExit(u) ?
    exit_.match(u, {
      onFailure: (cause) => toComposite(decodeUnknownCause(cause, options), exit_.failCause, ast, u),
      onSuccess: (value) => toComposite(decodeUnknownValue(value, options), exit_.succeed, ast, u)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.69.0
 */
export interface ExitFromSelf<A extends Schema.All, E extends Schema.All, D extends Schema.All> extends
  AnnotableClass<
    ExitFromSelf<A, E, D>,
    exit_.Exit<Schema.Type<A>, Schema.Type<E>>,
    exit_.Exit<Schema.Encoded<A>, Schema.Encoded<E>>,
    Schema.Context<A> | Schema.Context<E> | Schema.Context<D>
  >
{}

/**
 * @category Exit transformations
 * @since 0.69.0
 */
export const ExitFromSelf = <A extends Schema.All, E extends Schema.All, D extends Schema.All>(
  { defect, failure, success }: {
    readonly failure: E
    readonly success: A
    readonly defect: D
  }
): ExitFromSelf<A, E, D> =>
  declare(
    [success, failure, defect],
    {
      decode: (success, failure, defect) =>
        exitParse(
          ParseResult.decodeUnknown(success),
          ParseResult.decodeUnknown(CauseFromSelf({ error: failure, defect }))
        ),
      encode: (success, failure, defect) =>
        exitParse(
          ParseResult.encodeUnknown(success),
          ParseResult.encodeUnknown(CauseFromSelf({ error: failure, defect }))
        )
    },
    {
      title: `Exit<${success.ast}, ${failure.ast}>`,
      pretty: exitPretty,
      arbitrary: exitArbitrary
    }
  )

/**
 * @category api interface
 * @since 0.69.0
 */
export interface Exit<A extends Schema.All, E extends Schema.All, D extends Schema.All> extends
  AnnotableClass<
    Exit<A, E, D>,
    exit_.Exit<Schema.Type<A>, Schema.Type<E>>,
    ExitEncoded<Schema.Encoded<A>, Schema.Encoded<E>, Schema.Encoded<D>>,
    Schema.Context<A> | Schema.Context<E> | Schema.Context<D>
  >
{}

/**
 * @category Exit transformations
 * @since 0.69.0
 */
export const Exit = <A extends Schema.All, E extends Schema.All, D extends Schema.All>(
  { defect, failure, success }: {
    readonly failure: E
    readonly success: A
    readonly defect: D
  }
): Exit<A, E, D> => {
  const success_ = asSchema(success)
  const failure_ = asSchema(failure)
  const defect_ = asSchema(defect)
  return transform(
    exitEncoded(success_, failure_, defect_),
    ExitFromSelf({ failure: typeSchema(failure_), success: typeSchema(success_), defect: Unknown }),
    {
      strict: false,
      decode: exitDecode,
      encode: (exit) =>
        exit._tag === "Failure"
          ? { _tag: "Failure", cause: exit.cause } as const
          : { _tag: "Success", value: exit.value } as const
    }
  )
}

const hashSetArbitrary = <A>(item: LazyArbitrary<A>): LazyArbitrary<hashSet_.HashSet<A>> => (fc) =>
  fc.array(item(fc)).map((as) => hashSet_.fromIterable(as))

const hashSetPretty = <A>(item: pretty_.Pretty<A>): pretty_.Pretty<hashSet_.HashSet<A>> => (set) =>
  `HashSet(${Array.from(set).map((a) => item(a)).join(", ")})`

const hashSetEquivalence = <A>(
  item: Equivalence.Equivalence<A>
): Equivalence.Equivalence<hashSet_.HashSet<A>> => {
  const arrayEquivalence = array_.getEquivalence(item)
  return Equivalence.make((a, b) => arrayEquivalence(Array.from(a), Array.from(b)))
}

const hashSetParse = <A, R>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<hashSet_.HashSet<A>, R> =>
(u, options, ast) =>
  hashSet_.isHashSet(u) ?
    toComposite(decodeUnknown(Array.from(u), options), hashSet_.fromIterable, ast, u)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface HashSetFromSelf<Value extends Schema.Any> extends
  AnnotableClass<
    HashSetFromSelf<Value>,
    hashSet_.HashSet<Schema.Type<Value>>,
    hashSet_.HashSet<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category HashSet transformations
 * @since 0.67.0
 */
export const HashSetFromSelf = <Value extends Schema.Any>(
  value: Value
): HashSetFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (item) => hashSetParse(ParseResult.decodeUnknown(Array$(item))),
      encode: (item) => hashSetParse(ParseResult.encodeUnknown(Array$(item)))
    },
    {
      description: `HashSet<${format(value)}>`,
      pretty: hashSetPretty,
      arbitrary: hashSetArbitrary,
      equivalence: hashSetEquivalence
    }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface HashSet<Value extends Schema.Any> extends
  AnnotableClass<
    HashSet<Value>,
    hashSet_.HashSet<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category HashSet transformations
 * @since 0.67.0
 */
export const HashSet = <Value extends Schema.Any>(value: Value): HashSet<Value> => {
  const value_ = asSchema(value)
  return transform(
    Array$(value_),
    HashSetFromSelf(typeSchema(value_)),
    { strict: true, decode: (as) => hashSet_.fromIterable(as), encode: (set) => Array.from(set) }
  )
}

const hashMapArbitrary = <K, V>(
  key: LazyArbitrary<K>,
  value: LazyArbitrary<V>
): LazyArbitrary<hashMap_.HashMap<K, V>> =>
(fc) => fc.array(fc.tuple(key(fc), value(fc))).map((as) => hashMap_.fromIterable(as))

const hashMapPretty = <K, V>(
  key: pretty_.Pretty<K>,
  value: pretty_.Pretty<V>
): pretty_.Pretty<hashMap_.HashMap<K, V>> =>
(map) =>
  `HashMap([${
    Array.from(map)
      .map(([k, v]) => `[${key(k)}, ${value(v)}]`)
      .join(", ")
  }])`

const hashMapEquivalence = <K, V>(
  key: Equivalence.Equivalence<K>,
  value: Equivalence.Equivalence<V>
): Equivalence.Equivalence<hashMap_.HashMap<K, V>> => {
  const arrayEquivalence = array_.getEquivalence(
    Equivalence.make<[K, V]>(([ka, va], [kb, vb]) => key(ka, kb) && value(va, vb))
  )
  return Equivalence.make((a, b) => arrayEquivalence(Array.from(a), Array.from(b)))
}

const hashMapParse = <R, K, V>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<readonly [K, V]>, R>
): ParseResult.DeclarationDecodeUnknown<hashMap_.HashMap<K, V>, R> =>
(u, options, ast) =>
  hashMap_.isHashMap(u) ?
    toComposite(decodeUnknown(Array.from(u), options), hashMap_.fromIterable, ast, u)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface HashMapFromSelf<K extends Schema.Any, V extends Schema.Any> extends
  AnnotableClass<
    HashMapFromSelf<K, V>,
    hashMap_.HashMap<Schema.Type<K>, Schema.Type<V>>,
    hashMap_.HashMap<Schema.Encoded<K>, Schema.Encoded<V>>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category HashMap transformations
 * @since 0.67.0
 */
export const HashMapFromSelf = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): HashMapFromSelf<K, V> => {
  return declare(
    [key, value],
    {
      decode: (key, value) => hashMapParse(ParseResult.decodeUnknown(Array$(Tuple(key, value)))),
      encode: (key, value) => hashMapParse(ParseResult.encodeUnknown(Array$(Tuple(key, value))))
    },
    {
      description: `HashMap<${format(key)}, ${format(value)}>`,
      pretty: hashMapPretty,
      arbitrary: hashMapArbitrary,
      equivalence: hashMapEquivalence
    }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface HashMap<K extends Schema.Any, V extends Schema.Any> extends
  AnnotableClass<
    HashMap<K, V>,
    hashMap_.HashMap<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyArray<readonly [Schema.Encoded<K>, Schema.Encoded<V>]>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category HashMap transformations
 * @since 0.67.0
 */
export const HashMap = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): HashMap<K, V> => {
  const key_ = asSchema(key)
  const value_ = asSchema(value)
  return transform(
    Array$(Tuple(key_, value_)),
    HashMapFromSelf({ key: typeSchema(key_), value: typeSchema(value_) }),
    { strict: true, decode: (as) => hashMap_.fromIterable(as), encode: (map) => Array.from(map) }
  )
}

const listArbitrary = <A>(item: LazyArbitrary<A>): LazyArbitrary<list_.List<A>> => (fc) =>
  fc.array(item(fc)).map((as) => list_.fromIterable(as))

const listPretty = <A>(item: pretty_.Pretty<A>): pretty_.Pretty<list_.List<A>> => (set) =>
  `List(${Array.from(set).map((a) => item(a)).join(", ")})`

const listEquivalence = <A>(
  item: Equivalence.Equivalence<A>
): Equivalence.Equivalence<list_.List<A>> => {
  const arrayEquivalence = array_.getEquivalence(item)
  return Equivalence.make((a, b) => arrayEquivalence(Array.from(a), Array.from(b)))
}

const listParse = <A, R>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<list_.List<A>, R> =>
(u, options, ast) =>
  list_.isList(u) ?
    toComposite(decodeUnknown(Array.from(u), options), list_.fromIterable, ast, u)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface ListFromSelf<Value extends Schema.Any> extends
  AnnotableClass<
    ListFromSelf<Value>,
    list_.List<Schema.Type<Value>>,
    list_.List<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category List transformations
 * @since 0.67.0
 */
export const ListFromSelf = <Value extends Schema.Any>(
  value: Value
): ListFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (item) => listParse(ParseResult.decodeUnknown(Array$(item))),
      encode: (item) => listParse(ParseResult.encodeUnknown(Array$(item)))
    },
    {
      description: `List<${format(value)}>`,
      pretty: listPretty,
      arbitrary: listArbitrary,
      equivalence: listEquivalence
    }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface List<Value extends Schema.Any> extends
  AnnotableClass<
    List<Value>,
    list_.List<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category List transformations
 * @since 0.67.0
 */
export const List = <Value extends Schema.Any>(value: Value): List<Value> => {
  const value_ = asSchema(value)
  return transform(
    Array$(value_),
    ListFromSelf(typeSchema(value_)),
    { strict: true, decode: (as) => list_.fromIterable(as), encode: (set) => Array.from(set) }
  )
}

const sortedSetArbitrary =
  <A>(item: LazyArbitrary<A>, ord: Order.Order<A>): LazyArbitrary<sortedSet_.SortedSet<A>> => (fc) =>
    fc.array(item(fc)).map((as) => sortedSet_.fromIterable(as, ord))

const sortedSetPretty = <A>(item: pretty_.Pretty<A>): pretty_.Pretty<sortedSet_.SortedSet<A>> => (set) =>
  `new SortedSet([${Array.from(sortedSet_.values(set)).map((a) => item(a)).join(", ")}])`

const sortedSetParse = <A, R>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>,
  ord: Order.Order<A>
): ParseResult.DeclarationDecodeUnknown<sortedSet_.SortedSet<A>, R> =>
(u, options, ast) =>
  sortedSet_.isSortedSet(u) ?
    toComposite(
      decodeUnknown(Array.from(sortedSet_.values(u)), options),
      (as): sortedSet_.SortedSet<A> => sortedSet_.fromIterable(as, ord),
      ast,
      u
    )
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 0.67.0
 */
export interface SortedSetFromSelf<Value extends Schema.Any> extends
  AnnotableClass<
    SortedSetFromSelf<Value>,
    sortedSet_.SortedSet<Schema.Type<Value>>,
    sortedSet_.SortedSet<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category SortedSet transformations
 * @since 0.67.0
 */
export const SortedSetFromSelf = <Value extends Schema.Any>(
  value: Value,
  ordA: Order.Order<Schema.Type<Value>>,
  ordI: Order.Order<Schema.Encoded<Value>>
): SortedSetFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (item) => sortedSetParse(ParseResult.decodeUnknown(Array$(item)), ordA),
      encode: (item) => sortedSetParse(ParseResult.encodeUnknown(Array$(item)), ordI)
    },
    {
      description: `SortedSet<${format(value)}>`,
      pretty: sortedSetPretty,
      arbitrary: (arb) => sortedSetArbitrary(arb, ordA),
      equivalence: () => sortedSet_.getEquivalence<Schema.Type<Value>>()
    }
  )
}

/**
 * @category api interface
 * @since 0.67.0
 */
export interface SortedSet<Value extends Schema.Any> extends
  AnnotableClass<
    SortedSet<Value>,
    sortedSet_.SortedSet<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category SortedSet transformations
 * @since 0.67.0
 */
export const SortedSet = <Value extends Schema.Any>(
  value: Value,
  ordA: Order.Order<Schema.Type<Value>>
): SortedSet<Value> => {
  const value_ = asSchema(value)
  const to = typeSchema(value_)
  return transform(
    Array$(value_),
    SortedSetFromSelf<typeof to>(to, ordA, ordA),
    {
      strict: true,
      decode: (as) => sortedSet_.fromIterable(as, ordA),
      encode: (set) => Array.from(sortedSet_.values(set))
    }
  )
}

/**
 * Converts an arbitrary value to a `boolean` by testing whether it is truthy.
 * Uses `!!val` to coerce the value to a `boolean`.
 *
 * @see https://developer.mozilla.org/docs/Glossary/Truthy
 * @category boolean constructors
 * @since 0.67.0
 */
export class BooleanFromUnknown extends transform(
  Unknown,
  Boolean$,
  { strict: true, decode: Predicate.isTruthy, encode: identity }
).annotations({ identifier: "BooleanFromUnknown" }) {}

/**
 * @category Config validations
 * @since 0.67.12
 */
export const Config = <A>(name: string, schema: Schema<A, string>): config_.Config<A> => {
  const decodeEither_ = decodeEither(schema)
  return config_.string(name).pipe(
    config_.mapOrFail((a) =>
      decodeEither_(a).pipe(
        either_.mapLeft((error) => configError_.InvalidData([], TreeFormatter.formatErrorSync(error)))
      )
    )
  )
}
