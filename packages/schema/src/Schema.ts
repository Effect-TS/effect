/**
 * @since 1.0.0
 */

import * as array_ from "effect/Array"
import * as bigDecimal_ from "effect/BigDecimal"
import * as bigInt_ from "effect/BigInt"
import * as boolean_ from "effect/Boolean"
import * as brand_ from "effect/Brand"
import * as cause_ from "effect/Cause"
import * as chunk_ from "effect/Chunk"
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
import * as Request from "effect/Request"
import * as secret_ from "effect/Secret"
import * as sortedSet_ from "effect/SortedSet"
import * as string_ from "effect/String"
import type * as Types from "effect/Types"
import type { LazyArbitrary } from "./Arbitrary.js"
import * as arbitrary_ from "./Arbitrary.js"
import type { ParseOptions } from "./AST.js"
import * as AST from "./AST.js"
import * as equivalence_ from "./Equivalence.js"
import type * as fastCheck_ from "./FastCheck.js"
import * as errors_ from "./internal/errors.js"
import * as filters_ from "./internal/filters.js"
import * as serializable_ from "./internal/serializable.js"
import * as util_ from "./internal/util.js"
import * as ParseResult from "./ParseResult.js"
import * as pretty_ from "./Pretty.js"
import type * as Serializable from "./Serializable.js"
import * as TreeFormatter from "./TreeFormatter.js"

/**
 * @since 1.0.0
 */
export type SimplifyMutable<A> = {
  -readonly [K in keyof A]: A[K]
} extends infer B ? B : never

/**
 * @since 1.0.0
 * @category symbol
 */
export const TypeId: unique symbol = Symbol.for("@effect/schema/Schema")

/**
 * @since 1.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @category model
 * @since 1.0.0
 */
export interface Schema<in out A, in out I = A, out R = never> extends Schema.Variance<A, I, R>, Pipeable {
  readonly ast: AST.AST
  annotations(annotations: Annotations.Schema<A>): Schema<A, I, R>
}

const variance = {
  /* c8 ignore next */
  _A: (_: any) => _,
  /* c8 ignore next */
  _I: (_: any) => _,
  /* c8 ignore next */
  _R: (_: never) => _
}

const toASTAnnotations = (
  annotations?: Record<string | symbol, any> | undefined
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

  return out
}

class SchemaImpl<in out A, in out I = A, out R = never> implements Schema.Variance<A, I, R>, Pipeable {
  readonly [TypeId] = variance
  constructor(readonly ast: AST.AST) {}
  pipe() {
    return pipeArguments(this, arguments)
  }
  annotations(annotations: Annotations.Schema<A>): Schema<A, I, R> {
    return new SchemaImpl(AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
  toString() {
    return String(this.ast)
  }
}

/**
 * @category annotations
 * @since 1.0.0
 */
export declare namespace Annotable {
  /**
   * @since 1.0.0
   */
  export type Self<S extends All> = ReturnType<S["annotations"]>

  /**
   * @since 1.0.0
   */
  export type Any = Annotable<any, any, any, unknown>

  /**
   * @since 1.0.0
   */
  export type All =
    | Any
    | Annotable<any, any, never, unknown>
    | Annotable<any, never, any, unknown>
    | Annotable<any, never, never, unknown>
}

/**
 * @category annotations
 * @since 1.0.0
 */
export interface Annotable<Self extends Schema<A, I, R>, A, I = A, R = never> extends Schema<A, I, R> {
  annotations(annotations: Annotations.Schema<A>): Self
}

/**
 * @since 1.0.0
 */
export const asSchema = <S extends Schema.All>(
  schema: S
): Schema<Schema.Type<S>, Schema.Encoded<S>, Schema.Context<S>> => schema as any

/**
 * @category hashing
 * @since 1.0.0
 */
export const hash = <A, I, R>(schema: Schema<A, I, R>): number => AST.hash(schema.ast)

/**
 * @category formatting
 * @since 1.0.0
 */
export const format = <A, I, R>(schema: Schema<A, I, R>): string => String(schema.ast)

/**
 * @since 1.0.0
 */
export declare namespace Schema {
  /**
   * @since 1.0.0
   */
  export interface Variance<A, I, R> {
    readonly [TypeId]: {
      readonly _A: Types.Invariant<A>
      readonly _I: Types.Invariant<I>
      readonly _R: Types.Covariant<R>
    }
  }

  /**
   * @since 1.0.0
   */
  export type Type<S> = S extends Schema.Variance<infer A, infer _I, infer _R> ? A : never

  /**
   * @since 1.0.0
   */
  export type Encoded<S> = S extends Schema.Variance<infer _A, infer I, infer _R> ? I : never

  /**
   * @since 1.0.0
   */
  export type Context<S> = S extends Schema.Variance<infer _A, infer _I, infer R> ? R : never

  /**
   * @since 1.0.0
   */
  export type ToAsserts<S extends AnyNoContext> = (
    input: unknown,
    options?: AST.ParseOptions
  ) => asserts input is Schema.Type<S>

  /**
   * Any schema, except for `never`.
   *
   * @since 1.0.0
   */
  export type Any = Schema<any, any, unknown>

  /**
   * Any schema with `Context = never`, except for `never`.
   *
   * @since 1.0.0
   */
  export type AnyNoContext = Schema<any, any, never>

  /**
   * Any schema, including `never`.
   *
   * @since 1.0.0
   */
  export type All =
    | Any
    | Schema<any, never, unknown>
    | Schema<never, any, unknown>
    | Schema<never, never, unknown>
}

/**
 * @since 1.0.0
 */
export const encodedSchema = <A, I, R>(schema: Schema<A, I, R>): Schema<I> => make(AST.encodedAST(schema.ast))

/**
 * @since 1.0.0
 */
export const typeSchema = <A, I, R>(schema: Schema<A, I, R>): Schema<A> => make(AST.typeAST(schema.ast))

/* c8 ignore start */
export {
  /**
   * @category validation
   * @since 1.0.0
   */
  asserts,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeOption,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeSync,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeUnknownOption,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeUnknownSync,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeOption,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeSync,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeUnknownOption,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeUnknownSync,
  /**
   * @category validation
   * @since 1.0.0
   */
  is,
  /**
   * @category validation
   * @since 1.0.0
   */
  validateOption,
  /**
   * @category validation
   * @since 1.0.0
   */
  validateSync
} from "./ParseResult.js"
/* c8 ignore end */

/**
 * @category encoding
 * @since 1.0.0
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
 * @since 1.0.0
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
 * @since 1.0.0
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
 * @since 1.0.0
 */
export const encode: <A, I, R>(
  schema: Schema<A, I, R>,
  options?: ParseOptions
) => (a: A, overrideOptions?: ParseOptions) => Effect.Effect<I, ParseResult.ParseError, R> = encodeUnknown

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeEither: <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => (a: A, overrideOptions?: ParseOptions) => either_.Either<I, ParseResult.ParseError> = encodeUnknownEither

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodePromise: <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => (a: A, overrideOptions?: ParseOptions) => Promise<I> = encodeUnknownPromise

/**
 * @category decoding
 * @since 1.0.0
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
 * @since 1.0.0
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
 * @since 1.0.0
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
 * @since 1.0.0
 */
export const decode: <A, I, R>(
  schema: Schema<A, I, R>,
  options?: ParseOptions
) => (i: I, overrideOptions?: ParseOptions) => Effect.Effect<A, ParseResult.ParseError, R> = decodeUnknown

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeEither: <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => (i: I, overrideOptions?: ParseOptions) => either_.Either<A, ParseResult.ParseError> = decodeUnknownEither

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodePromise: <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => (i: I, overrideOptions?: ParseOptions) => Promise<A> = decodeUnknownPromise

/**
 * @category validation
 * @since 1.0.0
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
 * @since 1.0.0
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
 * @since 1.0.0
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
 * @since 1.0.0
 */
export const isSchema = (u: unknown): u is Schema.Any =>
  Predicate.hasProperty(u, TypeId) && Predicate.isObject(u[TypeId])

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <A, I = A, R = never>(ast: AST.AST): Schema<A, I, R> => new SchemaImpl(ast)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Literal<Literals extends array_.NonEmptyReadonlyArray<AST.LiteralValue>>
  extends Annotable<Literal<Literals>, Literals[number]>
{
  readonly literals: Readonly<Literals>
}

class LiteralImpl<Literals extends array_.NonEmptyReadonlyArray<AST.LiteralValue>> extends SchemaImpl<Literals[number]>
  implements Literal<Literals>
{
  static ast = <Literals extends array_.NonEmptyReadonlyArray<AST.LiteralValue>>(
    literals: Literals
  ): AST.AST => {
    return AST.isMembers(literals)
      ? AST.Union.make(AST.mapMembers(literals, (literal) => new AST.Literal(literal)))
      : new AST.Literal(literals[0])
  }
  readonly literals: Literals
  constructor(literals: Literals, ast: AST.AST = LiteralImpl.ast(literals)) {
    super(ast)
    this.literals = [...literals]
  }
  annotations(annotations: Annotations.Schema<Literals[number]>) {
    return new LiteralImpl(this.literals, AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
}

/**
 * @category constructors
 * @since 1.0.0
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
  return array_.isNonEmptyReadonlyArray(literals) ? new LiteralImpl(literals) : Never
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
 * @since 1.0.0
 */
export const pickLiteral =
  <A extends AST.LiteralValue, L extends array_.NonEmptyReadonlyArray<A>>(...literals: L) =>
  <I, R>(_schema: Schema<A, I, R>): Literal<[...L]> => Literal(...literals)

/**
 * @category constructors
 * @since 1.0.0
 */
export const UniqueSymbolFromSelf = <S extends symbol>(symbol: S): Schema<S> => make(new AST.UniqueSymbol(symbol))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Enums<A extends { [x: string]: string | number }> extends Annotable<Enums<A>, A[keyof A]> {
  readonly enums: A
}

class EnumsImpl<A extends { [x: string]: string | number }> extends SchemaImpl<A[keyof A]> implements Enums<A> {
  static ast = <A extends { [x: string]: string | number }>(enums: A): AST.AST => {
    return new AST.Enums(
      Object.keys(enums).filter(
        (key) => typeof enums[enums[key]] !== "number"
      ).map((key) => [key, enums[key]])
    )
  }
  constructor(readonly enums: A, ast: AST.AST = EnumsImpl.ast(enums)) {
    super(ast)
  }
  annotations(annotations: Annotations.Schema<A[keyof A]>) {
    return new EnumsImpl(this.enums, AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const Enums = <A extends { [x: string]: string | number }>(enums: A): Enums<A> => new EnumsImpl(enums)

type Join<T> = T extends [infer Head, ...infer Tail]
  ? `${Head & (string | number | bigint | boolean | null | undefined)}${Tail extends [] ? ""
    : Join<Tail>}`
  : never

/**
 * @category constructors
 * @since 1.0.0
 */
export const TemplateLiteral = <T extends [Schema.AnyNoContext, ...Array<Schema.AnyNoContext>]>(
  ...[head, ...tail]: T
): Schema<Join<{ [K in keyof T]: Schema.Type<T[K]> }>> => {
  let types: ReadonlyArray<AST.TemplateLiteral | AST.Literal> = getTemplateLiterals(head.ast)
  for (const span of tail) {
    types = array_.flatMap(
      types,
      (a) => getTemplateLiterals(span.ast).map((b) => combineTemplateLiterals(a, b))
    )
  }
  return make(AST.Union.make(types))
}

const combineTemplateLiterals = (
  a: AST.TemplateLiteral | AST.Literal,
  b: AST.TemplateLiteral | AST.Literal
): AST.TemplateLiteral | AST.Literal => {
  if (AST.isLiteral(a)) {
    return AST.isLiteral(b) ?
      new AST.Literal(String(a.literal) + String(b.literal)) :
      AST.TemplateLiteral.make(String(a.literal) + b.head, b.spans)
  }
  if (AST.isLiteral(b)) {
    return AST.TemplateLiteral.make(
      a.head,
      array_.modifyNonEmptyLast(
        a.spans,
        (span) => new AST.TemplateLiteralSpan(span.type, span.literal + String(b.literal))
      )
    )
  }
  return AST.TemplateLiteral.make(
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
): ReadonlyArray<AST.TemplateLiteral | AST.Literal> => {
  switch (ast._tag) {
    case "Literal":
      return [ast]
    case "NumberKeyword":
    case "StringKeyword":
      return [AST.TemplateLiteral.make("", [new AST.TemplateLiteralSpan(ast, "")])]
    case "Union":
      return array_.flatMap(ast.types, getTemplateLiterals)
    default:
      throw new Error(`unsupported template literal span (${ast})`)
  }
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
): Schema<A, I, Schema.Context<TypeParameters[number]>> =>
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
): Schema<A> => {
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
 * @since 1.0.0
 */
export const declare: {
  <A>(
    is: (input: unknown) => input is A,
    annotations?: Annotations.Schema<A>
  ): Schema<A>
  <const P extends ReadonlyArray<Schema.Any>, I, A>(
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
  ): Schema<A, I, Schema.Context<P[number]>>
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
 * @since 1.0.0
 */
export const BrandTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Brand")

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromBrand = <C extends brand_.Brand<string | symbol>>(
  constructor: brand_.Brand.Constructor<C>,
  annotations?: Annotations.Filter<brand_.Brand.Unbranded<C>>
) =>
<R, I, A extends brand_.Brand.Unbranded<C>>(self: Schema<A, I, R>): Schema<A & C, I, R> =>
  make(
    new AST.Refinement(
      self.ast,
      (a: A, _: ParseOptions, ast: AST.AST): option_.Option<ParseResult.ParseIssue> => {
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
 * @since 1.0.0
 */
export const InstanceOfTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/InstanceOf")

/**
 * @category api interface
 * @since 1.0.0
 */
export interface instanceOf<A> extends Annotable<instanceOf<A>, A> {}

/**
 * @category constructors
 * @since 1.0.0
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
 * @category api interface
 * @since 1.0.0
 */
export interface Undefined extends Annotable<Undefined, undefined> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const Undefined: Undefined = make(AST.undefinedKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Void extends Annotable<Void, void> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const Void: Void = make(AST.voidKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Null extends Annotable<Null, null> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const Null: Null = make(AST.null)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Never extends Annotable<Never, never> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const Never: Never = make(AST.neverKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Unknown extends Annotable<Unknown, unknown> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const Unknown: Unknown = make(AST.unknownKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Any extends Annotable<Any, any> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const Any: Any = make(AST.anyKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $String extends Annotable<$String, string> {}

const $String: $String = make(AST.stringKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $Number extends Annotable<$Number, number> {}

const $Number: $Number = make(AST.numberKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $Boolean extends Annotable<$Boolean, boolean> {}

const $Boolean: $Boolean = make(AST.booleanKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BigIntFromSelf extends Annotable<BigIntFromSelf, bigint> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const BigIntFromSelf: BigIntFromSelf = make(AST.bigIntKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface SymbolFromSelf extends Annotable<SymbolFromSelf, symbol> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const SymbolFromSelf: SymbolFromSelf = make(AST.symbolKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $Object extends Annotable<$Object, object> {}

const $Object: $Object = make(AST.objectKeyword)

export {
  /**
   * @category primitives
   * @since 1.0.0
   */
  $Boolean as Boolean,
  /**
   * @category primitives
   * @since 1.0.0
   */
  $Number as Number,
  /**
   * @category primitives
   * @since 1.0.0
   */
  $Object as Object,
  /**
   * @category primitives
   * @since 1.0.0
   */
  $String as String
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Union<Members extends ReadonlyArray<Schema.Any>> extends
  Schema<
    Schema.Type<Members[number]>,
    Schema.Encoded<Members[number]>,
    Schema.Context<Members[number]>
  >
{
  readonly members: Readonly<Members>
  annotations(annotations: Annotations.Schema<Schema.Type<Members[number]>>): Union<Members>
}

class UnionImpl<Members extends ReadonlyArray<Schema.Any>>
  extends SchemaImpl<Schema.Type<Members[number]>, Schema.Encoded<Members[number]>, Schema.Context<Members[number]>>
  implements Union<Members>
{
  static ast = <Members extends ReadonlyArray<Schema.Any>>(members: Members): AST.AST => {
    return AST.Union.members(members.map((m) => m.ast))
  }
  readonly members: Readonly<Members>
  constructor(members: Members, ast: AST.AST = UnionImpl.ast(members)) {
    super(ast)
    this.members = [...members] as any as Members
  }
  annotations(annotations: Annotations.Schema<Schema.Type<Members[number]>>) {
    return new UnionImpl(this.members, AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function Union<Members extends AST.Members<Schema.Any>>(...members: Members): Union<Members>
export function Union<Member extends Schema.Any>(member: Member): Member
export function Union(): Never
export function Union<Members extends ReadonlyArray<Schema.Any>>(
  ...members: Members
): Schema<Schema.Type<Members[number]>, Schema.Encoded<Members[number]>, Schema.Context<Members[number]>>
export function Union<Members extends ReadonlyArray<Schema.Any>>(
  ...members: Members
): Schema<Schema.Type<Members[number]>, Schema.Encoded<Members[number]>, Schema.Context<Members[number]>> | Never {
  return AST.isMembers(members)
    ? new UnionImpl(members)
    : array_.isNonEmptyReadonlyArray(members)
    ? members[0] as any
    : Never
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface NullOr<S extends Schema.Any> extends Union<[S, Null]> {
  annotations(annotations: Annotations.Schema<Schema.Type<S> | null>): NullOr<S>
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const NullOr = <S extends Schema.Any>(self: S): NullOr<S> => Union(self, Null)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface UndefinedOr<S extends Schema.Any> extends Union<[S, Undefined]> {
  annotations(annotations: Annotations.Schema<Schema.Type<S> | undefined>): UndefinedOr<S>
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const UndefinedOr = <S extends Schema.Any>(self: S): UndefinedOr<S> => Union(self, Undefined)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface NullishOr<S extends Schema.Any> extends Union<[S, Null, Undefined]> {
  annotations(annotations: Annotations.Schema<Schema.Type<S> | null | undefined>): NullishOr<S>
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const NullishOr = <S extends Schema.Any>(self: S): NullishOr<S> => Union(self, Null, Undefined)

/**
 * @category combinators
 * @since 1.0.0
 */
export const keyof = <A, I, R>(self: Schema<A, I, R>): Schema<keyof A> => make<keyof A>(AST.keyof(self.ast))

/**
 * @since 1.0.0
 */
export interface OptionalElement<E extends Schema.Any>
  extends Schema.Variance<Schema.Type<E>, Schema.Encoded<E>, Schema.Context<E>>
{
  readonly optionalElement: E
}

/**
 * @since 1.0.0
 */
export const optionalElement = <E extends Schema.Any>(self: E): OptionalElement<E> => new OptionalElementImpl(self)

class OptionalElementImpl<E extends Schema.Any> implements OptionalElement<E> {
  readonly [TypeId]!: Schema.Variance<Schema.Type<E>, Schema.Encoded<E>, Schema.Context<E>>[TypeId]
  constructor(readonly optionalElement: E) {}
  toString() {
    return `${this.optionalElement.ast}?`
  }
}

/**
 * @since 1.0.0
 */
export declare namespace TupleType {
  type ElementsType<
    Elements,
    Out extends ReadonlyArray<any> = readonly []
  > = Elements extends readonly [infer Head, ...infer Tail] ?
    Head extends OptionalElement<infer T> ? ElementsType<Tail, readonly [...Out, Schema.Type<T>?]>
    : ElementsType<Tail, readonly [...Out, Schema.Type<Head>]>
    : Out

  type ElementsEncoded<
    Elements,
    Out extends ReadonlyArray<any> = readonly []
  > = Elements extends readonly [infer Head, ...infer Tail] ?
    Head extends OptionalElement<infer T> ? ElementsEncoded<Tail, readonly [...Out, Schema.Encoded<T>?]>
    : ElementsEncoded<Tail, readonly [...Out, Schema.Encoded<Head>]>
    : Out

  /**
   * @since 1.0.0
   */
  export type Element = Schema.Any | OptionalElement<Schema.Any>

  /**
   * @since 1.0.0
   */
  export type Elements = ReadonlyArray<Element>

  /**
   * @since 1.0.0
   */
  export type Type<
    Elements extends TupleType.Elements,
    Rest extends ReadonlyArray<Schema.Any>
  > = Rest extends [infer Head, ...infer Tail] ? Readonly<[
      ...ElementsType<Elements>,
      ...ReadonlyArray<Schema.Type<Head>>,
      ...{ readonly [K in keyof Tail]: Schema.Type<Tail[K]> }
    ]> :
    ElementsType<Elements>

  /**
   * @since 1.0.0
   */
  export type Encoded<
    Elements extends TupleType.Elements,
    Rest extends ReadonlyArray<Schema.Any>
  > = Rest extends [infer Head, ...infer Tail] ? Readonly<[
      ...ElementsEncoded<Elements>,
      ...ReadonlyArray<Schema.Encoded<Head>>,
      ...{ readonly [K in keyof Tail]: Schema.Encoded<Tail[K]> }
    ]> :
    ElementsEncoded<Elements>
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface TupleType<
  Elements extends TupleType.Elements,
  Rest extends ReadonlyArray<Schema.Any>
> extends
  Schema<
    TupleType.Type<Elements, Rest>,
    TupleType.Encoded<Elements, Rest>,
    Schema.Context<Elements[number]> | Schema.Context<Rest[number]>
  >
{
  readonly elements: Readonly<Elements>
  readonly rest: Readonly<Rest>
  annotations(annotations: Annotations.Schema<TupleType.Type<Elements, Rest>>): TupleType<Elements, Rest>
}

class TupleTypeImpl<
  Elements extends TupleType.Elements,
  Rest extends ReadonlyArray<Schema.Any>
> extends SchemaImpl<
  TupleType.Type<Elements, Rest>,
  TupleType.Encoded<Elements, Rest>,
  Schema.Context<Elements[number]> | Schema.Context<Rest[number]>
> implements TupleType<Elements, Rest> {
  static ast = <
    Elements extends TupleType.Elements,
    Rest extends ReadonlyArray<Schema.Any>
  >(
    elements: Elements,
    rest: Rest
  ): AST.AST => {
    return new AST.TupleType(
      elements.map((schema) =>
        isSchema(schema) ? new AST.Element(schema.ast, false) : new AST.Element(schema.optionalElement.ast, true)
      ),
      rest.map((e) => e.ast),
      true
    )
  }
  constructor(
    readonly elements: Elements,
    readonly rest: Rest,
    ast: AST.AST = TupleTypeImpl.ast(elements, rest)
  ) {
    super(ast)
  }
  annotations(
    annotations: Annotations.Schema<TupleType.Type<Elements, Rest>>
  ): TupleType<Elements, Rest> {
    return new TupleTypeImpl(this.elements, this.rest, AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Tuple<Elements extends TupleType.Elements> extends TupleType<Elements, []> {
  annotations(annotations: Annotations.Schema<TupleType.Type<Elements, []>>): Tuple<Elements>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export function Tuple<
  const Elements extends TupleType.Elements,
  Rest extends array_.NonEmptyReadonlyArray<Schema.Any>
>(elements: Elements, ...rest: Rest): TupleType<Elements, Rest>
export function Tuple<Elements extends TupleType.Elements>(...elements: Elements): Tuple<Elements>
export function Tuple(...args: ReadonlyArray<any>): any {
  return Array.isArray(args[0])
    ? new TupleTypeImpl(args[0], args.slice(1))
    : new TupleTypeImpl(args, [])
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $Array<Value extends Schema.Any> extends TupleType<[], [Value]> {
  readonly value: Value
  annotations(annotations: Annotations.Schema<TupleType.Type<[], [Value]>>): $Array<Value>
}

class $ArrayImpl<Value extends Schema.Any> extends TupleTypeImpl<[], [Value]> implements $Array<Value> {
  constructor(readonly value: Value, ast?: AST.AST) {
    super([], [value], ast)
  }
  annotations(annotations: Annotations.Schema<TupleType.Type<[], [Value]>>) {
    return new $ArrayImpl(this.value, AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
}

const $Array = <Value extends Schema.Any>(value: Value): $Array<Value> => new $ArrayImpl(value)

export {
  /**
   * @category constructors
   * @since 1.0.0
   */
  $Array as Array
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface NonEmptyArray<Value extends Schema.Any> extends TupleType<[Value], [Value]> {
  readonly value: Value
  annotations(annotations: Annotations.Schema<TupleType.Type<[Value], [Value]>>): NonEmptyArray<Value>
}

class NonEmptyArrayImpl<Value extends Schema.Any> extends TupleTypeImpl<[Value], [Value]>
  implements NonEmptyArray<Value>
{
  constructor(readonly value: Value, ast?: AST.AST) {
    super([value], [value], ast)
  }
  annotations(annotations: Annotations.Schema<TupleType.Type<[Value], [Value]>>) {
    return new NonEmptyArrayImpl(this.value, AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const NonEmptyArray = <Value extends Schema.Any>(value: Value): NonEmptyArray<Value> =>
  new NonEmptyArrayImpl(value)

/**
 * @since 1.0.0
 */
export declare namespace PropertySignature {
  /**
   * @since 1.0.0
   */
  export type Token = "?:" | ":"

  /**
   * @since 1.0.0
   */
  export type GetToken<B extends boolean> = B extends true ? "?:" : ":"

  /**
   * @since 1.0.0
   */
  export type Any<Key extends PropertyKey = PropertyKey> = PropertySignature<Token, any, Key, Token, any, unknown>

  /**
   * @since 1.0.0
   */
  export type All<Key extends PropertyKey = PropertyKey> =
    | Any<Key>
    | PropertySignature<Token, never, Key, Token, any, unknown>
    | PropertySignature<Token, any, Key, Token, never, unknown>
    | PropertySignature<Token, never, Key, Token, never, unknown>

  /**
   * @since 1.0.0
   */
  export type AST =
    | PropertySignatureDeclaration
    | PropertySignatureTransformation

  /**
   * @since 1.0.0
   */
  export interface Annotations<A> extends Annotations.Doc<A> {}
}

const formatToken = (isOptional: boolean): string => isOptional ? "\"?:\"" : "\":\""

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export class PropertySignatureDeclaration {
  /**
   * @since 1.0.0
   */
  readonly _tag = "PropertySignatureDeclaration"
  constructor(
    readonly type: AST.AST,
    readonly isOptional: boolean,
    readonly isReadonly: boolean,
    readonly annotations: AST.Annotations
  ) {}
  /**
   * @since 1.0.0
   */
  toString() {
    const token = formatToken(this.isOptional)
    const type = String(this.type)
    return `PropertySignature<${token}, ${type}, never, ${token}, ${type}>`
  }
}

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export class FromPropertySignature implements AST.Annotated {
  constructor(
    readonly type: AST.AST,
    readonly isOptional: boolean,
    readonly isReadonly: boolean,
    readonly annotations: AST.Annotations,
    readonly fromKey?: PropertyKey | undefined
  ) {}
}

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export class ToPropertySignature implements AST.Annotated {
  constructor(
    readonly type: AST.AST,
    readonly isOptional: boolean,
    readonly isReadonly: boolean,
    readonly annotations: AST.Annotations
  ) {}
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
 * @since 1.0.0
 */
export class PropertySignatureTransformation {
  /**
   * @since 1.0.0
   */
  readonly _tag = "PropertySignatureTransformation"
  constructor(
    readonly from: FromPropertySignature,
    readonly to: ToPropertySignature,
    readonly decode: AST.PropertySignatureTransformation["decode"],
    readonly encode: AST.PropertySignatureTransformation["encode"]
  ) {}
  /**
   * @since 1.0.0
   */
  toString() {
    return `PropertySignature<${formatToken(this.to.isOptional)}, ${this.to.type}, ${
      formatPropertyKey(this.from.fromKey)
    }, ${formatToken(this.from.isOptional)}, ${this.from.type}>`
  }
}

/**
 * @since 1.0.0
 * @category symbol
 */
export const PropertySignatureTypeId: unique symbol = Symbol.for("@effect/schema/PropertySignature")

/**
 * @since 1.0.0
 * @category symbol
 */
export type PropertySignatureTypeId = typeof PropertySignatureTypeId

const propertySignatureAnnotations_ = (
  ast: PropertySignature.AST,
  annotations: AST.Annotations
): PropertySignature.AST => {
  switch (ast._tag) {
    case "PropertySignatureDeclaration": {
      return new PropertySignatureDeclaration(
        ast.type,
        ast.isOptional,
        ast.isReadonly,
        { ...ast.annotations, ...annotations }
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
        }),
        ast.decode,
        ast.encode
      )
    }
  }
}

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export interface PropertySignature<
  TypeToken extends PropertySignature.Token,
  Type,
  Key extends PropertyKey,
  EncodedToken extends PropertySignature.Token,
  Encoded,
  R = never
> extends Schema.Variance<Type, Encoded, R>, Pipeable {
  readonly [PropertySignatureTypeId]: null
  readonly _EncodedToken: EncodedToken
  readonly _TypeToken: TypeToken
  readonly _Key: Key
  readonly ast: PropertySignature.AST

  annotations(
    annotations: PropertySignature.Annotations<Type>
  ): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, R>
}

/** @internal */
export class PropertySignatureImpl<
  TypeToken extends PropertySignature.Token,
  Type,
  Key extends PropertyKey,
  EncodedToken extends PropertySignature.Token,
  Encoded,
  R = never
> implements PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, R> {
  readonly [TypeId]!: Schema.Variance<Type, Encoded, R>[TypeId]
  readonly [PropertySignatureTypeId] = null
  readonly _Key!: Key
  readonly _EncodedToken!: EncodedToken
  readonly _TypeToken!: TypeToken

  constructor(
    readonly ast: PropertySignature.AST
  ) {}

  pipe() {
    return pipeArguments(this, arguments)
  }

  annotations(
    annotations: PropertySignature.Annotations<Type>
  ): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, R> {
    return new PropertySignatureImpl(propertySignatureAnnotations_(this.ast, toASTAnnotations(annotations)))
  }

  toString() {
    return String(this.ast)
  }
}

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export const propertySignature = <A, I, R>(
  self: Schema<A, I, R>
): PropertySignature<PropertySignature.GetToken<false>, A, never, PropertySignature.GetToken<false>, I, R> =>
  new PropertySignatureImpl(new PropertySignatureDeclaration(self.ast, false, true, {}))

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export const fromKey: {
  <Key extends PropertyKey>(key: Key): <
    Type,
    TypeToken extends PropertySignature.Token,
    Encoded,
    EncodedToken extends PropertySignature.Token,
    R
  >(
    self: PropertySignature<TypeToken, Type, PropertyKey, EncodedToken, Encoded, R>
  ) => PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, R>
  <
    Type,
    TypeToken extends PropertySignature.Token,
    Encoded,
    EncodedToken extends PropertySignature.Token,
    R,
    Key extends PropertyKey
  >(
    self: PropertySignature<TypeToken, Type, PropertyKey, EncodedToken, Encoded, R>,
    key: Key
  ): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, R>
} = dual(2, <
  Type,
  TypeToken extends PropertySignature.Token,
  Encoded,
  EncodedToken extends PropertySignature.Token,
  R,
  Key extends PropertyKey
>(
  self: PropertySignature<TypeToken, Type, PropertyKey, EncodedToken, Encoded, R>,
  key: Key
): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, R> => {
  const ast = self.ast
  switch (ast._tag) {
    case "PropertySignatureDeclaration": {
      return new PropertySignatureImpl(
        new PropertySignatureTransformation(
          new FromPropertySignature(
            ast.type,
            ast.isOptional,
            ast.isReadonly,
            ast.annotations,
            key
          ),
          new ToPropertySignature(AST.typeAST(ast.type), ast.isOptional, ast.isReadonly, {}),
          identity,
          identity
        )
      )
    }
    case "PropertySignatureTransformation":
      return new PropertySignatureImpl(
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
 * - `decode`: `none` as argument means: the value is missing in the input
 * - `encode`: `none` as return value means: the value will be missing in the output
 *
 * @category PropertySignature
 * @since 1.0.0
 */
export const optionalToRequired = <FA, FI, FR, TA, TI, TR>(
  from: Schema<FA, FI, FR>,
  to: Schema<TA, TI, TR>,
  options: {
    readonly decode: (o: option_.Option<FA>) => TI
    readonly encode: (ti: TI) => option_.Option<FA>
  }
): PropertySignature<":", TA, never, "?:", FI, FR | TR> =>
  new PropertySignatureImpl(
    new PropertySignatureTransformation(
      new FromPropertySignature(from.ast, true, true, {}, undefined),
      new ToPropertySignature(to.ast, false, true, {}),
      (o) => option_.some(options.decode(o)),
      option_.flatMap(options.encode)
    )
  )

/**
 * - `decode`:
 *   - `none` as argument means: the value is missing in the input
 *   - `none` as return value means: the value will be missing in the output
 * - `encode`:
 *   - `none` as argument means: the value is missing in the input
 *   - `none` as return value means: the value will be missing in the output
 *
 * @category PropertySignature
 * @since 1.0.0
 */
export const optionalToOptional = <FA, FI, FR, TA, TI, TR>(
  from: Schema<FA, FI, FR>,
  to: Schema<TA, TI, TR>,
  options: {
    readonly decode: (o: option_.Option<FA>) => option_.Option<TI>
    readonly encode: (o: option_.Option<TI>) => option_.Option<FA>
  }
): PropertySignature<"?:", TA, never, "?:", FI, FR | TR> =>
  new PropertySignatureImpl(
    new PropertySignatureTransformation(
      new FromPropertySignature(from.ast, true, true, {}, undefined),
      new ToPropertySignature(to.ast, true, true, {}),
      options.decode,
      options.encode
    )
  )

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export const optional: {
  <
    A,
    const Options extends {
      readonly default?: never
      readonly as?: never
      readonly exact?: true
      readonly nullable?: true
    } | {
      readonly default: () => A
      readonly as?: never
      readonly exact?: true
      readonly nullable?: true
    } | {
      readonly as: "Option"
      readonly default?: never
      readonly exact?: true
      readonly nullable?: true
    } | undefined
  >(
    options?: Options
  ): <I, R>(schema: Schema<A, I, R>) => [undefined] extends [Options] ? PropertySignature<
      "?:",
      A | undefined,
      never,
      "?:",
      I | undefined,
      R
    > :
    PropertySignature<
      Types.Has<Options, "as" | "default"> extends true ? ":" : "?:",
      | (Types.Has<Options, "as"> extends true ? option_.Option<A> : A)
      | (Types.Has<Options, "as" | "default" | "exact"> extends true ? never : undefined),
      never,
      "?:",
      | I
      | (Types.Has<Options, "nullable"> extends true ? null : never)
      | (Types.Has<Options, "exact"> extends true ? never : undefined),
      R
    >
  <
    A,
    I,
    R,
    const Options extends {
      readonly default?: never
      readonly as?: never
      readonly exact?: true
      readonly nullable?: true
    } | {
      readonly default: () => A
      readonly as?: never
      readonly exact?: true
      readonly nullable?: true
    } | {
      readonly as: "Option"
      readonly default?: never
      readonly exact?: true
      readonly nullable?: true
    } | undefined
  >(
    schema: Schema<A, I, R>,
    options?: Options
  ): [undefined] extends [Options] ? PropertySignature<
      "?:",
      A | undefined,
      never,
      "?:",
      I | undefined,
      R
    > :
    PropertySignature<
      Types.Has<Options, "as" | "default"> extends true ? ":" : "?:",
      | (Types.Has<Options, "as"> extends true ? option_.Option<A> : A)
      | (Types.Has<Options, "as" | "default" | "exact"> extends true ? never : undefined),
      never,
      "?:",
      | I
      | (Types.Has<Options, "nullable"> extends true ? null : never)
      | (Types.Has<Options, "exact"> extends true ? never : undefined),
      R
    >
} = dual((args) => isSchema(args[0]), <A, I, R>(
  schema: Schema<A, I, R>,
  options?: {
    readonly exact?: true
    readonly default?: () => A
    readonly nullable?: true
    readonly as?: "Option"
  }
): PropertySignature<any, any, never, any, any, any> => {
  const isExact = options?.exact
  const defaultValue = options?.default
  const isNullable = options?.nullable
  const asOption = options?.as == "Option"

  if (isExact) {
    if (defaultValue) {
      if (isNullable) {
        return optionalToRequired(
          NullOr(schema),
          typeSchema(schema),
          {
            decode: option_.match({ onNone: defaultValue, onSome: (a) => a === null ? defaultValue() : a }),
            encode: option_.some
          }
        )
      } else {
        return optionalToRequired(
          schema,
          typeSchema(schema),
          { decode: option_.match({ onNone: defaultValue, onSome: identity }), encode: option_.some }
        )
      }
    } else if (asOption) {
      if (isNullable) {
        return optionalToRequired(
          NullOr(schema),
          OptionFromSelf(typeSchema(schema)),
          { decode: option_.filter(Predicate.isNotNull<A | null>), encode: identity }
        )
      } else {
        return optionalToRequired(
          schema,
          OptionFromSelf(typeSchema(schema)),
          { decode: identity, encode: identity }
        )
      }
    } else {
      if (isNullable) {
        return optionalToOptional(
          NullOr(schema),
          typeSchema(schema),
          { decode: option_.filter(Predicate.isNotNull<A | null>), encode: identity }
        )
      } else {
        return new PropertySignatureImpl(new PropertySignatureDeclaration(schema.ast, true, true, {}))
      }
    }
  } else {
    if (defaultValue) {
      if (isNullable) {
        return optionalToRequired(
          NullishOr(schema),
          typeSchema(schema),
          {
            decode: option_.match({ onNone: defaultValue, onSome: (a) => (a == null ? defaultValue() : a) }),
            encode: option_.some
          }
        )
      } else {
        return optionalToRequired(
          UndefinedOr(schema),
          typeSchema(schema),
          {
            decode: option_.match({ onNone: defaultValue, onSome: (a) => (a === undefined ? defaultValue() : a) }),
            encode: option_.some
          }
        )
      }
    } else if (asOption) {
      if (isNullable) {
        return optionalToRequired(
          NullishOr(schema),
          OptionFromSelf(typeSchema(schema)),
          { decode: option_.filter<A | null | undefined, A>((a): a is A => a != null), encode: identity }
        )
      } else {
        return optionalToRequired(
          UndefinedOr(schema),
          OptionFromSelf(typeSchema(schema)),
          { decode: option_.filter(Predicate.isNotUndefined<A | undefined>), encode: identity }
        )
      }
    } else {
      if (isNullable) {
        return optionalToOptional(
          NullishOr(schema),
          UndefinedOr(typeSchema(schema)),
          { decode: option_.filter(Predicate.isNotNull<A | null | undefined>), encode: identity }
        )
      } else {
        return new PropertySignatureImpl(
          new PropertySignatureDeclaration(UndefinedOr(schema).ast, true, true, {})
        )
      }
    }
  }
})

/**
 * @since 1.0.0
 */
export declare namespace Struct {
  /**
   * @since 1.0.0
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
      | PropertySignature<PropertySignature.Token, any, PropertyKey, "?:", any, unknown>
      | PropertySignature<PropertySignature.Token, any, PropertyKey, "?:", never, unknown>
      | PropertySignature<PropertySignature.Token, never, PropertyKey, "?:", any, unknown>
      | PropertySignature<PropertySignature.Token, never, PropertyKey, "?:", never, unknown> ? K
      : never
  }[keyof Fields]

  type TypeTokenKeys<Fields extends Struct.Fields> = {
    [K in keyof Fields]: Fields[K] extends OptionalPropertySignature ? K : never
  }[keyof Fields]

  type OptionalPropertySignature =
    | PropertySignature<"?:", any, PropertyKey, PropertySignature.Token, any, unknown>
    | PropertySignature<"?:", any, PropertyKey, PropertySignature.Token, never, unknown>
    | PropertySignature<"?:", never, PropertyKey, PropertySignature.Token, any, unknown>
    | PropertySignature<"?:", never, PropertyKey, PropertySignature.Token, never, unknown>

  /**
   * @since 1.0.0
   */
  export type Type<F extends Fields> = Types.UnionToIntersection<
    {
      [K in keyof F]: F[K] extends OptionalPropertySignature ? { readonly [H in K]?: Schema.Type<F[H]> } :
        { readonly [h in K]: Schema.Type<F[h]> }
    }[keyof F]
  > extends infer Q ? Q : never

  /**
   * @since 1.0.0
   */
  export type Encoded<F extends Fields> =
    & { readonly [K in Exclude<keyof F, EncodedTokenKeys<F>> as Key<F, K>]: Schema.Encoded<F[K]> }
    & { readonly [K in EncodedTokenKeys<F> as Key<F, K>]?: Schema.Encoded<F[K]> }

  /**
   * @since 1.0.0
   */
  export type Context<F extends Fields> = Schema.Context<F[keyof F]>
}

/**
 * @since 1.0.0
 */
export declare namespace IndexSignature {
  /**
   * @since 1.0.0
   */
  export type Record = { readonly key: Schema.All; readonly value: Schema.All }

  /**
   * @since 1.0.0
   */
  export type Records = ReadonlyArray<Record>

  /**
   * @since 1.0.0
   */
  export type NonEmptyRecords = array_.NonEmptyReadonlyArray<Record>

  /**
   * @since 1.0.0
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
   * @since 1.0.0
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
   * @since 1.0.0
   */
  export type Context<Records extends IndexSignature.Records> = {
    [K in keyof Records]: Schema.Context<Records[K]["key"]> | Schema.Context<Records[K]["value"]>
  }[number]
}

/**
 * @since 1.0.0
 */
export declare namespace TypeLiteral {
  /**
   * @since 1.0.0
   */
  export type Type<Fields extends Struct.Fields, Records extends IndexSignature.Records> =
    & Struct.Type<Fields>
    & IndexSignature.Type<Records>

  /**
   * @since 1.0.0
   */
  export type Encoded<Fields extends Struct.Fields, Records extends IndexSignature.Records> =
    & Struct.Encoded<Fields>
    & IndexSignature.Encoded<Records>
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface TypeLiteral<
  Fields extends Struct.Fields,
  Records extends IndexSignature.Records
> extends
  Schema<
    Types.Simplify<TypeLiteral.Type<Fields, Records>>,
    Types.Simplify<TypeLiteral.Encoded<Fields, Records>>,
    | Struct.Context<Fields>
    | IndexSignature.Context<Records>
  >
{
  readonly fields: { readonly [K in keyof Fields]: Fields[K] }
  readonly records: Readonly<Records>
  annotations(
    annotations: Annotations.Schema<Types.Simplify<TypeLiteral.Type<Fields, Records>>>
  ): TypeLiteral<Fields, Records>
}

const isPropertySignature = (u: unknown): u is PropertySignature.All =>
  Predicate.hasProperty(u, PropertySignatureTypeId)

class TypeLiteralImpl<
  Fields extends Struct.Fields,
  const Records extends IndexSignature.Records
> extends SchemaImpl<
  Types.Simplify<TypeLiteral.Type<Fields, Records>>,
  Types.Simplify<TypeLiteral.Encoded<Fields, Records>>,
  | Struct.Context<Fields>
  | IndexSignature.Context<Records>
> implements TypeLiteral<Fields, Records> {
  static ast = <
    Fields extends Struct.Fields,
    const Records extends IndexSignature.Records
  >(fields: Fields, records: Records): AST.AST => {
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
  readonly fields: { readonly [K in keyof Fields]: Fields[K] }
  readonly records: Readonly<Records>
  constructor(
    fields: Fields,
    records: Records,
    ast: AST.AST = TypeLiteralImpl.ast(fields, records)
  ) {
    super(ast)
    this.fields = { ...fields }
    this.records = [...records] as Records
  }
  annotations(
    annotations: Annotations.Schema<Types.Simplify<TypeLiteral.Type<Fields, Records>>>
  ): TypeLiteral<Fields, Records> {
    return new TypeLiteralImpl(this.fields, this.records, AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Struct<Fields extends Struct.Fields> extends TypeLiteral<Fields, []> {
  annotations(annotations: Annotations.Schema<Types.Simplify<Struct.Type<Fields>>>): Struct<Fields>
}

/**
 * @category constructors
 * @since 1.0.0
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
  return new TypeLiteralImpl(fields, records)
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $Record<K extends Schema.All, V extends Schema.All> extends TypeLiteral<{}, [{ key: K; value: V }]> {
  readonly key: K
  readonly value: V
  annotations(
    annotations: Annotations.Schema<Types.Simplify<TypeLiteral.Type<{}, [{ key: K; value: V }]>>>
  ): $Record<K, V>
}

class $RecordImpl<K extends Schema.All, V extends Schema.All> extends TypeLiteralImpl<
  {},
  [{ key: K; value: V }]
> implements $Record<K, V> {
  constructor(readonly key: K, readonly value: V, ast?: AST.AST) {
    super({}, [{ key, value }], ast)
  }
  annotations(annotations: Annotations.Schema<Types.Simplify<TypeLiteral.Type<{}, [{ key: K; value: V }]>>>) {
    return new $RecordImpl(this.key, this.value, AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const Record = <K extends Schema.All, V extends Schema.All>(key: K, value: V): $Record<K, V> =>
  new $RecordImpl(key, value)

/**
 * @category struct transformations
 * @since 1.0.0
 */
export const pick = <A, I, Keys extends ReadonlyArray<keyof A & keyof I>>(...keys: Keys) =>
<R>(
  self: Schema<A, I, R>
): Schema<Types.Simplify<Pick<A, Keys[number]>>, Types.Simplify<Pick<I, Keys[number]>>, R> =>
  make(AST.pick(self.ast, keys))

/**
 * @category struct transformations
 * @since 1.0.0
 */
export const omit = <A, I, Keys extends ReadonlyArray<keyof A & keyof I>>(...keys: Keys) =>
<R>(
  self: Schema<A, I, R>
): Schema<Types.Simplify<Omit<A, Keys[number]>>, Types.Simplify<Omit<I, Keys[number]>>, R> =>
  make(AST.omit(self.ast, keys))

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
 * @since 1.0.0
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
  ): Schema<A[K], Types.Simplify<Pick<I, K>>, R> => {
    const ps = AST.getPropertyKeyIndexedAccess(AST.typeAST(schema.ast), key)
    const value = make<A[K], A[K], R>(ps.isOptional ? AST.orUndefined(ps.type) : ps.type)
    return transform(
      schema.pipe(pick(key)),
      value,
      {
        decode: (a: any) => a[key],
        encode: (ak) => ps.isOptional && ak === undefined ? {} : { [key]: ak } as any
      }
    )
  }
)

const makeBrandSchema = <S extends Schema.AnyNoContext, B extends string | symbol>(
  self: AST.AST,
  annotations: Annotations.Schema<Schema.Type<S> & brand_.Brand<B>>
): brand<S, B> => {
  const ast = AST.annotations(self, toASTAnnotations(annotations))
  const schema = make(ast)
  const validateEither_ = validateEither(schema)

  //     v-- function
  const out: any = brand_.refined((unbranded) =>
    either_.match(validateEither_(unbranded), {
      onLeft: (e) => option_.some(brand_.error(TreeFormatter.formatErrorSync(e), e)),
      onRight: () => option_.none()
    })
  )
  // ----------------
  // Schema interface
  // ----------------
  Object.setPrototypeOf(
    Object.assign(out, schema, {
      annotations: (a: typeof annotations) => makeBrandSchema(ast, a)
    }),
    Object.getPrototypeOf(schema)
  )
  return out
}

/**
 * @category branding
 * @since 1.0.0
 */
export interface BrandSchema<A extends brand_.Brand<any>, I>
  extends Annotable<BrandSchema<A, I>, A, I>, brand_.Brand.Constructor<A>
{}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface brand<S extends Schema.AnyNoContext, B extends string | symbol>
  extends BrandSchema<Schema.Type<S> & brand_.Brand<B>, Schema.Encoded<S>>
{
  annotations(annotations: Annotations.Schema<Schema.Type<S> & brand_.Brand<B>>): brand<S, B>
}

/**
 * @category branding
 * @since 1.0.0
 */
export const asBrandSchema = <A extends brand_.Brand<any>, I>(schema: BrandSchema<A, I>): BrandSchema<A, I> => schema

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
 * @since 1.0.0
 */
export const brand = <S extends Schema.AnyNoContext, B extends string | symbol>(
  brand: B,
  annotations?: Annotations.Schema<Schema.Type<S> & brand_.Brand<B>>
) =>
(self: S): brand<S, B> => {
  const brandAnnotation: AST.BrandAnnotation = option_.match(AST.getBrandAnnotation(self.ast), {
    onNone: () => [brand],
    onSome: (brands) => [...brands, brand]
  })
  return makeBrandSchema(self.ast, {
    // add a default title annotation containing the brand
    title: String(self.ast) + ` & Brand<${util_.formatUnknown(brand)}>`,
    ...annotations,
    [AST.BrandAnnotationId]: brandAnnotation
  })
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const partial: {
  <const Options extends { readonly exact: true } | undefined>(
    options?: Options
  ): <A, I, R>(
    self: Schema<A, I, R>
  ) => Schema<
    { [K in keyof A]?: A[K] | ([undefined] extends [Options] ? undefined : never) },
    { [K in keyof I]?: I[K] | ([undefined] extends [Options] ? undefined : never) },
    R
  >
  <A, I, R, const Options extends { readonly exact: true } | undefined>(
    self: Schema<A, I, R>,
    options?: Options
  ): Schema<
    { [K in keyof A]?: A[K] | ([undefined] extends [Options] ? undefined : never) },
    { [K in keyof I]?: I[K] | ([undefined] extends [Options] ? undefined : never) },
    R
  >
} = dual((args) => isSchema(args[0]), <A, I, R>(
  self: Schema<A, I, R>,
  options?: { readonly exact: true }
): Schema<Partial<A>, Partial<I>, R> => make(AST.partial(self.ast, options)))

/**
 * @category combinators
 * @since 1.0.0
 */
export const required = <A, I, R>(
  self: Schema<A, I, R>
): Schema<{ [K in keyof A]-?: A[K] }, { [K in keyof I]-?: I[K] }, R> => make(AST.required(self.ast))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface mutable<S extends Schema.Any> extends
  Annotable<
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
 * @since 1.0.0
 */
export const mutable = <S extends Schema.Any>(schema: S): mutable<S> => make(AST.mutable(schema.ast))

const getExtendErrorMessage = (x: AST.AST, y: AST.AST, path: ReadonlyArray<string>) =>
  errors_.getAPIErrorMessage("Extend", `cannot extend \`${x}\` with \`${y}\` (path [${path?.join(", ")}])`)

const intersectTypeLiterals = (x: AST.AST, y: AST.AST, path: ReadonlyArray<string>): AST.TypeLiteral => {
  if (AST.isTypeLiteral(x) && AST.isTypeLiteral(y)) {
    const propertySignatures = [...x.propertySignatures]
    for (const ps of y.propertySignatures) {
      const name = ps.name
      const i = propertySignatures.findIndex((ps) => ps.name === name)
      if (i === -1) {
        propertySignatures.push(ps)
      } else {
        const { isOptional, type } = propertySignatures[i]
        path = [...path, util_.formatUnknown(name)]
        propertySignatures[i] = new AST.PropertySignature(name, extendAST(type, ps.type, path), isOptional, true)
      }
    }
    return new AST.TypeLiteral(
      propertySignatures,
      x.indexSignatures.concat(y.indexSignatures)
    )
  }
  throw new Error(getExtendErrorMessage(x, y, path))
}

const extendAST = (x: AST.AST, y: AST.AST, path: ReadonlyArray<string>): AST.AST =>
  AST.Union.make(intersectUnionMembers([x], [y], path))

const intersectUnionMembers = (
  xs: ReadonlyArray<AST.AST>,
  ys: ReadonlyArray<AST.AST>,
  path: ReadonlyArray<string>
): Array<AST.AST> =>
  array_.flatMap(xs, (x) =>
    array_.flatMap(ys, (y) => {
      if (AST.isUnion(x)) {
        return intersectUnionMembers(x.types, AST.isUnion(y) ? y.types : [y], path)
      } else if (AST.isUnion(y)) {
        return intersectUnionMembers([x], y.types, path)
      }

      if (AST.isTypeLiteral(x)) {
        if (AST.isTypeLiteral(y)) {
          return [intersectTypeLiterals(x, y, path)]
        } else if (
          AST.isTransformation(y) && AST.isTypeLiteralTransformation(y.transformation)
        ) {
          return [
            new AST.Transformation(
              intersectTypeLiterals(x, y.from, path),
              intersectTypeLiterals(AST.typeAST(x), y.to, path),
              new AST.TypeLiteralTransformation(
                y.transformation.propertySignatureTransformations
              )
            )
          ]
        }
      } else if (
        AST.isTransformation(x) && AST.isTypeLiteralTransformation(x.transformation)
      ) {
        if (AST.isTypeLiteral(y)) {
          return [
            new AST.Transformation(
              intersectTypeLiterals(x.from, y, path),
              intersectTypeLiterals(x.to, AST.typeAST(y), path),
              new AST.TypeLiteralTransformation(
                x.transformation.propertySignatureTransformations
              )
            )
          ]
        } else if (
          AST.isTransformation(y) && AST.isTypeLiteralTransformation(y.transformation)
        ) {
          return [
            new AST.Transformation(
              intersectTypeLiterals(x.from, y.from, path),
              intersectTypeLiterals(x.to, y.to, path),
              new AST.TypeLiteralTransformation(
                x.transformation.propertySignatureTransformations.concat(
                  y.transformation.propertySignatureTransformations
                )
              )
            )
          ]
        }
      }
      throw new Error(getExtendErrorMessage(x, y, path))
    }))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface extend<Self extends Schema.Any, That extends Schema.Any> extends
  Schema<
    Types.Simplify<Schema.Type<Self> & Schema.Type<That>>,
    Types.Simplify<Schema.Encoded<Self> & Schema.Encoded<That>>,
    Schema.Context<Self> | Schema.Context<That>
  >
{}

/**
 * @category combinators
 * @since 1.0.0
 */
export const extend: {
  <That extends Schema.Any>(
    that: That
  ): <Self extends Schema.Any>(self: Self) => extend<Self, That>
  <Self extends Schema.Any, That extends Schema.Any>(
    self: Self,
    that: That
  ): extend<Self, That>
} = dual(
  2,
  <Self extends Schema.Any, That extends Schema.Any>(
    self: Self,
    that: That
  ) => make(extendAST(self.ast, that.ast, []))
)

/**
 * @category combinators
 * @since 1.0.0
 */
export const compose: {
  <D, C extends B, R2, B>(
    to: Schema<D, C, R2>
  ): <A, R1>(from: Schema<B, A, R1>) => Schema<D, A, R1 | R2>
  <D, C, R2>(
    to: Schema<D, C, R2>
  ): <B extends C, A, R1>(from: Schema<B, A, R1>) => Schema<D, A, R1 | R2>
  <C, B, R2>(
    to: Schema<C, B, R2>,
    options?: { readonly strict: true }
  ): <A, R1>(from: Schema<B, A, R1>) => Schema<C, A, R1 | R2>
  <D, C, R2>(
    to: Schema<D, C, R2>,
    options: { readonly strict: false }
  ): <B, A, R1>(from: Schema<B, A, R1>) => Schema<D, A, R1 | R2>

  <B, A, R1, D, C extends B, R2>(
    from: Schema<B, A, R1>,
    to: Schema<D, C, R2>
  ): Schema<D, A, R1 | R2>
  <B extends C, A, R1, D, C, R2>(
    from: Schema<B, A, R1>,
    to: Schema<D, C, R2>
  ): Schema<D, A, R1 | R2>
  <B, A, R1, C, R2>(
    from: Schema<B, A, R1>,
    to: Schema<C, B, R2>,
    options?: { readonly strict: true }
  ): Schema<C, A, R1 | R2>
  <B, A, R1, D, C, R2>(
    from: Schema<B, A, R1>,
    to: Schema<D, C, R2>,
    options: { readonly strict: false }
  ): Schema<D, A, R1 | R2>
} = dual(
  (args) => isSchema(args[1]),
  <B, A, R1, D, C, R2>(from: Schema<B, A, R1>, to: Schema<D, C, R2>): Schema<D, A, R1 | R2> =>
    make(AST.compose(from.ast, to.ast))
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface suspend<A, I, R> extends Schema<A, I, R> {
  annotations(annotations: Annotations.Schema<A>): suspend<A, I, R>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const suspend = <A, I, R>(f: () => Schema<A, I, R>): suspend<A, I, R> => make(new AST.Suspend(() => f().ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export function filter<A>(
  f: (a: A, options: ParseOptions, self: AST.Refinement) => option_.Option<ParseResult.ParseIssue>,
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R>
export function filter<C extends A, B extends A, A = C>(
  refinement: Predicate.Refinement<A, B>,
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<C, I, R>) => Schema<C & B, I, R>
export function filter<A>(
  predicate: Predicate.Predicate<Types.NoInfer<A>>,
  annotations?: Annotations.Filter<Types.NoInfer<A>>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R>
export function filter<A>(
  predicate: Predicate.Predicate<A> | AST.Refinement["filter"],
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> {
  return (self) =>
    make(
      new AST.Refinement(
        self.ast,
        (a, options, ast) => {
          const out = predicate(a, options, ast)
          if (Predicate.isBoolean(out)) {
            return out
              ? option_.none()
              : option_.some(new ParseResult.Type(ast, a))
          }
          return out
        },
        toASTAnnotations(annotations)
      )
    )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface transformOrFail<From extends Schema.Any, To extends Schema.Any, R> extends
  Annotable<
    transformOrFail<From, To, R>,
    Schema.Type<To>,
    Schema.Encoded<From>,
    Schema.Context<From> | Schema.Context<To> | R
  >
{
  readonly from: From
  readonly to: To
}

class transformOrFailImpl<From extends Schema.Any, To extends Schema.Any, R>
  extends SchemaImpl<Schema.Type<To>, Schema.Encoded<From>, Schema.Context<From> | Schema.Context<To> | R>
  implements transformOrFail<From, To, R>
{
  constructor(readonly from: From, readonly to: To, ast: AST.AST) {
    super(ast)
  }
  annotations(annotations: Annotations.Schema<Schema.Type<To>>) {
    return new transformOrFailImpl(this.from, this.to, AST.annotations(this.ast, toASTAnnotations(annotations)))
  }
}

/**
 * Create a new `Schema` by transforming the input and output of an existing `Schema`
 * using the provided decoding functions.
 *
 * @category combinators
 * @since 1.0.0
 */
export const transformOrFail: {
  <To extends Schema.Any, From extends Schema.Any, RD, RE>(
    to: To,
    options: {
      readonly decode: (
        fromA: Schema.Type<From>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<Schema.Encoded<To>, ParseResult.ParseIssue, RD>
      readonly encode: (
        toI: Schema.Encoded<To>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<Schema.Type<From>, ParseResult.ParseIssue, RE>
      readonly strict?: true
    } | {
      readonly decode: (
        fromA: Schema.Type<From>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<unknown, ParseResult.ParseIssue, RD>
      readonly encode: (
        toI: Schema.Encoded<To>,
        options: ParseOptions,
        ast: AST.Transformation
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
        ast: AST.Transformation
      ) => Effect.Effect<Schema.Encoded<To>, ParseResult.ParseIssue, RD>
      readonly encode: (
        toI: Schema.Encoded<To>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<Schema.Type<From>, ParseResult.ParseIssue, RE>
      readonly strict?: true
    } | {
      readonly decode: (
        fromA: Schema.Type<From>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<unknown, ParseResult.ParseIssue, RD>
      readonly encode: (
        toI: Schema.Encoded<To>,
        options: ParseOptions,
        ast: AST.Transformation
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
      ast: AST.Transformation
    ) => Effect.Effect<ToI, ParseResult.ParseIssue, RD>
    readonly encode: (
      toI: ToI,
      options: ParseOptions,
      ast: AST.Transformation
    ) => Effect.Effect<FromA, ParseResult.ParseIssue, RE>
  }
): Schema<ToA, FromI, FromR | ToR | RD | RE> =>
  new transformOrFailImpl(
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
 * @since 1.0.0
 */
export interface transform<From extends Schema.Any, To extends Schema.Any> extends transformOrFail<From, To, never> {
  annotations(annotations: Annotations.Schema<Schema.Type<To>>): transform<From, To>
}

/**
 * Create a new `Schema` by transforming the input and output of an existing `Schema`
 * using the provided mapping functions.
 *
 * @category combinators
 * @since 1.0.0
 */
export const transform: {
  <To extends Schema.Any, From extends Schema.Any>(
    to: To,
    options: {
      readonly decode: (fromA: Schema.Type<From>) => Schema.Encoded<To>
      readonly encode: (toI: Schema.Encoded<To>) => Schema.Type<From>
      readonly strict?: true
    } | {
      readonly decode: (fromA: Schema.Type<From>) => unknown
      readonly encode: (toI: Schema.Encoded<To>) => unknown
      readonly strict: false
    }
  ): (from: From) => transform<From, To>
  <To extends Schema.Any, From extends Schema.Any>(
    from: From,
    to: To,
    options: {
      readonly decode: (fromA: Schema.Type<From>) => Schema.Encoded<To>
      readonly encode: (toI: Schema.Encoded<To>) => Schema.Type<From>
      readonly strict?: true
    } | {
      readonly decode: (fromA: Schema.Type<From>) => unknown
      readonly encode: (toI: Schema.Encoded<To>) => unknown
      readonly strict: false
    }
  ): transform<From, To>
} = dual(
  (args) => isSchema(args[0]) && isSchema(args[1]),
  <FromA, FromI, FromR, ToA, ToI, ToR>(
    from: Schema<FromA, FromI, FromR>,
    to: Schema<ToA, ToI, ToR>,
    options: {
      readonly decode: (fromA: FromA) => ToI
      readonly encode: (toI: ToI) => FromA
    }
  ): Schema<ToA, FromI, FromR | ToR> =>
    transformOrFail(
      from,
      to,
      {
        decode: (fromA) => ParseResult.succeed(options.decode(fromA)),
        encode: (toI) => ParseResult.succeed(options.encode(toI))
      }
    )
)

/**
 * @category api interface
 * @since 1.0.0
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
 * @since 1.0.0
 */
export const transformLiteral = <Encoded extends AST.LiteralValue, Type extends AST.LiteralValue>(
  from: Encoded,
  to: Type
): transformLiteral<Type, Encoded> => transform(Literal(from), Literal(to), { decode: () => to, encode: () => from })

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
 * @since 1.0.0
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
 * @since 1.0.0
 */
export const attachPropertySignature: {
  <K extends PropertyKey, V extends AST.LiteralValue | symbol, A>(
    key: K,
    value: V,
    annotations?: Annotations.Schema<Types.Simplify<A & { readonly [k in K]: V }>>
  ): <I, R>(
    schema: Schema<A, I, R>
  ) => Schema<Types.Simplify<A & { readonly [k in K]: V }>, I, R>
  <A, I, R, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<A, I, R>,
    key: K,
    value: V,
    annotations?: Annotations.Schema<Types.Simplify<A & { readonly [k in K]: V }>>
  ): Schema<Types.Simplify<A & { readonly [k in K]: V }>, I, R>
} = dual(
  (args) => isSchema(args[0]),
  <A, I, R, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<A, I, R>,
    key: K,
    value: V,
    annotations?: Annotations.Schema<Types.Simplify<A & { readonly [k in K]: V }>>
  ): Schema<Types.Simplify<A & { readonly [k in K]: V }>, I, R> => {
    const attached = extend(
      typeSchema(schema),
      Struct({ [key]: Predicate.isSymbol(value) ? UniqueSymbolFromSelf(value) : Literal(value) })
    ).ast
    return make(
      new AST.Transformation(
        schema.ast,
        annotations ? AST.annotations(attached, toASTAnnotations(annotations)) : attached,
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
 * @since 1.0.0
 */
export declare namespace Annotations {
  /**
   * @category annotations
   * @since 1.0.0
   */
  export interface Doc<A> extends AST.Annotations {
    readonly title?: AST.TitleAnnotation
    readonly description?: AST.DescriptionAnnotation
    readonly documentation?: AST.DocumentationAnnotation
    readonly examples?: AST.ExamplesAnnotation<A>
    readonly default?: AST.DefaultAnnotation<A>
  }

  /**
   * @since 1.0.0
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
  }

  /**
   * @since 1.0.0
   */
  export interface Filter<A> extends Schema<A, readonly [A]> {}
}

/**
 * @category annotations
 * @since 1.0.0
 */
export const annotations: {
  <S extends Annotable.All>(annotations: Annotations.Schema<Schema.Type<S>>): (self: S) => Annotable.Self<S>
  <S extends Annotable.All>(self: S, annotations: Annotations.Schema<Schema.Type<S>>): Annotable.Self<S>
} = dual(
  2,
  <A, I, R>(self: Schema<A, I, R>, annotations: Annotations.Schema<A>): Schema<A, I, R> => self.annotations(annotations)
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const message = (message: AST.MessageAnnotation) => <S extends Annotable.All>(self: S): Annotable.Self<S> =>
  self.annotations({ [AST.MessageAnnotationId]: message })

/**
 * @category annotations
 * @since 1.0.0
 */
export const identifier =
  (identifier: AST.IdentifierAnnotation) => <S extends Annotable.All>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.IdentifierAnnotationId]: identifier })

/**
 * @category annotations
 * @since 1.0.0
 */
export const title = (title: AST.TitleAnnotation) => <S extends Annotable.All>(self: S): Annotable.Self<S> =>
  self.annotations({ [AST.TitleAnnotationId]: title })

/**
 * @category annotations
 * @since 1.0.0
 */
export const description =
  (description: AST.DescriptionAnnotation) => <S extends Annotable.All>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.DescriptionAnnotationId]: description })

/**
 * @category annotations
 * @since 1.0.0
 */
export const examples =
  <S extends Annotable.All>(examples: AST.ExamplesAnnotation<Schema.Type<S>>) => (self: S): Annotable.Self<S> =>
    self.annotations({ [AST.ExamplesAnnotationId]: examples })

const $default = <S extends Annotable.All>(value: Schema.Type<S>) => (self: S): Annotable.Self<S> =>
  self.annotations({ [AST.DefaultAnnotationId]: value })

export {
  /**
   * @category annotations
   * @since 1.0.0
   */
  $default as default
}

/**
 * @category annotations
 * @since 1.0.0
 */
export const documentation =
  (documentation: AST.DocumentationAnnotation) => <S extends Annotable.All>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.DocumentationAnnotationId]: documentation })

/**
 * Attaches a JSON Schema annotation to a schema that represents a refinement.
 *
 * If the schema is composed of more than one refinement, the corresponding annotations will be merged.
 *
 * @category annotations
 * @since 1.0.0
 */
export const jsonSchema =
  (jsonSchema: AST.JSONSchemaAnnotation) => <S extends Annotable.All>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.JSONSchemaAnnotationId]: jsonSchema })

/**
 * @category annotations
 * @since 1.0.0
 */
export const equivalence =
  <S extends Annotable.All>(equivalence: Equivalence.Equivalence<Schema.Type<S>>) => (self: S): Annotable.Self<S> =>
    self.annotations({ [equivalence_.EquivalenceHookId]: () => equivalence })

/**
 * @category annotations
 * @since 1.0.0
 */
export const concurrency =
  (concurrency: AST.ConcurrencyAnnotation) => <S extends Annotable.All>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.ConcurrencyAnnotationId]: concurrency })

/**
 * @category annotations
 * @since 1.0.0
 */
export const batching = (batching: AST.BatchingAnnotation) => <S extends Annotable.All>(self: S): Annotable.Self<S> =>
  self.annotations({ [AST.BatchingAnnotationId]: batching })

/**
 * @category annotations
 * @since 1.0.0
 */
export const parseIssueTitle =
  (f: AST.ParseIssueTitleAnnotation) => <S extends Annotable.All>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.ParseIssueTitleAnnotationId]: f })

type Rename<A, M> = {
  [
    K in keyof A as K extends keyof M ? M[K] extends PropertyKey ? M[K]
      : never
      : K
  ]: A[K]
}

/**
 * @category renaming
 * @since 1.0.0
 */
export const rename: {
  <
    A,
    const M extends
      & { readonly [K in keyof A]?: PropertyKey }
      & { readonly [K in Exclude<keyof M, keyof A>]: never }
  >(
    mapping: M
  ): <I, R>(self: Schema<A, I, R>) => Schema<Types.Simplify<Rename<A, M>>, I, R>
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
  ): Schema<Types.Simplify<Rename<A, M>>, I, R>
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
  ): Schema<Types.Simplify<Rename<A, M>>, I, R> => {
    return make(AST.rename(self.ast, mapping))
  }
)

/**
 * @category type id
 * @since 1.0.0
 */
export const TrimmedTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Trimmed")

/**
 * Verifies that a string contains no leading or trailing whitespaces.
 *
 * Note. This combinator does not make any transformations, it only validates.
 * If what you were looking for was a combinator to trim strings, then check out the `trim` combinator.
 *
 * @category string filters
 * @since 1.0.0
 */
export const trimmed =
  <A extends string>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => a === a.trim(), {
        typeId: TrimmedTypeId,
        description: "a string with no leading or trailing whitespace",
        ...annotations
      })
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const MaxLengthTypeId: unique symbol = filters_.MaxLengthTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type MaxLengthTypeId = typeof MaxLengthTypeId

/**
 * @category string filters
 * @since 1.0.0
 */
export const maxLength = <A extends string>(
  maxLength: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.length <= maxLength,
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
 * @since 1.0.0
 */
export const MinLengthTypeId: unique symbol = filters_.MinLengthTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type MinLengthTypeId = typeof MinLengthTypeId

/**
 * @category string filters
 * @since 1.0.0
 */
export const minLength = <A extends string>(
  minLength: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.length >= minLength,
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
 * @since 1.0.0
 */
export const PatternTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Pattern")

/**
 * @category string filters
 * @since 1.0.0
 */
export const pattern = <A extends string>(
  regex: RegExp,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> => {
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
 * @since 1.0.0
 */
export const StartsWithTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/StartsWith")

/**
 * @category string filters
 * @since 1.0.0
 */
export const startsWith = <A extends string>(
  startsWith: string,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.startsWith(startsWith),
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
 * @since 1.0.0
 */
export const EndsWithTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/EndsWith")

/**
 * @category string filters
 * @since 1.0.0
 */
export const endsWith = <A extends string>(
  endsWith: string,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.endsWith(endsWith),
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
 * @since 1.0.0
 */
export const IncludesTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Includes")

/**
 * @category string filters
 * @since 1.0.0
 */
export const includes = <A extends string>(
  searchString: string,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.includes(searchString),
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
 * @since 1.0.0
 */
export const LowercasedTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Lowercased")

/**
 * Verifies that a string is lowercased.
 *
 * @category string filters
 * @since 1.0.0
 */
export const lowercased =
  <A extends string>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => a === a.toLowerCase(), {
        typeId: LowercasedTypeId,
        description: "a lowercase string",
        ...annotations
      })
    )

/**
 * @category string constructors
 * @since 1.0.0
 */
export const Lowercased: $String = $String.pipe(
  lowercased({ identifier: "Lowercased", title: "Lowercased" })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const UppercasedTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Uppercased")

/**
 * Verifies that a string is uppercased.
 *
 * @category string filters
 * @since 1.0.0
 */
export const uppercased =
  <A extends string>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => a === a.toUpperCase(), {
        typeId: UppercasedTypeId,
        description: "an uppercase string",
        ...annotations
      })
    )

/**
 * @category string constructors
 * @since 1.0.0
 */
export const Uppercased: $String = $String.pipe(
  uppercased({ identifier: "Uppercased", title: "Uppercased" })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const LengthTypeId: unique symbol = filters_.LengthTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type LengthTypeId = typeof LengthTypeId

/**
 * @category string filters
 * @since 1.0.0
 */
export const length = <A extends string>(
  length: number | { readonly min: number; readonly max: number },
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> => {
  const minLength = Predicate.isObject(length) ? Math.max(0, Math.floor(length.min)) : Math.max(0, Math.floor(length))
  const maxLength = Predicate.isObject(length) ? Math.max(minLength, Math.floor(length.max)) : minLength
  if (minLength !== maxLength) {
    return self.pipe(
      filter((a): a is A => a.length >= minLength && a.length <= maxLength, {
        typeId: LengthTypeId,
        description: `a string at least ${minLength} character(s) and at most ${maxLength} character(s) long`,
        jsonSchema: { minLength, maxLength },
        ...annotations
      })
    )
  }
  return self.pipe(
    filter((a): a is A => a.length === minLength, {
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
 * @since 1.0.0
 */
export const Char = $String.pipe(length(1, { identifier: "Char" }))

/**
 * @category string filters
 * @since 1.0.0
 */
export const nonEmpty = <A extends string>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> =>
  minLength(1, {
    description: "a non empty string",
    ...annotations
  })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Lowercase extends Annotable<Lowercase, string> {}

/**
 * This schema converts a string to lowercase.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Lowercase: Lowercase = transform(
  $String,
  Lowercased,
  { decode: (s) => s.toLowerCase(), encode: identity }
).annotations({ identifier: "Lowercase" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Uppercase extends Annotable<Uppercase, string> {}

/**
 * This schema converts a string to uppercase.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Uppercase: Uppercase = transform(
  $String,
  Uppercased,
  { decode: (s) => s.toUpperCase(), encode: identity }
).annotations({ identifier: "Uppercase" })

/**
 * @category string constructors
 * @since 1.0.0
 */
export const Trimmed: $String = $String.pipe(
  trimmed({ identifier: "Trimmed", title: "Trimmed" })
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Trim extends Annotable<Trim, string> {}

/**
 * This schema allows removing whitespaces from the beginning and end of a string.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Trim: Trim = transform(
  $String,
  Trimmed,
  { decode: (s) => s.trim(), encode: identity }
).annotations({ identifier: "Trim" })

/**
 * Returns a schema that allows splitting a string into an array of strings.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const split = (separator: string): Schema<ReadonlyArray<string>, string> =>
  transform(
    $String,
    $Array($String),
    { decode: string_.split(separator), encode: array_.join(separator) }
  )

/**
 * @since 1.0.0
 */
export type ParseJsonOptions = {
  readonly reviver?: Parameters<typeof JSON.parse>[1]
  readonly replacer?: Parameters<typeof JSON.stringify>[1]
  readonly space?: Parameters<typeof JSON.stringify>[2]
}

const JsonString = $String.annotations({
  [AST.IdentifierAnnotationId]: "JsonString",
  [AST.TitleAnnotationId]: "JsonString",
  [AST.DescriptionAnnotationId]: "a JSON string"
})

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
 * @since 1.0.0
 */
export const parseJson: {
  <A, I, R>(schema: Schema<A, I, R>, options?: ParseJsonOptions): Schema<A, string, R>
  (options?: ParseJsonOptions): Schema<unknown, string>
} = <A, I, R>(schema?: Schema<A, I, R> | ParseJsonOptions, o?: ParseJsonOptions) => {
  if (isSchema(schema)) {
    return compose(parseJson(o), schema as any) as any
  }
  const options: ParseJsonOptions | undefined = schema as any
  return transformOrFail(
    JsonString,
    Unknown,
    {
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
  )
}

/**
 * @category string constructors
 * @since 1.0.0
 */
export const NonEmpty: $String = $String.pipe(
  nonEmpty({ identifier: "NonEmpty", title: "NonEmpty" })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const UUIDTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/UUID")

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

/**
 * Represents a Universally Unique Identifier (UUID).
 *
 * This schema ensures that the provided string adheres to the standard UUID format.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const UUID: $String = $String.pipe(
  pattern(uuidRegex, {
    typeId: UUIDTypeId,
    identifier: "UUID",
    title: "UUID",
    description: "a Universally Unique Identifier",
    arbitrary: (): LazyArbitrary<string> => (fc) => fc.uuid()
  })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const ULIDTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/ULID")

const ulidRegex = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i

/**
 * Represents a Universally Unique Lexicographically Sortable Identifier (ULID).
 *
 * ULIDs are designed to be compact, URL-safe, and ordered, making them suitable for use as identifiers.
 * This schema ensures that the provided string adheres to the standard ULID format.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const ULID: $String = $String.pipe(
  pattern(ulidRegex, {
    typeId: ULIDTypeId,
    identifier: "ULID",
    title: "ULID",
    description: "a Universally Unique Lexicographically Sortable Identifier",
    arbitrary: (): LazyArbitrary<string> => (fc) => fc.ulid()
  })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const FiniteTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/Finite")

/**
 * Ensures that the provided value is a finite number.
 *
 * This schema filters out non-finite numeric values, allowing only finite numbers to pass through.
 *
 * @category number filters
 * @since 1.0.0
 */
export const finite =
  <A extends number>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => Number.isFinite(a), {
        typeId: FiniteTypeId,
        description: "a finite number",
        ...annotations
      })
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanTypeId: unique symbol = filters_.GreaterThanTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type GreaterThanTypeId = typeof GreaterThanTypeId

/**
 * This filter checks whether the provided number is greater than the specified minimum.
 *
 * @category number filters
 * @since 1.0.0
 */
export const greaterThan = <A extends number>(
  min: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a > min, {
      typeId: GreaterThanTypeId,
      description: min === 0 ? "a positive number" : `a number greater than ${min}`,
      jsonSchema: { exclusiveMinimum: min },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToTypeId: unique symbol = filters_.GreaterThanOrEqualToTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type GreaterThanOrEqualToTypeId = typeof GreaterThanOrEqualToTypeId

/**
 * This filter checks whether the provided number is greater than or equal to the specified minimum.
 *
 * @category number filters
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = <A extends number>(
  min: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min, {
      typeId: GreaterThanOrEqualToTypeId,
      description: min === 0 ? "a non-negative number" : `a number greater than or equal to ${min}`,
      jsonSchema: { minimum: min },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const MultipleOfTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/MultipleOf")

/**
 * @category number filters
 * @since 1.0.0
 */
export const multipleOf = <A extends number>(
  divisor: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => number_.remainder(a, divisor) === 0, {
      typeId: MultipleOfTypeId,
      description: `a number divisible by ${divisor}`,
      jsonSchema: { multipleOf: Math.abs(divisor) }, // spec requires positive divisor
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const IntTypeId: unique symbol = filters_.IntTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type IntTypeId = typeof IntTypeId

/**
 * @category number filters
 * @since 1.0.0
 */
export const int =
  <A extends number>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => Number.isSafeInteger(a), {
        typeId: IntTypeId,
        title: "integer",
        description: "an integer",
        jsonSchema: { type: "integer" },
        ...annotations
      })
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanTypeId: unique symbol = filters_.LessThanTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type LessThanTypeId = typeof LessThanTypeId

/**
 * This filter checks whether the provided number is less than the specified maximum.
 *
 * @category number filters
 * @since 1.0.0
 */
export const lessThan =
  <A extends number>(max: number, annotations?: Annotations.Filter<A>) =>
  <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => a < max, {
        typeId: LessThanTypeId,
        description: max === 0 ? "a negative number" : `a number less than ${max}`,
        jsonSchema: { exclusiveMaximum: max },
        ...annotations
      })
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToTypeId: unique symbol = filters_.LessThanOrEqualToTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type LessThanOrEqualToTypeId = typeof LessThanOrEqualToTypeId

/**
 * This schema checks whether the provided number is less than or equal to the specified maximum.
 *
 * @category number filters
 * @since 1.0.0
 */
export const lessThanOrEqualTo = <A extends number>(
  max: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a <= max, {
      typeId: LessThanOrEqualToTypeId,
      description: max === 0 ? "a non-positive number" : `a number less than or equal to ${max}`,
      jsonSchema: { maximum: max },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const BetweenTypeId: unique symbol = filters_.BetweenTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type BetweenTypeId = typeof BetweenTypeId

/**
 * This filter checks whether the provided number falls within the specified minimum and maximum values.
 *
 * @category number filters
 * @since 1.0.0
 */
export const between = <A extends number>(
  min: number,
  max: number,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min && a <= max, {
      typeId: BetweenTypeId,
      description: `a number between ${min} and ${max}`,
      jsonSchema: { maximum: max, minimum: min },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const NonNaNTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/NonNaN")

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonNaN =
  <A extends number>(annotations?: Annotations.Filter<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => !Number.isNaN(a), {
        typeId: NonNaNTypeId,
        description: "a number excluding NaN",
        ...annotations
      })
    )

/**
 * @category number filters
 * @since 1.0.0
 */
export const positive = <A extends number>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThan(0, annotations)

/**
 * @category number filters
 * @since 1.0.0
 */
export const negative = <A extends number>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThan(0, annotations)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonPositive = <A extends number>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThanOrEqualTo(0, annotations)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonNegative = <A extends number>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThanOrEqualTo(0, annotations)

/**
 * Clamps a number between a minimum and a maximum value.
 *
 * @category number transformations
 * @since 1.0.0
 */
export const clamp =
  (minimum: number, maximum: number) => <R, I, A extends number>(self: Schema<A, I, R>): Schema<A, I, R> =>
    transform(
      self,
      self.pipe(typeSchema, between(minimum, maximum)),
      { strict: false, decode: (self) => number_.clamp(self, { minimum, maximum }), encode: identity }
    )

/**
 * @category api interface
 * @since 1.0.0
 */
export interface NumberFromString extends Annotable<NumberFromString, number, string> {}

/**
 * This schema transforms a `string` into a `number` by parsing the string using the `Number` function.
 *
 * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
 *
 * The following special string values are supported: "NaN", "Infinity", "-Infinity".
 *
 * @category number constructors
 * @since 1.0.0
 */
export const NumberFromString: NumberFromString = transformOrFail(
  $String,
  $Number,
  {
    decode: (s, _, ast) => ParseResult.fromOption(number_.parse(s), () => new ParseResult.Type(ast, s)),
    encode: (n) => ParseResult.succeed(String(n))
  }
).annotations({ identifier: "NumberFromString" })

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Finite: $Number = $Number.pipe(finite({ identifier: "Finite", title: "Finite" }))

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Int: $Number = $Number.pipe(int({ identifier: "Int", title: "Int" }))

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonNaN: $Number = $Number.pipe(nonNaN({ identifier: "NonNaN", title: "NonNaN" }))

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Positive: $Number = $Number.pipe(
  positive({ identifier: "Positive", title: "Positive" })
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Negative: $Number = $Number.pipe(
  negative({ identifier: "Negative", title: "Negative" })
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonPositive: $Number = $Number.pipe(
  nonPositive({ identifier: "NonPositive", title: "NonPositive" })
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonNegative: $Number = $Number.pipe(
  nonNegative({ identifier: "NonNegative", title: "NonNegative" })
)

/**
 * @category type id
 * @since 1.0.0
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
 * @since 1.0.0
 */
export const JsonNumber: $Number = $Number.pipe(
  filter((n) => !Number.isNaN(n) && Number.isFinite(n), {
    typeId: JsonNumberTypeId,
    identifier: "JsonNumber",
    title: "JSON-compatible number",
    description: "a JSON-compatible number, excluding NaN, +Infinity, and -Infinity",
    jsonSchema: { type: "number" }
  })
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Not extends Annotable<Not, boolean> {}

/**
 * @category boolean transformations
 * @since 1.0.0
 */
export const Not: Not = transform($Boolean, $Boolean, { decode: boolean_.not, encode: boolean_.not })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $Symbol extends Annotable<$Symbol, symbol, string> {}

const $Symbol: $Symbol = transform(
  $String,
  SymbolFromSelf,
  { strict: false, decode: (s) => Symbol.for(s), encode: (sym) => sym.description }
).annotations({ identifier: "symbol" })

export {
  /**
   * This schema transforms a `string` into a `symbol`.
   *
   * @category symbol transformations
   * @since 1.0.0
   */
  $Symbol as Symbol
}

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanBigIntTypeId: unique symbol = filters_.GreaterThanBigintTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type GreaterThanBigIntTypeId = typeof GreaterThanBigIntTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const greaterThanBigInt = <A extends bigint>(
  min: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a > min, {
      typeId: { id: GreaterThanBigIntTypeId, annotation: { min } },
      description: min === 0n ? "a positive bigint" : `a bigint greater than ${min}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToBigIntTypeId: unique symbol = filters_.GreaterThanOrEqualToBigIntTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type GreaterThanOrEqualToBigIntTypeId = typeof GreaterThanOrEqualToBigIntTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const greaterThanOrEqualToBigInt = <A extends bigint>(
  min: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min, {
      typeId: { id: GreaterThanOrEqualToBigIntTypeId, annotation: { min } },
      description: min === 0n
        ? "a non-negative bigint"
        : `a bigint greater than or equal to ${min}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanBigIntTypeId: unique symbol = filters_.LessThanBigIntTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type LessThanBigIntTypeId = typeof LessThanBigIntTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const lessThanBigInt = <A extends bigint>(
  max: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a < max, {
      typeId: { id: LessThanBigIntTypeId, annotation: { max } },
      description: max === 0n ? "a negative bigint" : `a bigint less than ${max}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToBigIntTypeId: unique symbol = filters_.LessThanOrEqualToBigIntTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type LessThanOrEqualToBigIntTypeId = typeof LessThanOrEqualToBigIntTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const lessThanOrEqualToBigInt = <A extends bigint>(
  max: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a <= max, {
      typeId: { id: LessThanOrEqualToBigIntTypeId, annotation: { max } },
      description: max === 0n ? "a non-positive bigint" : `a bigint less than or equal to ${max}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const BetweenBigIntTypeId: unique symbol = filters_.BetweenBigintTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type BetweenBigIntTypeId = typeof BetweenBigIntTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const betweenBigInt = <A extends bigint>(
  min: bigint,
  max: bigint,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min && a <= max, {
      typeId: { id: BetweenBigIntTypeId, annotation: { max, min } },
      description: `a bigint between ${min}n and ${max}n`,
      ...annotations
    })
  )

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const positiveBigInt = <A extends bigint>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThanBigInt(0n, annotations)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const negativeBigInt = <A extends bigint>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThanBigInt(0n, annotations)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonNegativeBigInt = <A extends bigint>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThanOrEqualToBigInt(0n, annotations)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonPositiveBigInt = <A extends bigint>(
  annotations?: Annotations.Filter<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThanOrEqualToBigInt(0n, annotations)

/**
 * Clamps a bigint between a minimum and a maximum value.
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const clampBigInt =
  (minimum: bigint, maximum: bigint) => <R, I, A extends bigint>(self: Schema<A, I, R>): Schema<A, I, R> =>
    transform(
      self,
      self.pipe(typeSchema, betweenBigInt(minimum, maximum)),
      { strict: false, decode: (self) => bigInt_.clamp(self, { minimum, maximum }), encode: identity }
    )

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $BigInt extends Annotable<$BigInt, bigint, string> {}

const bigint: $BigInt = transformOrFail(
  $String,
  BigIntFromSelf,
  {
    decode: (s, _, ast) => ParseResult.fromOption(bigInt_.fromString(s), () => new ParseResult.Type(ast, s)),
    encode: (n) => ParseResult.succeed(String(n))
  }
).annotations({ identifier: "bigint" })

export {
  /**
   * This schema transforms a `string` into a `bigint` by parsing the string using the `BigInt` function.
   *
   * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
   *
   * @category bigint transformations
   * @since 1.0.0
   */
  bigint as BigInt
}

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const PositiveBigIntFromSelf: Schema<bigint> = BigIntFromSelf.pipe(
  positiveBigInt({ identifier: "PositiveBigintFromSelf", title: "PositiveBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const PositiveBigInt: Schema<bigint, string> = bigint.pipe(
  positiveBigInt({ identifier: "PositiveBigint", title: "PositiveBigint" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NegativeBigIntFromSelf: Schema<bigint> = BigIntFromSelf.pipe(
  negativeBigInt({ identifier: "NegativeBigintFromSelf", title: "NegativeBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NegativeBigInt: Schema<bigint, string> = bigint.pipe(
  negativeBigInt({ identifier: "NegativeBigint", title: "NegativeBigint" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonPositiveBigIntFromSelf: Schema<bigint> = BigIntFromSelf.pipe(
  nonPositiveBigInt({ identifier: "NonPositiveBigintFromSelf", title: "NonPositiveBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonPositiveBigInt: Schema<bigint, string> = bigint.pipe(
  nonPositiveBigInt({ identifier: "NonPositiveBigint", title: "NonPositiveBigint" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonNegativeBigIntFromSelf: Schema<bigint> = BigIntFromSelf.pipe(
  nonNegativeBigInt({ identifier: "NonNegativeBigintFromSelf", title: "NonNegativeBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonNegativeBigInt: Schema<bigint, string> = bigint.pipe(
  nonNegativeBigInt({ identifier: "NonNegativeBigint", title: "NonNegativeBigint" })
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BigIntFromNumber extends Annotable<BigIntFromNumber, bigint, number> {}

/**
 * This schema transforms a `number` into a `bigint` by parsing the number using the `BigInt` function.
 *
 * It returns an error if the value can't be safely encoded as a `number` due to being out of range.
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const BigIntFromNumber: BigIntFromNumber = transformOrFail(
  $Number,
  BigIntFromSelf,
  {
    decode: (n, _, ast) =>
      ParseResult.fromOption(
        bigInt_.fromNumber(n),
        () => new ParseResult.Type(ast, n)
      ),
    encode: (b, _, ast) => ParseResult.fromOption(bigInt_.toNumber(b), () => new ParseResult.Type(ast, b))
  }
).annotations({ identifier: "BigintFromNumber" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface SecretFromSelf extends Annotable<SecretFromSelf, secret_.Secret> {}

/**
 * @category Secret constructors
 * @since 1.0.0
 */
export const SecretFromSelf: SecretFromSelf = declare(
  secret_.isSecret,
  {
    identifier: "SecretFromSelf",
    pretty: (): pretty_.Pretty<secret_.Secret> => (secret) => String(secret),
    arbitrary: (): LazyArbitrary<secret_.Secret> => (fc) => fc.string().map((_) => secret_.fromString(_))
  }
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Secret extends Annotable<Secret, secret_.Secret, string> {}

/**
 * A schema that transforms a `string` into a `Secret`.
 *
 * @category Secret transformations
 * @since 1.0.0
 */
export const Secret: Secret = transform(
  $String,
  SecretFromSelf,
  { strict: false, decode: (str) => secret_.fromString(str), encode: (secret) => secret_.value(secret) }
).annotations({ identifier: "Secret" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface DurationFromSelf extends Annotable<DurationFromSelf, duration_.Duration> {}

/**
 * @category Duration constructors
 * @since 1.0.0
 */
export const DurationFromSelf: DurationFromSelf = declare(
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
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface DurationFromNanos extends Annotable<DurationFromNanos, duration_.Duration, bigint> {}

/**
 * A schema that transforms a `bigint` tuple into a `Duration`.
 * Treats the value as the number of nanoseconds.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const DurationFromNanos: DurationFromNanos = transformOrFail(
  BigIntFromSelf,
  DurationFromSelf,
  {
    decode: (nanos) => ParseResult.succeed(duration_.nanos(nanos)),
    encode: (duration, _, ast) =>
      option_.match(duration_.toNanos(duration), {
        onNone: () => ParseResult.fail(new ParseResult.Type(ast, duration)),
        onSome: (val) => ParseResult.succeed(val)
      })
  }
).annotations({ identifier: "DurationFromNanos" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface DurationFromMillis extends Annotable<DurationFromMillis, duration_.Duration, number> {}

/**
 * A schema that transforms a `number` tuple into a `Duration`.
 * Treats the value as the number of milliseconds.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const DurationFromMillis: DurationFromMillis = transform(
  $Number,
  DurationFromSelf,
  { decode: (ms) => duration_.millis(ms), encode: (n) => duration_.toMillis(n) }
).annotations({ identifier: "DurationFromMillis" })

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
 * @category api interface
 * @since 1.0.0
 */
export interface Duration extends Annotable<Duration, duration_.Duration, readonly [seconds: number, nanos: number]> {}

/**
 * A schema that transforms a `[number, number]` tuple into a `Duration`.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const Duration: Duration = transform(
  hrTime,
  DurationFromSelf,
  {
    decode: ([seconds, nanos]) => duration_.nanos(BigInt(seconds) * BigInt(1e9) + BigInt(nanos)),
    encode: (duration) => duration_.toHrTime(duration)
  }
).annotations({ identifier: "Duration" })

/**
 * Clamps a `Duration` between a minimum and a maximum value.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const clampDuration =
  (minimum: duration_.DurationInput, maximum: duration_.DurationInput) =>
  <R, I, A extends duration_.Duration>(self: Schema<A, I, R>): Schema<A, I, R> =>
    transform(
      self,
      self.pipe(typeSchema, betweenDuration(minimum, maximum)),
      { strict: false, decode: (self) => duration_.clamp(self, { minimum, maximum }), encode: identity }
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanDurationTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/LessThanDuration")

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const lessThanDuration = <A extends duration_.Duration>(
  max: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => duration_.lessThan(a, max), {
      typeId: { id: LessThanDurationTypeId, annotation: { max } },
      description: `a Duration less than ${duration_.decode(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToDurationTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/LessThanOrEqualToDuration"
)

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const lessThanOrEqualToDuration = <A extends duration_.Duration>(
  max: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => duration_.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanDurationTypeId, annotation: { max } },
      description: `a Duration less than or equal to ${duration_.decode(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanDurationTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/GreaterThanDuration")

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const greaterThanDuration = <A extends duration_.Duration>(
  min: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => duration_.greaterThan(a, min), {
      typeId: { id: GreaterThanDurationTypeId, annotation: { min } },
      description: `a Duration greater than ${duration_.decode(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToDurationTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/GreaterThanOrEqualToDuration"
)

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const greaterThanOrEqualToDuration = <A extends duration_.Duration>(
  min: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => duration_.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToDurationTypeId, annotation: { min } },
      description: `a Duration greater than or equal to ${duration_.decode(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const BetweenDurationTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/BetweenDuration")

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const betweenDuration = <A extends duration_.Duration>(
  minimum: duration_.DurationInput,
  maximum: duration_.DurationInput,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => duration_.between(a, { minimum, maximum }), {
      typeId: { id: BetweenDurationTypeId, annotation: { maximum, minimum } },
      description: `a Duration between ${duration_.decode(minimum)} and ${duration_.decode(maximum)}`,
      ...annotations
    })
  )

/**
 * @category Uint8Array constructors
 * @since 1.0.0
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

const $Uint8Array: Schema<Uint8Array, ReadonlyArray<number>> = transform(
  $Array($Number.pipe(
    between(0, 255, {
      title: "8-bit unsigned integer",
      description: "a 8-bit unsigned integer"
    })
  )).annotations({ description: "an array of 8-bit unsigned integers" }),
  Uint8ArrayFromSelf,
  { decode: (numbers) => Uint8Array.from(numbers), encode: (uint8Array) => Array.from(uint8Array) }
).annotations({ identifier: "Uint8Array" })

export {
  /**
   * A schema that transforms a `number` array into a `Uint8Array`.
   *
   * @category Uint8Array transformations
   * @since 1.0.0
   */
  $Uint8Array as Uint8Array
}

const makeEncodingTransformation = (
  id: string,
  decode: (s: string) => either_.Either<Uint8Array, Encoding.DecodeException>,
  encode: (u: Uint8Array) => string
): Schema<Uint8Array, string> =>
  transformOrFail(
    $String,
    Uint8ArrayFromSelf,
    {
      strict: false,
      decode: (s, _, ast) =>
        either_.mapLeft(
          decode(s),
          (decodeException) => new ParseResult.Type(ast, s, decodeException.message)
        ),
      encode: (u) => ParseResult.succeed(encode(u))
    }
  ).annotations({ identifier: id })

/**
 * @category Encoding transformations
 * @since 1.0.0
 */
export const Base64: Schema<Uint8Array, string> = makeEncodingTransformation(
  "Base64",
  Encoding.decodeBase64,
  Encoding.encodeBase64
)

/**
 * @category Encoding transformations
 * @since 1.0.0
 */
export const Base64Url: Schema<Uint8Array, string> = makeEncodingTransformation(
  "Base64Url",
  Encoding.decodeBase64Url,
  Encoding.encodeBase64Url
)

/**
 * @category Encoding transformations
 * @since 1.0.0
 */
export const Hex: Schema<Uint8Array, string> = makeEncodingTransformation(
  "Hex",
  Encoding.decodeHex,
  Encoding.encodeHex
)

/**
 * @category type id
 * @since 1.0.0
 */
export const MinItemsTypeId: unique symbol = filters_.MinItemsTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type MinItemsTypeId = typeof MinItemsTypeId

/**
 * @category ReadonlyArray filters
 * @since 1.0.0
 */
export const minItems = <A>(
  n: number,
  annotations?: Annotations.Filter<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): Schema<ReadonlyArray<A>, I, R> =>
  self.pipe(
    filter((a): a is ReadonlyArray<A> => a.length >= n, {
      typeId: MinItemsTypeId,
      description: `an array of at least ${n} items`,
      jsonSchema: { minItems: n },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const MaxItemsTypeId: unique symbol = filters_.MaxItemsTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type MaxItemsTypeId = typeof MaxItemsTypeId

/**
 * @category ReadonlyArray filters
 * @since 1.0.0
 */
export const maxItems = <A>(
  n: number,
  annotations?: Annotations.Filter<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): Schema<ReadonlyArray<A>, I, R> =>
  self.pipe(
    filter((a): a is ReadonlyArray<A> => a.length <= n, {
      typeId: MaxItemsTypeId,
      description: `an array of at most ${n} items`,
      jsonSchema: { maxItems: n },
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const ItemsCountTypeId: unique symbol = filters_.ItemsCountTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type ItemsCountTypeId = typeof ItemsCountTypeId

/**
 * @category ReadonlyArray filters
 * @since 1.0.0
 */
export const itemsCount = <A>(
  n: number,
  annotations?: Annotations.Filter<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): Schema<ReadonlyArray<A>, I, R> =>
  self.pipe(
    filter((a): a is ReadonlyArray<A> => a.length === n, {
      typeId: ItemsCountTypeId,
      description: `an array of exactly ${n} item(s)`,
      jsonSchema: { minItems: n, maxItems: n },
      ...annotations
    })
  )

/**
 * @category ReadonlyArray transformations
 * @since 1.0.0
 */
export const getNumberIndexedAccess = <A extends ReadonlyArray<any>, I extends ReadonlyArray<any>, R>(
  self: Schema<A, I, R>
): Schema<A[number], I[number], R> => make(AST.getNumberIndexedAccess(self.ast))

/**
 * Get the first element of a `ReadonlyArray`, or `None` if the array is empty.
 *
 * @category ReadonlyArray transformations
 * @since 1.0.0
 */
export const head = <A, I, R>(self: Schema<ReadonlyArray<A>, I, R>): Schema<option_.Option<A>, I, R> =>
  transform(
    self,
    OptionFromSelf(getNumberIndexedAccess(typeSchema(self))),
    { decode: array_.head, encode: option_.match({ onNone: () => [], onSome: array_.of }) }
  )

/**
 * Retrieves the first element of a `ReadonlyArray`.
 *
 * If the array is empty, it returns the `fallback` argument if provided; otherwise, it fails.
 *
 * @category ReadonlyArray transformations
 * @since 1.0.0
 */
export const headOrElse: {
  <A>(fallback?: LazyArg<A>): <I, R>(self: Schema<ReadonlyArray<A>, I, R>) => Schema<A, I, R>
  <A, I, R>(self: Schema<ReadonlyArray<A>, I, R>, fallback?: LazyArg<A>): Schema<A, I, R>
} = dual(
  (args) => isSchema(args[0]),
  <A, I, R>(self: Schema<ReadonlyArray<A>, I, R>, fallback?: LazyArg<A>): Schema<A, I, R> =>
    transformOrFail(
      self,
      getNumberIndexedAccess(typeSchema(self)),
      {
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
 * @since 1.0.0
 */
export const ValidDateTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/ValidDate")

/**
 * A filter that **excludes invalid** dates (e.g., `new Date("Invalid Date")` is rejected).
 *
 * @category Date filters
 * @since 1.0.0
 */
export const validDate =
  (annotations?: Annotations.Filter<Date>) => <I, R>(self: Schema<Date, I, R>): Schema<Date, I, R> =>
    self.pipe(
      filter((a) => !Number.isNaN(a.getTime()), {
        typeId: ValidDateTypeId,
        description: "a valid Date",
        ...annotations
      })
    )

/**
 * @category api interface
 * @since 1.0.0
 */
export interface DateFromSelf extends Annotable<DateFromSelf, Date> {}

/**
 * Represents a schema for handling potentially **invalid** `Date` instances (e.g., `new Date("Invalid Date")` is not rejected).
 *
 * @category Date constructors
 * @since 1.0.0
 */
export const DateFromSelf: DateFromSelf = declare(
  Predicate.isDate,
  {
    identifier: "DateFromSelf",
    description: "a potentially invalid Date instance",
    pretty: (): pretty_.Pretty<Date> => (date) => `new Date(${JSON.stringify(date)})`,
    arbitrary: (): LazyArbitrary<Date> => (fc) => fc.date({ noInvalidDate: false }),
    equivalence: () => Equivalence.Date
  }
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface ValidDateFromSelf extends Annotable<ValidDateFromSelf, Date> {}

/**
 * Represents a schema for handling only **valid** dates. For example, `new Date("Invalid Date")` is rejected, even though it is an instance of `Date`.
 *
 * @category Date constructors
 * @since 1.0.0
 */
export const ValidDateFromSelf: ValidDateFromSelf = DateFromSelf.pipe(
  validDate({
    identifier: "ValidDateFromSelf",
    description: "a valid Date instance"
  })
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface DateFromString extends Annotable<DateFromString, Date, string> {}

/**
 * Represents a schema that converts a `string` into a (potentially invalid) `Date` (e.g., `new Date("Invalid Date")` is not rejected).
 *
 * @category Date transformations
 * @since 1.0.0
 */
export const DateFromString: DateFromString = transform(
  $String,
  DateFromSelf,
  { decode: (s) => new Date(s), encode: (n) => n.toISOString() }
).annotations({ identifier: "DateFromString" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $Date extends Annotable<$Date, Date, string> {}

const $Date: $Date = DateFromString.pipe(
  validDate({ identifier: "Date" })
)

export {
  /**
   * A schema that transforms a `string` into a **valid** `Date`, ensuring that invalid dates, such as `new Date("Invalid Date")`, are rejected.
   *
   * @category Date transformations
   * @since 1.0.0
   */
  $Date as Date
}

/**
 * @category Option utils
 * @since 1.0.0
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
  <R, A>(decodeUnknown: ParseResult.DecodeUnknown<A, R>): ParseResult.DeclarationDecodeUnknown<option_.Option<A>, R> =>
  (u, options, ast) =>
    option_.isOption(u) ?
      option_.isNone(u) ?
        ParseResult.succeed(option_.none())
        : ParseResult.map(decodeUnknown(u.value, options), option_.some)
      : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface OptionFromSelf<Value extends Schema.Any> extends
  Annotable<
    OptionFromSelf<Value>,
    option_.Option<Schema.Type<Value>>,
    option_.Option<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
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
 * @since 1.0.0
 */
export interface Option<Value extends Schema.Any> extends
  Annotable<
    Option<Value>,
    option_.Option<Schema.Type<Value>>,
    OptionEncoded<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const Option = <Value extends Schema.Any>(value: Value): Option<Value> => {
  const value_ = asSchema(value)
  return transform(
    optionEncoded(value_),
    OptionFromSelf(typeSchema(value_)),
    {
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
 * @since 1.0.0
 */
export interface OptionFromNullOr<Value extends Schema.Any> extends
  Annotable<
    OptionFromNullOr<Value>,
    option_.Option<Schema.Type<Value>>,
    Schema.Encoded<Value> | null,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const OptionFromNullOr = <Value extends Schema.Any>(
  value: Value
): OptionFromNullOr<Value> => {
  const value_ = asSchema(value)
  return transform(NullOr(value_), OptionFromSelf(typeSchema(value_)), {
    decode: option_.fromNullable,
    encode: option_.getOrNull
  })
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface OptionFromNullishOr<Value extends Schema.Any> extends
  Annotable<
    OptionFromNullishOr<Value>,
    option_.Option<Schema.Type<Value>>,
    Schema.Encoded<Value> | null | undefined,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const OptionFromNullishOr = <Value extends Schema.Any>(
  value: Value,
  onNoneEncoding: null | undefined
): OptionFromNullishOr<Value> => {
  const value_ = asSchema(value)
  return transform(
    NullishOr(value_),
    OptionFromSelf(typeSchema(value_)),
    { decode: option_.fromNullable, encode: onNoneEncoding === null ? option_.getOrNull : option_.getOrUndefined }
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface OptionFromUndefinedOr<Value extends Schema.Any> extends
  Annotable<
    OptionFromUndefinedOr<Value>,
    option_.Option<Schema.Type<Value>>,
    Schema.Encoded<Value> | undefined,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const OptionFromUndefinedOr = <Value extends Schema.Any>(
  value: Value
): OptionFromUndefinedOr<Value> => {
  const value_ = asSchema(value)
  return transform(UndefinedOr(value_), OptionFromSelf(typeSchema(value_)), {
    decode: option_.fromNullable,
    encode: option_.getOrUndefined
  })
}

/**
 * @category Either utils
 * @since 1.0.0
 */
export type RightEncoded<IA> = {
  readonly _tag: "Right"
  readonly right: IA
}

/**
 * @category Either utils
 * @since 1.0.0
 */
export type LeftEncoded<IE> = {
  readonly _tag: "Left"
  readonly left: IE
}

/**
 * @category Either utils
 * @since 1.0.0
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
      onLeft: (left) => ParseResult.map(decodeUnknownLeft(left, options), either_.left),
      onRight: (right) => ParseResult.map(parseRight(right, options), either_.right)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface EitherFromSelf<R extends Schema.Any, L extends Schema.Any> extends
  Annotable<
    EitherFromSelf<R, L>,
    either_.Either<Schema.Type<R>, Schema.Type<L>>,
    either_.Either<Schema.Encoded<R>, Schema.Encoded<L>>,
    Schema.Context<R> | Schema.Context<L>
  >
{}

/**
 * @category Either transformations
 * @since 1.0.0
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
 * @since 1.0.0
 */
export interface Either<R extends Schema.Any, L extends Schema.Any> extends
  Annotable<
    Either<R, L>,
    either_.Either<Schema.Type<R>, Schema.Type<L>>,
    EitherEncoded<Schema.Encoded<R>, Schema.Encoded<L>>,
    Schema.Context<R> | Schema.Context<L>
  >
{}

/**
 * @category Either transformations
 * @since 1.0.0
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
    { decode: eitherDecode, encode: either_.match({ onLeft: makeLeftEncoded, onRight: makeRightEncoded }) }
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface EitherFromUnion<R extends Schema.Any, L extends Schema.Any> extends
  Annotable<
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
 * @since 1.0.0
 */
export const EitherFromUnion = <R extends Schema.Any, L extends Schema.Any>({ left, right }: {
  readonly left: L
  readonly right: R
}): EitherFromUnion<R, L> => {
  const right_ = asSchema(right)
  const left_ = asSchema(left)
  const toright = typeSchema(right_)
  const toleft = typeSchema(left_)
  const fromRight = transform(right_, rightEncoded(toright), { decode: makeRightEncoded, encode: (r) => r.right })
  const fromLeft = transform(left_, leftEncoded(toleft), { decode: makeLeftEncoded, encode: (l) => l.left })
  return transform(
    Union(fromRight, fromLeft),
    EitherFromSelf({ left: toleft, right: toright }),
    {
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
    ParseResult.map(decodeUnknown(Array.from(u.entries()), options), (as): ReadonlyMap<K, V> => new Map(as))
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface ReadonlyMapFromSelf<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
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
      decode: (Key, Value) => readonlyMapParse(ParseResult.decodeUnknown($Array(Tuple(Key, Value)))),
      encode: (Key, Value) => readonlyMapParse(ParseResult.encodeUnknown($Array(Tuple(Key, Value))))
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
 * @since 1.0.0
 */
export const ReadonlyMapFromSelf = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): ReadonlyMapFromSelf<K, V> => mapFromSelf_(key, value, `ReadonlyMap<${format(key)}, ${format(value)}>`)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface MapFromSelf<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
    MapFromSelf<K, V>,
    Map<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyMap<Schema.Encoded<K>, Schema.Encoded<V>>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category Map
 * @since 1.0.0
 */
export const MapFromSelf = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): MapFromSelf<K, V> => mapFromSelf_(key, value, `Map<${format(key)}, ${format(value)}>`) as any

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $ReadonlyMap<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
    $ReadonlyMap<K, V>,
    ReadonlyMap<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyArray<readonly [Schema.Encoded<K>, Schema.Encoded<V>]>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category ReadonlyMap transformations
 * @since 1.0.0
 */
export const ReadonlyMap = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): $ReadonlyMap<K, V> => {
  const key_ = asSchema(key)
  const value_ = asSchema(value)
  return transform(
    $Array(Tuple(key_, value_)),
    ReadonlyMapFromSelf({ key: typeSchema(key_), value: typeSchema(value_) }),
    { decode: (as) => new Map(as), encode: (map) => Array.from(map.entries()) }
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $Map<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
    $Map<K, V>,
    Map<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyArray<readonly [Schema.Encoded<K>, Schema.Encoded<V>]>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

const map = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): $Map<K, V> => {
  const key_ = asSchema(key)
  const value_ = asSchema(value)
  return transform(
    $Array(Tuple(key_, value_)),
    MapFromSelf({ key: typeSchema(key_), value: typeSchema(value_) }),
    { decode: (as) => new Map(as), encode: (map) => Array.from(map.entries()) }
  )
}

export {
  /**
   * @category Map transformations
   * @since 1.0.0
   */
  map as Map
}

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

const readonlySetParse = <R, A>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<ReadonlySet<A>, R> =>
(u, options, ast) =>
  Predicate.isSet(u) ?
    ParseResult.map(decodeUnknown(Array.from(u.values()), options), (as): ReadonlySet<A> => new Set(as))
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface ReadonlySetFromSelf<Value extends Schema.Any> extends
  Annotable<
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
      decode: (item) => readonlySetParse(ParseResult.decodeUnknown($Array(item))),
      encode: (item) => readonlySetParse(ParseResult.encodeUnknown($Array(item)))
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
 * @since 1.0.0
 */
export const ReadonlySetFromSelf = <Value extends Schema.Any>(value: Value): ReadonlySetFromSelf<Value> =>
  setFromSelf_(value, `ReadonlySet<${format(value)}>`)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface SetFromSelf<Value extends Schema.Any> extends
  Annotable<
    SetFromSelf<Value>,
    Set<Schema.Type<Value>>,
    ReadonlySet<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Set
 * @since 1.0.0
 */
export const SetFromSelf = <Value extends Schema.Any>(value: Value): SetFromSelf<Value> =>
  setFromSelf_(value, `Set<${format(value)}>`) as any

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $ReadonlySet<Value extends Schema.Any> extends
  Annotable<
    $ReadonlySet<Value>,
    ReadonlySet<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category ReadonlySet transformations
 * @since 1.0.0
 */
export const ReadonlySet = <Value extends Schema.Any>(value: Value): $ReadonlySet<Value> => {
  const value_ = asSchema(value)
  return transform(
    $Array(value_),
    ReadonlySetFromSelf(typeSchema(value_)),
    { decode: (as) => new Set(as), encode: (set) => Array.from(set) }
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $Set<Value extends Schema.Any> extends
  Annotable<
    $Set<Value>,
    Set<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

const set = <Value extends Schema.Any>(value: Value): $Set<Value> => {
  const value_ = asSchema(value)
  return transform(
    $Array(value_),
    SetFromSelf(typeSchema(value_)),
    { decode: (as) => new Set(as), encode: (set) => Array.from(set) }
  )
}

export {
  /**
   * @category Set transformations
   * @since 1.0.0
   */
  set as Set
}

const bigDecimalPretty = (): pretty_.Pretty<bigDecimal_.BigDecimal> => (val) =>
  `BigDecimal(${bigDecimal_.format(bigDecimal_.normalize(val))})`

const bigDecimalArbitrary = (): LazyArbitrary<bigDecimal_.BigDecimal> => (fc) =>
  fc.tuple(fc.bigInt(), fc.integer()).map(([value, scale]) => bigDecimal_.make(value, scale))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BigDecimalFromSelf extends Annotable<BigDecimalFromSelf, bigDecimal_.BigDecimal> {}

/**
 * @category BigDecimal constructors
 * @since 1.0.0
 */
export const BigDecimalFromSelf: BigDecimalFromSelf = declare(
  bigDecimal_.isBigDecimal,
  {
    identifier: "BigDecimalFromSelf",
    pretty: bigDecimalPretty,
    arbitrary: bigDecimalArbitrary,
    equivalence: () => bigDecimal_.Equivalence
  }
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BigDecimal extends Annotable<BigDecimal, bigDecimal_.BigDecimal, string> {}

/**
 * @category BigDecimal transformations
 * @since 1.0.0
 */
export const BigDecimal: BigDecimal = transformOrFail(
  $String,
  BigDecimalFromSelf,
  {
    decode: (num, _, ast) =>
      bigDecimal_.fromString(num).pipe(option_.match({
        onNone: () => ParseResult.fail(new ParseResult.Type(ast, num)),
        onSome: (val) => ParseResult.succeed(bigDecimal_.normalize(val))
      })),
    encode: (val) => ParseResult.succeed(bigDecimal_.format(bigDecimal_.normalize(val)))
  }
).annotations({ identifier: "BigDecimal" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BigDecimalFromNumber extends Annotable<BigDecimalFromNumber, bigDecimal_.BigDecimal, number> {}

/**
 * A schema that transforms a `number` into a `BigDecimal`.
 * When encoding, this Schema will produce incorrect results if the BigDecimal exceeds the 64-bit range of a number.
 *
 * @category BigDecimal transformations
 * @since 1.0.0
 */
export const BigDecimalFromNumber: BigDecimalFromNumber = transformOrFail(
  $Number,
  BigDecimalFromSelf,
  {
    decode: (num) => ParseResult.succeed(bigDecimal_.fromNumber(num)),
    encode: (val) => ParseResult.succeed(bigDecimal_.unsafeToNumber(val))
  }
).annotations({ identifier: "BigDecimalFromNumber" })

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanBigDecimalTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/GreaterThanBigDecimal")

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const greaterThanBigDecimal = <A extends bigDecimal_.BigDecimal>(
  min: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => bigDecimal_.greaterThan(a, min), {
      typeId: { id: GreaterThanBigDecimalTypeId, annotation: { min } },
      description: `a BigDecimal greater than ${bigDecimal_.format(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/GreaterThanOrEqualToBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const greaterThanOrEqualToBigDecimal = <A extends bigDecimal_.BigDecimal>(
  min: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => bigDecimal_.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToBigDecimalTypeId, annotation: { min } },
      description: `a BigDecimal greater than or equal to ${bigDecimal_.format(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanBigDecimalTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/LessThanBigDecimal")

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const lessThanBigDecimal = <A extends bigDecimal_.BigDecimal>(
  max: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => bigDecimal_.lessThan(a, max), {
      typeId: { id: LessThanBigDecimalTypeId, annotation: { max } },
      description: `a BigDecimal less than ${bigDecimal_.format(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/LessThanOrEqualToBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const lessThanOrEqualToBigDecimal = <A extends bigDecimal_.BigDecimal>(
  max: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => bigDecimal_.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanOrEqualToBigDecimalTypeId, annotation: { max } },
      description: `a BigDecimal less than or equal to ${bigDecimal_.format(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const PositiveBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/PositiveBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const positiveBigDecimal = <A extends bigDecimal_.BigDecimal>(
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => bigDecimal_.isPositive(a), {
      typeId: { id: PositiveBigDecimalTypeId, annotation: {} },
      description: `a positive BigDecimal`,
      ...annotations
    })
  )

/**
 * @category BigDecimal constructors
 * @since 1.0.0
 */
export const PositiveBigDecimalFromSelf = BigDecimalFromSelf.pipe(
  positiveBigDecimal({
    identifier: "PositiveBigDecimalFromSelf",
    title: "PositiveBigDecimalFromSelf"
  })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const NonNegativeBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/NonNegativeBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const nonNegativeBigDecimal = <A extends bigDecimal_.BigDecimal>(
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a.value >= 0n, {
      typeId: { id: NonNegativeBigDecimalTypeId, annotation: {} },
      description: `a non-negative BigDecimal`,
      ...annotations
    })
  )

/**
 * @category BigDecimal constructors
 * @since 1.0.0
 */
export const NonNegativeBigDecimalFromSelf = BigDecimalFromSelf.pipe(
  nonNegativeBigDecimal({
    identifier: "NonNegativeBigDecimalFromSelf",
    title: "NonNegativeBigDecimalFromSelf"
  })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const NegativeBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/NegativeBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const negativeBigDecimal = <A extends bigDecimal_.BigDecimal>(
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => bigDecimal_.isNegative(a), {
      typeId: { id: NegativeBigDecimalTypeId, annotation: {} },
      description: `a negative BigDecimal`,
      ...annotations
    })
  )

/**
 * @category BigDecimal constructors
 * @since 1.0.0
 */
export const NegativeBigDecimalFromSelf = BigDecimalFromSelf.pipe(
  negativeBigDecimal({
    identifier: "NegativeBigDecimalFromSelf",
    title: "NegativeBigDecimalFromSelf"
  })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const NonPositiveBigDecimalTypeId: unique symbol = Symbol.for(
  "@effect/schema/TypeId/NonPositiveBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const nonPositiveBigDecimal = <A extends bigDecimal_.BigDecimal>(
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a.value <= 0n, {
      typeId: { id: NonPositiveBigDecimalTypeId, annotation: {} },
      description: `a non-positive BigDecimal`,
      ...annotations
    })
  )

/**
 * @category BigDecimal constructors
 * @since 1.0.0
 */
export const NonPositiveBigDecimalFromSelf = BigDecimalFromSelf.pipe(
  nonPositiveBigDecimal({
    identifier: "NonPositiveBigDecimalFromSelf",
    title: "NonPositiveBigDecimalFromSelf"
  })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const BetweenBigDecimalTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/BetweenBigDecimal")

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const betweenBigDecimal = <A extends bigDecimal_.BigDecimal>(
  minimum: bigDecimal_.BigDecimal,
  maximum: bigDecimal_.BigDecimal,
  annotations?: Annotations.Filter<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => bigDecimal_.between(a, { minimum, maximum }), {
      typeId: { id: BetweenBigDecimalTypeId, annotation: { maximum, minimum } },
      description: `a BigDecimal between ${bigDecimal_.format(minimum)} and ${bigDecimal_.format(maximum)}`,
      ...annotations
    })
  )

/**
 * Clamps a `BigDecimal` between a minimum and a maximum value.
 *
 * @category BigDecimal transformations
 * @since 1.0.0
 */
export const clampBigDecimal =
  (minimum: bigDecimal_.BigDecimal, maximum: bigDecimal_.BigDecimal) =>
  <R, I, A extends bigDecimal_.BigDecimal>(self: Schema<A, I, R>): Schema<A, I, R> =>
    transform(
      self,
      self.pipe(typeSchema, betweenBigDecimal(minimum, maximum)),
      { strict: false, decode: (self) => bigDecimal_.clamp(self, { minimum, maximum }), encode: identity }
    )

const chunkArbitrary = <A>(item: LazyArbitrary<A>): LazyArbitrary<chunk_.Chunk<A>> => (fc) =>
  fc.array(item(fc)).map(chunk_.fromIterable)

const chunkPretty = <A>(item: pretty_.Pretty<A>): pretty_.Pretty<chunk_.Chunk<A>> => (c) =>
  `Chunk(${chunk_.toReadonlyArray(c).map(item).join(", ")})`

const chunkParse = <R, A>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<chunk_.Chunk<A>, R> =>
(u, options, ast) =>
  chunk_.isChunk(u) ?
    chunk_.isEmpty(u) ?
      ParseResult.succeed(chunk_.empty())
      : ParseResult.map(decodeUnknown(chunk_.toReadonlyArray(u), options), chunk_.fromIterable)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface ChunkFromSelf<Value extends Schema.Any> extends
  Annotable<
    ChunkFromSelf<Value>,
    chunk_.Chunk<Schema.Type<Value>>,
    chunk_.Chunk<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Chunk transformations
 * @since 1.0.0
 */
export const ChunkFromSelf = <Value extends Schema.Any>(value: Value): ChunkFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (item) => chunkParse(ParseResult.decodeUnknown($Array(item))),
      encode: (item) => chunkParse(ParseResult.encodeUnknown($Array(item)))
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
 * @since 1.0.0
 */
export interface Chunk<Value extends Schema.Any> extends
  Annotable<
    Chunk<Value>,
    chunk_.Chunk<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Chunk transformations
 * @since 1.0.0
 */
export const Chunk = <Value extends Schema.Any>(value: Value): Chunk<Value> => {
  const value_ = asSchema(value)
  return transform(
    $Array(value_),
    ChunkFromSelf(typeSchema(value_)),
    { decode: (as) => as.length === 0 ? chunk_.empty() : chunk_.fromIterable(as), encode: chunk_.toReadonlyArray }
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
    ParseResult.map(decodeUnknown(u, options), toData)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category Data transformations
 * @since 1.0.0
 */
export const DataFromSelf = <
  R,
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<A, I, R>
): Schema<A, I, R> => {
  return declare(
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
}

/**
 * @category Data transformations
 * @since 1.0.0
 */
export const Data = <
  R,
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<A, I, R>
): Schema<A, I, R> =>
  transform(
    item,
    DataFromSelf(typeSchema(item)),
    { strict: false, decode: toData, encode: (a) => Array.isArray(a) ? Array.from(a) : Object.assign({}, a) }
  )

type MissingSelfGeneric<Usage extends string, Params extends string = ""> =
  `Missing \`Self\` generic - use \`class Self extends ${Usage}<Self>()(${Params}{ ... })\``

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Class<Self, Fields extends Struct.Fields, A, I, R, C, Inherited, Proto> extends Schema<Self, I, R> {
  new(
    props: keyof C extends never ? void | {} : C,
    disableValidation?: boolean | undefined
  ): A & Omit<Inherited, keyof A> & Proto

  readonly fields: { readonly [K in keyof Fields]: Fields[K] }

  readonly identifier: string

  readonly extend: <Extended = never>(identifier: string) => <newFields extends Struct.Fields>(
    fields: newFields,
    annotations?: Annotations.Schema<Extended>
  ) => [Extended] extends [never] ? MissingSelfGeneric<"Base.extend">
    : Class<
      Extended,
      Fields & newFields,
      Types.Simplify<A & Struct.Type<newFields>>,
      Types.Simplify<I & Struct.Encoded<newFields>>,
      R | Struct.Context<newFields>,
      Types.Simplify<C & Struct.Type<newFields>>,
      Self,
      Proto
    >

  readonly transformOrFail: <Transformed = never>(identifier: string) => <
    newFields extends Struct.Fields,
    R2,
    R3
  >(
    fields: newFields,
    options: {
      readonly decode: (
        input: A,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<Types.Simplify<A & Struct.Type<newFields>>, ParseResult.ParseIssue, R2>
      readonly encode: (
        input: Types.Simplify<A & Struct.Type<newFields>>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<A, ParseResult.ParseIssue, R3>
    },
    annotations?: Annotations.Schema<Transformed>
  ) => [Transformed] extends [never] ? MissingSelfGeneric<"Base.transform">
    : Class<
      Transformed,
      Fields & newFields,
      Types.Simplify<A & Struct.Type<newFields>>,
      I,
      R | Struct.Context<newFields> | R2 | R3,
      Types.Simplify<C & Struct.Type<newFields>>,
      Self,
      Proto
    >

  readonly transformOrFailFrom: <Transformed = never>(identifier: string) => <
    newFields extends Struct.Fields,
    R2,
    R3
  >(
    fields: newFields,
    options: {
      readonly decode: (
        input: I,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<Types.Simplify<I & Struct.Encoded<newFields>>, ParseResult.ParseIssue, R2>
      readonly encode: (
        input: Types.Simplify<I & Struct.Encoded<newFields>>,
        options: ParseOptions,
        ast: AST.Transformation
      ) => Effect.Effect<I, ParseResult.ParseIssue, R3>
    },
    annotations?: Annotations.Schema<Transformed>
  ) => [Transformed] extends [never] ? MissingSelfGeneric<"Base.transformFrom">
    : Class<
      Transformed,
      Fields & newFields,
      Types.Simplify<A & Struct.Type<newFields>>,
      I,
      R | Struct.Context<newFields> | R2 | R3,
      Types.Simplify<C & Struct.Type<newFields>>,
      Self,
      Proto
    >
}

/**
 * @category classes
 * @since 1.0.0
 */
export const Class = <Self = never>(identifier: string) =>
<Fields extends Struct.Fields>(
  fields: Fields,
  annotations?: Annotations.Schema<Self>
): [Self] extends [never] ? MissingSelfGeneric<"Class">
  : Class<
    Self,
    Fields,
    Types.Simplify<Struct.Type<Fields>>,
    Types.Simplify<Struct.Encoded<Fields>>,
    Struct.Context<Fields>,
    Types.Simplify<Struct.Type<Fields>>,
    {},
    {}
  > => makeClass({ kind: "Class", identifier, fields, Base: data_.Class, annotations })

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedClass = <Self = never>(identifier?: string) =>
<Tag extends string, Fields extends Struct.Fields>(
  tag: Tag,
  fields: Fields,
  annotations?: Annotations.Schema<Self>
): [Self] extends [never] ? MissingSelfGeneric<"TaggedClass", `"Tag", `>
  : Class<
    Self,
    { readonly _tag: Literal<[Tag]> } & Fields,
    Types.Simplify<{ readonly _tag: Tag } & Struct.Type<Fields>>,
    Types.Simplify<{ readonly _tag: Tag } & Struct.Encoded<Fields>>,
    Struct.Context<Fields>,
    Types.Simplify<Struct.Type<Fields>>,
    {},
    {}
  > =>
  makeClass({
    kind: "TaggedClass",
    identifier: identifier ?? tag,
    fields: extendFields({ _tag: Literal(tag) }, fields),
    Base: data_.Class,
    tag: { _tag: tag },
    annotations
  })

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedError = <Self = never>(identifier?: string) =>
<Tag extends string, Fields extends Struct.Fields>(
  tag: Tag,
  fields: Fields,
  annotations?: Annotations.Schema<Self>
): [Self] extends [never] ? MissingSelfGeneric<"TaggedError", `"Tag", `>
  : Class<
    Self,
    { readonly _tag: Literal<[Tag]> } & Fields,
    Types.Simplify<{ readonly _tag: Tag } & Struct.Type<Fields>>,
    Types.Simplify<{ readonly _tag: Tag } & Struct.Encoded<Fields>>,
    Struct.Context<Fields>,
    Types.Simplify<Struct.Type<Fields>>,
    {},
    cause_.YieldableError
  > =>
{
  class Base extends data_.Error {}
  ;(Base.prototype as any).name = tag
  return makeClass({
    kind: "TaggedError",
    identifier: identifier ?? tag,
    fields: extendFields({ _tag: Literal(tag) }, fields),
    Base,
    tag: { _tag: tag },
    annotations,
    toStringOverride(self) {
      if ((Predicate.isString(self.message) && self.message.length > 0)) {
        let message = `${self._tag}: ${self.message}`
        if (Predicate.isString(self.stack)) {
          message = `${message}\n${self.stack.split("\n").slice(1).join("\n")}`
        }
        return message
      }
    }
  })
}

/**
 * @category classes
 * @since 1.0.0
 */
export interface TaggedRequest<Tag extends string, S, SI, SR, A, AI, E, EI, RR>
  extends Request.Request<A, E>, Serializable.SerializableWithResult<S, SI, SR, A, AI, E, EI, RR>
{
  readonly _tag: Tag
}

/**
 * @category classes
 * @since 1.0.0
 */
export declare namespace TaggedRequest {
  /**
   * @category classes
   * @since 1.0.0
   */
  export type Any =
    | TaggedRequest<string, any, any, any, any, any, any, any, any>
    | TaggedRequest<string, any, any, any, any, any, never, never, any>
}

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedRequest =
  <Self = never>(identifier?: string) =>
  <Tag extends string, Fields extends Struct.Fields, EA, EI, ER, AA, AI, AR>(
    tag: Tag,
    Failure: Schema<EA, EI, ER>,
    Success: Schema<AA, AI, AR>,
    fields: Fields,
    annotations?: Annotations.Schema<Self>
  ): [Self] extends [never] ? MissingSelfGeneric<"TaggedRequest", `"Tag", SuccessSchema, FailureSchema, `>
    : Class<
      Self,
      { readonly _tag: Literal<[Tag]> } & Fields,
      Types.Simplify<{ readonly _tag: Tag } & Struct.Type<Fields>>,
      Types.Simplify<{ readonly _tag: Tag } & Struct.Encoded<Fields>>,
      Struct.Context<Fields>,
      Types.Simplify<Struct.Type<Fields>>,
      TaggedRequest<
        Tag,
        Self,
        { readonly _tag: Tag } & Struct.Encoded<Fields>,
        Struct.Context<Fields>,
        AA,
        AI,
        EA,
        EI,
        ER | AR
      >,
      {}
    > =>
  {
    class SerializableRequest extends Request.Class<any, any, { readonly _tag: string }> {
      get [serializable_.symbol]() {
        return this.constructor
      }
      get [serializable_.symbolResult]() {
        return { Failure, Success }
      }
    }
    return makeClass({
      kind: "TaggedRequest",
      identifier: identifier ?? tag,
      fields: extendFields({ _tag: Literal(tag) }, fields),
      Base: SerializableRequest,
      tag: { _tag: tag },
      annotations
    })
  }

const extendFields = (a: Struct.Fields, b: Struct.Fields): Struct.Fields => {
  const out = { ...a }
  for (const name of util_.ownKeys(b)) {
    if (name in a) {
      throw new Error(errors_.getDuplicatePropertySignatureErrorMessage(name))
    }
    out[name] = b[name]
  }
  return out
}

const makeClass = ({ Base, annotations, fields, fromSchema, identifier, kind, tag, toStringOverride }: {
  kind: string
  identifier: string
  fields: Struct.Fields
  Base: new(...args: ReadonlyArray<any>) => any
  fromSchema?: Schema.Any | undefined
  tag?: { _tag: AST.LiteralValue } | undefined
  annotations?: Annotations.Schema<any> | undefined
  toStringOverride?: (self: any) => string | undefined
}): any => {
  const classSymbol = Symbol.for(`@effect/schema/${kind}/${identifier}`)
  const schema = fromSchema ?? Struct(fields)
  const from = option_.match(AST.getTitleAnnotation(schema.ast), {
    onNone: () => schema.annotations({ title: `${identifier} (Encoded side)` }),
    onSome: () => schema
  })

  return class extends Base {
    constructor(
      props: { [x: string | symbol]: unknown } = {},
      disableValidation: boolean = false
    ) {
      if (tag !== undefined) {
        props = { ...props, ...tag }
      }
      if (disableValidation !== true) {
        props = ParseResult.validateSync(schema)(props)
      }
      super(props, true)
    }

    // ----------------
    // Schema interface
    // ----------------

    static [TypeId] = variance

    static get ast() {
      const toSchema = typeSchema(schema)
      const guard = ParseResult.is(toSchema)
      const fallbackInstanceOf = (u: unknown) => Predicate.hasProperty(u, classSymbol) && guard(u)
      const encode = ParseResult.encodeUnknown(toSchema)
      const declaration: Schema.Any = declare(
        [toSchema],
        {
          decode: () => (input, _, ast) =>
            input instanceof this || fallbackInstanceOf(input)
              ? ParseResult.succeed(input)
              : ParseResult.fail(new ParseResult.Type(ast, input)),
          encode: () => (input, options) =>
            input instanceof this
              ? ParseResult.succeed(input)
              : ParseResult.map(
                encode(input, options),
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
          [AST.SurrogateAnnotationId]: toSchema.ast,
          ...annotations
        }
      )
      const transformation = transform(
        from,
        declaration,
        { decode: (input) => new this(input, true), encode: identity }
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
      return `(${String(from)} <-> ${identifier})`
    }

    // ----------------
    // Class interface
    // ----------------

    static fields = { ...fields }

    static identifier = identifier

    static extend<Extended>(identifier: string) {
      return (newFields: Struct.Fields, annotations?: Annotations.Schema<Extended>) => {
        const extendedFields = extendFields(fields, newFields)
        return makeClass({
          kind,
          identifier,
          fields: extendedFields,
          Base: this,
          tag,
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
          fromSchema: transformOrFail(
            schema,
            typeSchema(Struct(transformedFields)),
            options
          ),
          fields: transformedFields,
          Base: this,
          tag,
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
          fromSchema: transformOrFail(
            encodedSchema(schema),
            Struct(transformedFields),
            options
          ),
          fields: transformedFields,
          Base: this,
          tag,
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

    toString() {
      if (toStringOverride !== undefined) {
        const out = toStringOverride(this)
        if (out !== undefined) {
          return out
        }
      }
      return `${identifier}({ ${
        util_.ownKeys(fields).map((p: any) => `${util_.formatPropertyKey(p)}: ${util_.formatUnknown(this[p])}`)
          .join(", ")
      } })`
    }
  }
}

/**
 * @category FiberId
 * @since 1.0.0
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
 * @category api interface
 * @since 1.0.0
 */
export interface FiberIdFromSelf extends Annotable<FiberIdFromSelf, fiberId_.FiberId> {}

/**
 * @category FiberId constructors
 * @since 1.0.0
 */
export const FiberIdFromSelf: FiberIdFromSelf = declare(
  fiberId_.isFiberId,
  {
    identifier: "FiberIdFromSelf",
    pretty: () => fiberIdPretty,
    arbitrary: () => fiberIdArbitrary
  }
)

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
 * @category api interface
 * @since 1.0.0
 */
export interface FiberId extends Annotable<FiberId, fiberId_.FiberId, FiberIdEncoded> {}

/**
 * @category FiberId transformations
 * @since 1.0.0
 */
export const FiberId: FiberId = transform(
  FiberIdEncoded,
  FiberIdFromSelf,
  { decode: fiberIdDecode, encode: fiberIdEncode }
).annotations({ identifier: "FiberId" })

/**
 * @category Cause utils
 * @since 1.0.0
 */
export type CauseEncoded<E> =
  | {
    readonly _tag: "Empty"
  }
  | {
    readonly _tag: "Fail"
    readonly error: E
  }
  | {
    readonly _tag: "Die"
    readonly defect: unknown
  }
  | {
    readonly _tag: "Interrupt"
    readonly fiberId: FiberIdEncoded
  }
  | {
    readonly _tag: "Sequential"
    readonly left: CauseEncoded<E>
    readonly right: CauseEncoded<E>
  }
  | {
    readonly _tag: "Parallel"
    readonly left: CauseEncoded<E>
    readonly right: CauseEncoded<E>
  }

const causeDieEncoded = <R>(defect: Schema<unknown, unknown, R>) =>
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

const causeParallelEncoded = <E, EI, R>(causeEncoded: Schema<CauseEncoded<E>, CauseEncoded<EI>, R>) =>
  Struct({
    _tag: Literal("Parallel"),
    left: causeEncoded,
    right: causeEncoded
  })

const causeSequentialEncoded = <E, EI, R>(causeEncoded: Schema<CauseEncoded<E>, CauseEncoded<EI>, R>) =>
  Struct({
    _tag: Literal("Sequential"),
    left: causeEncoded,
    right: causeEncoded
  })

const causeEncoded = <E, EI, R1, R2>(
  error: Schema<E, EI, R1>,
  defect: Schema<unknown, unknown, R2>
): Schema<CauseEncoded<E>, CauseEncoded<EI>, R1 | R2> => {
  const recur = suspend(() => out)
  const out: Schema<CauseEncoded<E>, CauseEncoded<EI>, R1 | R2> = Union(
    CauseEmptyEncoded,
    causeFailEncoded(error),
    causeDieEncoded(defect),
    CauseInterruptEncoded,
    causeSequentialEncoded(recur),
    causeParallelEncoded(recur)
  ).annotations({ description: `CauseEncoded<${format(error)}>` })
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

const causeParse = <R, A>(
  decodeUnknown: ParseResult.DecodeUnknown<CauseEncoded<A>, R>
): ParseResult.DeclarationDecodeUnknown<cause_.Cause<A>, R> =>
(u, options, ast) =>
  cause_.isCause(u) ?
    ParseResult.map(decodeUnknown(causeEncode(u), options), causeDecode)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface CauseFromSelf<E extends Schema.Any, DR> extends
  Annotable<
    CauseFromSelf<E, DR>,
    cause_.Cause<Schema.Type<E>>,
    cause_.Cause<Schema.Encoded<E>>,
    Schema.Context<E> | DR
  >
{}

/**
 * @category Cause transformations
 * @since 1.0.0
 */
export const CauseFromSelf = <E extends Schema.Any, DR = never>({ defect = Unknown, error }: {
  readonly error: E
  readonly defect?: Schema<unknown, unknown, DR> | undefined
}): CauseFromSelf<E, DR> => {
  return declare(
    [error, defect],
    {
      decode: (error, defect) => causeParse(ParseResult.decodeUnknown(causeEncoded(error, defect))),
      encode: (error, defect) => causeParse(ParseResult.encodeUnknown(causeEncoded(error, defect)))
    },
    {
      description: `Cause<${format(error)}>`,
      pretty: causePretty,
      arbitrary: causeArbitrary
    }
  )
}

function causeDecode<E>(cause: CauseEncoded<E>): cause_.Cause<E> {
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

function causeEncode<E>(cause: cause_.Cause<E>): CauseEncoded<E> {
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
 * @category Cause transformations
 * @since 1.0.0
 */
export const CauseDefectUnknown: Unknown = transform(
  Unknown,
  Unknown,
  {
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
        }
      }
      return String(defect)
    }
  }
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Cause<E extends Schema.All, DR> extends
  Annotable<
    Cause<E, DR>,
    cause_.Cause<Schema.Type<E>>,
    CauseEncoded<Schema.Encoded<E>>,
    Schema.Context<E> | DR
  >
{}

/**
 * @category Cause transformations
 * @since 1.0.0
 */
export const Cause = <E extends Schema.All, DR = never>({ defect = CauseDefectUnknown, error }: {
  readonly error: E
  readonly defect?: Schema<unknown, unknown, DR> | undefined
}): Cause<E, DR> => {
  const error_ = asSchema(error)
  return transform(
    causeEncoded(error_, defect),
    CauseFromSelf({ error: typeSchema(error_), defect: typeSchema(defect) }),
    { decode: causeDecode, encode: causeEncode }
  )
}

/**
 * @category Exit utils
 * @since 1.0.0
 */
export type ExitEncoded<A, E> =
  | {
    readonly _tag: "Failure"
    readonly cause: CauseEncoded<E>
  }
  | {
    readonly _tag: "Success"
    readonly value: A
  }

const exitFailureEncoded = <E, EI, ER, DR>(
  error: Schema<E, EI, ER>,
  defect: Schema<unknown, unknown, DR>
) =>
  Struct({
    _tag: Literal("Failure"),
    cause: causeEncoded(error, defect)
  }).annotations({ description: `FailureEncoded<${format(error)}>` })

const exitSuccessEncoded = <A, I, R>(
  value: Schema<A, I, R>
) =>
  Struct({
    _tag: Literal("Success"),
    value
  }).annotations({ description: `SuccessEncoded<${format(value)}>` })

const exitEncoded = <A, I, R, E, EI, ER, DR>(
  value: Schema<A, I, R>,
  error: Schema<E, EI, ER>,
  defect: Schema<unknown, unknown, DR>
): Schema<ExitEncoded<A, E>, ExitEncoded<I, EI>, ER | R | DR> =>
  Union(
    exitFailureEncoded(error, defect),
    exitSuccessEncoded(value)
  ).annotations({
    description: `ExitEncoded<${format(value)}, ${format(error)}>`
  })

const exitDecode = <A, E>(input: ExitEncoded<A, E>): exit_.Exit<A, E> => {
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
      onFailure: (cause) => ParseResult.map(decodeUnknownCause(cause, options), exit_.failCause),
      onSuccess: (value) => ParseResult.map(decodeUnknownValue(value, options), exit_.succeed)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface ExitFromSelf<A extends Schema.Any, E extends Schema.Any, DR> extends
  Annotable<
    ExitFromSelf<A, E, DR>,
    exit_.Exit<Schema.Type<A>, Schema.Type<E>>,
    exit_.Exit<Schema.Encoded<A>, Schema.Encoded<E>>,
    Schema.Context<A> | Schema.Context<E> | DR
  >
{}

/**
 * @category Exit transformations
 * @since 1.0.0
 */
export const ExitFromSelf = <A extends Schema.Any, E extends Schema.Any, DR = never>(
  { defect = Unknown, failure, success }: {
    readonly failure: E
    readonly success: A
    readonly defect?: Schema<unknown, unknown, DR> | undefined
  }
): ExitFromSelf<A, E, DR> =>
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
      description: `Exit<${format(success)}, ${format(failure)}>`,
      pretty: exitPretty,
      arbitrary: exitArbitrary
    }
  )

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Exit<A extends Schema.All, E extends Schema.All, DR> extends
  Annotable<
    Exit<A, E, DR>,
    exit_.Exit<Schema.Type<A>, Schema.Type<E>>,
    ExitEncoded<Schema.Encoded<A>, Schema.Encoded<E>>,
    Schema.Context<A> | Schema.Context<E> | DR
  >
{}

/**
 * @category Exit transformations
 * @since 1.0.0
 */
export const Exit = <A extends Schema.All, E extends Schema.All, DR = never>(
  { defect = CauseDefectUnknown, failure, success }: {
    readonly failure: E
    readonly success: A
    readonly defect?: Schema<unknown, unknown, DR> | undefined
  }
): Exit<A, E, DR> => {
  const success_ = asSchema(success)
  const failure_ = asSchema(failure)
  return transform(
    exitEncoded(success_, failure_, defect),
    ExitFromSelf({ failure: typeSchema(failure_), success: typeSchema(success_), defect: typeSchema(defect) }),
    {
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

const hashSetParse = <R, A>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<hashSet_.HashSet<A>, R> =>
(u, options, ast) =>
  hashSet_.isHashSet(u) ?
    ParseResult.map(
      decodeUnknown(Array.from(u), options),
      (as): hashSet_.HashSet<A> => hashSet_.fromIterable(as)
    )
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface HashSetFromSelf<Value extends Schema.Any> extends
  Annotable<
    HashSetFromSelf<Value>,
    hashSet_.HashSet<Schema.Type<Value>>,
    hashSet_.HashSet<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category HashSet transformations
 * @since 1.0.0
 */
export const HashSetFromSelf = <Value extends Schema.Any>(
  value: Value
): HashSetFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (item) => hashSetParse(ParseResult.decodeUnknown($Array(item))),
      encode: (item) => hashSetParse(ParseResult.encodeUnknown($Array(item)))
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
 * @since 1.0.0
 */
export interface HashSet<Value extends Schema.Any> extends
  Annotable<
    HashSet<Value>,
    hashSet_.HashSet<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category HashSet transformations
 * @since 1.0.0
 */
export const HashSet = <Value extends Schema.Any>(value: Value): HashSet<Value> => {
  const value_ = asSchema(value)
  return transform(
    $Array(value_),
    HashSetFromSelf(typeSchema(value_)),
    { decode: (as) => hashSet_.fromIterable(as), encode: (set) => Array.from(set) }
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
    ParseResult.map(decodeUnknown(Array.from(u), options), (as): hashMap_.HashMap<K, V> => hashMap_.fromIterable(as))
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface HashMapFromSelf<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
    HashMapFromSelf<K, V>,
    hashMap_.HashMap<Schema.Type<K>, Schema.Type<V>>,
    hashMap_.HashMap<Schema.Encoded<K>, Schema.Encoded<V>>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category HashMap transformations
 * @since 1.0.0
 */
export const HashMapFromSelf = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): HashMapFromSelf<K, V> => {
  return declare(
    [key, value],
    {
      decode: (key, value) => hashMapParse(ParseResult.decodeUnknown($Array(Tuple(key, value)))),
      encode: (key, value) => hashMapParse(ParseResult.encodeUnknown($Array(Tuple(key, value))))
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
 * @since 1.0.0
 */
export interface HashMap<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
    HashMap<K, V>,
    hashMap_.HashMap<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyArray<readonly [Schema.Encoded<K>, Schema.Encoded<V>]>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category HashMap transformations
 * @since 1.0.0
 */
export const HashMap = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): HashMap<K, V> => {
  const key_ = asSchema(key)
  const value_ = asSchema(value)
  return transform(
    $Array(Tuple(key_, value_)),
    HashMapFromSelf({ key: typeSchema(key_), value: typeSchema(value_) }),
    { decode: (as) => hashMap_.fromIterable(as), encode: (map) => Array.from(map) }
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

const listParse = <R, A>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<list_.List<A>, R> =>
(u, options, ast) =>
  list_.isList(u) ?
    ParseResult.map(
      decodeUnknown(Array.from(u), options),
      (as): list_.List<A> => list_.fromIterable(as)
    )
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface ListFromSelf<Value extends Schema.Any> extends
  Annotable<
    ListFromSelf<Value>,
    list_.List<Schema.Type<Value>>,
    list_.List<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category List transformations
 * @since 1.0.0
 */
export const ListFromSelf = <Value extends Schema.Any>(
  value: Value
): ListFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (item) => listParse(ParseResult.decodeUnknown($Array(item))),
      encode: (item) => listParse(ParseResult.encodeUnknown($Array(item)))
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
 * @since 1.0.0
 */
export interface List<Value extends Schema.Any> extends
  Annotable<
    List<Value>,
    list_.List<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category List transformations
 * @since 1.0.0
 */
export const List = <Value extends Schema.Any>(value: Value): List<Value> => {
  const value_ = asSchema(value)
  return transform(
    $Array(value_),
    ListFromSelf(typeSchema(value_)),
    { decode: (as) => list_.fromIterable(as), encode: (set) => Array.from(set) }
  )
}

const sortedSetArbitrary =
  <A>(item: LazyArbitrary<A>, ord: Order.Order<A>): LazyArbitrary<sortedSet_.SortedSet<A>> => (fc) =>
    fc.array(item(fc)).map((as) => sortedSet_.fromIterable(as, ord))

const sortedSetPretty = <A>(item: pretty_.Pretty<A>): pretty_.Pretty<sortedSet_.SortedSet<A>> => (set) =>
  `new SortedSet([${Array.from(sortedSet_.values(set)).map((a) => item(a)).join(", ")}])`

const sortedSetParse = <R, A>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>,
  ord: Order.Order<A>
): ParseResult.DeclarationDecodeUnknown<sortedSet_.SortedSet<A>, R> =>
(u, options, ast) =>
  sortedSet_.isSortedSet(u) ?
    ParseResult.map(decodeUnknown(Array.from(sortedSet_.values(u)), options), (as): sortedSet_.SortedSet<A> =>
      sortedSet_.fromIterable(as, ord))
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface SortedSetFromSelf<Value extends Schema.Any> extends
  Annotable<
    SortedSetFromSelf<Value>,
    sortedSet_.SortedSet<Schema.Type<Value>>,
    sortedSet_.SortedSet<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category SortedSet transformations
 * @since 1.0.0
 */
export const SortedSetFromSelf = <Value extends Schema.Any>(
  value: Value,
  ordA: Order.Order<Schema.Type<Value>>,
  ordI: Order.Order<Schema.Encoded<Value>>
): SortedSetFromSelf<Value> => {
  return declare(
    [value],
    {
      decode: (item) => sortedSetParse(ParseResult.decodeUnknown($Array(item)), ordA),
      encode: (item) => sortedSetParse(ParseResult.encodeUnknown($Array(item)), ordI)
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
 * @since 1.0.0
 */
export interface SortedSet<Value extends Schema.Any> extends
  Annotable<
    SortedSet<Value>,
    sortedSet_.SortedSet<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category SortedSet transformations
 * @since 1.0.0
 */
export const SortedSet = <Value extends Schema.Any>(
  value: Value,
  ordA: Order.Order<Schema.Type<Value>>
): SortedSet<Value> => {
  const value_ = asSchema(value)
  const to = typeSchema(value_)
  return transform(
    $Array(value_),
    SortedSetFromSelf<typeof to>(to, ordA, ordA),
    { decode: (as) => sortedSet_.fromIterable(as, ordA), encode: (set) => Array.from(sortedSet_.values(set)) }
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BooleanFromUnknown extends Annotable<BooleanFromUnknown, boolean, unknown> {}

/**
 * Converts an arbitrary value to a `boolean` by testing whether it is truthy.
 * Uses `!!val` to coerce the value to a `boolean`.
 *
 * @see https://developer.mozilla.org/docs/Glossary/Truthy
 * @category boolean constructors
 * @since 1.0.0
 */
export const BooleanFromUnknown: BooleanFromUnknown = transform(
  Unknown,
  $Boolean,
  { decode: Predicate.isTruthy, encode: identity }
).annotations({ identifier: "BooleanFromUnknown" })
