/**
 * @since 1.0.0
 */

import * as _bigDecimal from "effect/BigDecimal"
import * as _bigInt from "effect/BigInt"
import * as Brand from "effect/Brand"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as _duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Encoding from "effect/Encoding"
import * as Equal from "effect/Equal"
import * as Equivalence from "effect/Equivalence"
import * as Exit from "effect/Exit"
import * as _fiberId from "effect/FiberId"
import type { LazyArg } from "effect/Function"
import { dual, identity } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as List from "effect/List"
import * as N from "effect/Number"
import * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Request from "effect/Request"
import * as _secret from "effect/Secret"
import * as S from "effect/String"
import type { Covariant, Invariant, NoInfer, UnionToIntersection } from "effect/Types"
import type { Arbitrary } from "./Arbitrary.js"
import * as arbitrary from "./Arbitrary.js"
import type { ParseOptions } from "./AST.js"
import * as AST from "./AST.js"
import * as _equivalence from "./Equivalence.js"
import * as _filters from "./internal/filters.js"
import * as _hooks from "./internal/hooks.js"
import * as _schema from "./internal/schema.js"
import * as _serializable from "./internal/serializable.js"
import * as _util from "./internal/util.js"
import * as Parser from "./Parser.js"
import * as ParseResult from "./ParseResult.js"
import * as Pretty from "./Pretty.js"
import type * as Serializable from "./Serializable.js"
import * as TreeFormatter from "./TreeFormatter.js"

/**
 * Required to fix a bug in TypeScript@5.0, dtslint fails with:
 * TypeScript@5.0 expected type to be:
 *   { readonly [x: string]: number; }
 * got:
 *   { [x: string]: number; }
 *
 * @example
 * import type { Simplify } from "effect/Types"
 *
 * // $ExpectType { readonly [x: string]: number; }
 * type Test = Simplify<{ readonly [x: string]: number }>
 *
 * @since 1.0.0
 */
export type Simplify<T> = { readonly [K in keyof T]: T[K] } & {}

/**
 * @since 1.0.0
 * @category symbol
 */
export const TypeId: unique symbol = _schema.TypeId

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
  annotations(annotations: Annotations<A>): Schema<A, I, R>
}

/**
 * @since 1.0.0
 */
export declare namespace Annotable {
  /**
   * @since 1.0.0
   */
  export type Self<S extends Any> = ReturnType<S["annotations"]>

  /**
   * @since 1.0.0
   */
  export type Any = Annotable<any, any, any, unknown> | Annotable<any, never>
}

/**
 * @since 1.0.0
 */
export interface Annotable<Self extends Schema<A, I, R>, A, I = A, R = never> extends Schema<A, I, R> {
  annotations(annotations: Annotations<A>): Self
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
      readonly _A: Invariant<A>
      readonly _I: Invariant<I>
      readonly _R: Covariant<R>
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
  export type ToAsserts<S extends Schema.Any<never>> = (
    input: unknown,
    options?: AST.ParseOptions
  ) => asserts input is Schema.Type<S>

  /**
   * @since 1.0.0
   */
  export type Any<R = unknown> = Schema<any, any, R>

  /**
   * @since 1.0.0
   */
  export type All<R = unknown> = Any<R> | $never
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
} from "./Parser.js"
/* c8 ignore end */

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknown = <A, I, R>(
  schema: Schema<A, I, R>,
  options?: ParseOptions
) => {
  const encodeUnknown = Parser.encodeUnknown(schema, options)
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
  const encodeUnknownEither = Parser.encodeUnknownEither(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Either.Either<I, ParseResult.ParseError> =>
    Either.mapLeft(encodeUnknownEither(u, overrideOptions), ParseResult.parseError)
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
) => (a: A, overrideOptions?: ParseOptions) => Either.Either<I, ParseResult.ParseError> = encodeUnknownEither

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
  return (u: unknown, overrideOptions?: ParseOptions): Either.Either<A, ParseResult.ParseError> =>
    Either.mapLeft(decodeUnknownEither(u, overrideOptions), ParseResult.parseError)
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
) => (i: I, overrideOptions?: ParseOptions) => Either.Either<A, ParseResult.ParseError> = decodeUnknownEither

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
  const validate = Parser.validate(schema, options)
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
  const validateEither = Parser.validateEither(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Either.Either<A, ParseResult.ParseError> =>
    Either.mapLeft(validateEither(u, overrideOptions), ParseResult.parseError)
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
  Predicate.hasProperty(u, TypeId) && !(PropertySignatureTypeId in u)

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <A, I = A, R = never>(ast: AST.AST) => Schema<A, I, R> = _schema.make

/**
 * @category api interface
 * @since 1.0.0
 */
export interface literal<Literals extends ReadonlyArray.NonEmptyReadonlyArray<AST.LiteralValue>>
  extends Annotable<literal<Literals>, Literals[number]>
{
  readonly literals: Readonly<Literals>
}

class $literal<Literals extends ReadonlyArray.NonEmptyReadonlyArray<AST.LiteralValue>>
  extends _schema.Schema<Literals[number]>
  implements literal<Literals>
{
  static ast = <Literals extends ReadonlyArray.NonEmptyReadonlyArray<AST.LiteralValue>>(
    literals: Literals
  ): AST.AST => {
    return AST.isMembers(literals)
      ? AST.Union.make(AST.mapMembers(literals, (literal) => new AST.Literal(literal)))
      : new AST.Literal(literals[0])
  }
  constructor(readonly literals: Literals, ast: AST.AST = $literal.ast(literals)) {
    super(ast)
  }
  annotations(annotations: Annotations<Literals[number]>) {
    return new $literal(this.literals, _schema.annotations(this.ast, annotations))
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export function literal<Literals extends ReadonlyArray.NonEmptyReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
): literal<Literals>
export function literal(): $never
export function literal<Literals extends ReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
): Schema<Literals[number]>
export function literal<Literals extends ReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
): Schema<Literals[number]> | $never {
  return ReadonlyArray.isNonEmptyReadonlyArray(literals) ? new $literal(literals) : never
}

/**
 * Creates a new `Schema` from a literal schema.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 * import { Either } from "effect"
 *
 * const schema = S.literal("a", "b", "c").pipe(S.pickLiteral("a", "b"))
 *
 * assert.deepStrictEqual(S.decodeSync(schema)("a"), "a")
 * assert.deepStrictEqual(S.decodeSync(schema)("b"), "b")
 * assert.strictEqual(Either.isLeft(S.decodeUnknownEither(schema)("c")), true)
 *
 * @category constructors
 * @since 1.0.0
 */
export const pickLiteral =
  <A extends AST.LiteralValue, L extends ReadonlyArray.NonEmptyReadonlyArray<A>>(...literals: L) =>
  <I, R>(_schema: Schema<A, I, R>): literal<[...L]> => literal(...literals)

/**
 * @category constructors
 * @since 1.0.0
 */
export const uniqueSymbolFromSelf = <S extends symbol>(symbol: S): Schema<S> => make(new AST.UniqueSymbol(symbol))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface enums<A extends { [x: string]: string | number }> extends Annotable<enums<A>, A[keyof A]> {}

/**
 * @category constructors
 * @since 1.0.0
 */
export const enums = <A extends { [x: string]: string | number }>(enums: A): enums<A> =>
  make(
    new AST.Enums(
      Object.keys(enums).filter(
        (key) => typeof enums[enums[key]] !== "number"
      ).map((key) => [key, enums[key]])
    )
  )

type Join<T> = T extends [infer Head, ...infer Tail]
  ? `${Head & (string | number | bigint | boolean | null | undefined)}${Tail extends [] ? ""
    : Join<Tail>}`
  : never

/**
 * @category constructors
 * @since 1.0.0
 */
export const templateLiteral = <T extends [Schema.Any<never>, ...Array<Schema.Any<never>>]>(
  ...[head, ...tail]: T
): Schema<Join<{ [K in keyof T]: Schema.Type<T[K]> }>> => {
  let types: ReadonlyArray<AST.TemplateLiteral | AST.Literal> = getTemplateLiterals(head.ast)
  for (const span of tail) {
    types = ReadonlyArray.flatMap(
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
      ReadonlyArray.modifyNonEmptyLast(
        a.spans,
        (span) => new AST.TemplateLiteralSpan(span.type, span.literal + String(b.literal))
      )
    )
  }
  return AST.TemplateLiteral.make(
    a.head,
    ReadonlyArray.appendAll(
      ReadonlyArray.modifyNonEmptyLast(
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
      return ReadonlyArray.flatMap(ast.types, getTemplateLiterals)
    default:
      throw new Error(`templateLiteral: unsupported template literal span (${ast})`)
  }
}

const declareConstructor = <
  const TypeParameters extends ReadonlyArray<Schema.Any>,
  I,
  A
>(
  typeParameters: TypeParameters,
  decodeUnknown: (
    ...typeParameters: {
      readonly [K in keyof TypeParameters]: Schema<
        Schema.Type<TypeParameters[K]>,
        Schema.Encoded<TypeParameters[K]>,
        never
      >
    }
  ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<A, ParseResult.ParseIssue, never>,
  encodeUnknown: (
    ...typeParameters: {
      readonly [K in keyof TypeParameters]: Schema<
        Schema.Type<TypeParameters[K]>,
        Schema.Encoded<TypeParameters[K]>,
        never
      >
    }
  ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<I, ParseResult.ParseIssue, never>,
  annotations?: Annotations<A, TypeParameters>
): Schema<A, I, Schema.Context<TypeParameters[number]>> =>
  make(
    new AST.Declaration(
      typeParameters.map((tp) => tp.ast),
      (...typeParameters) => decodeUnknown(...typeParameters.map((ast) => make(ast)) as any),
      (...typeParameters) => encodeUnknown(...typeParameters.map((ast) => make(ast)) as any),
      _schema.toASTAnnotations(annotations)
    )
  )

const declarePrimitive = <A>(
  is: (input: unknown) => input is A,
  annotations?: Annotations<A>
): Schema<A> => {
  const decodeUnknown = () => (input: unknown, _: ParseOptions, ast: AST.Declaration) =>
    is(input) ? ParseResult.succeed(input) : ParseResult.fail(new ParseResult.Type(ast, input))
  const encodeUnknown = decodeUnknown
  return make(new AST.Declaration([], decodeUnknown, encodeUnknown, _schema.toASTAnnotations(annotations)))
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
    annotations?: Annotations<A>
  ): Schema<A>
  <const P extends ReadonlyArray<Schema.Any>, I, A>(
    typeParameters: P,
    decodeUnknown: (
      ...typeParameters: { readonly [K in keyof P]: Schema<Schema.Type<P[K]>, Schema.Encoded<P[K]>, never> }
    ) => (
      input: unknown,
      options: ParseOptions,
      ast: AST.Declaration
    ) => Effect.Effect<A, ParseResult.ParseIssue, never>,
    encodeUnknown: (
      ...typeParameters: { readonly [K in keyof P]: Schema<Schema.Type<P[K]>, Schema.Encoded<P[K]>, never> }
    ) => (
      input: unknown,
      options: ParseOptions,
      ast: AST.Declaration
    ) => Effect.Effect<I, ParseResult.ParseIssue, never>,
    annotations?: Annotations<A, { readonly [K in keyof P]: Schema.Type<P[K]> }>
  ): Schema<A, I, Schema.Context<P[number]>>
} = function() {
  if (Array.isArray(arguments[0])) {
    const typeParameters = arguments[0]
    const decodeUnknown = arguments[1]
    const encodeUnknown = arguments[2]
    const annotations = arguments[3]
    return declareConstructor(typeParameters, decodeUnknown, encodeUnknown, annotations)
  }
  const is = arguments[0]
  const annotations = arguments[1]
  return declarePrimitive(is, annotations)
} as any

/**
 * @category type id
 * @since 1.0.0
 */
export const BrandTypeId = Symbol.for("@effect/schema/TypeId/Brand")

/**
 * @category constructors
 * @since 1.0.0
 */
export const fromBrand = <C extends Brand.Brand<string | symbol>>(
  constructor: Brand.Brand.Constructor<C>,
  annotations?: FilterAnnotations<Brand.Brand.Unbranded<C>>
) =>
<R, I, A extends Brand.Brand.Unbranded<C>>(self: Schema<A, I, R>): Schema<A & C, I, R> =>
  make(
    new AST.Refinement(
      self.ast,
      (a: A, _: ParseOptions, ast: AST.AST): Option.Option<ParseResult.ParseIssue> => {
        const either = constructor.either(a)
        return Either.isLeft(either) ?
          Option.some(new ParseResult.Type(ast, a, either.left.map((v) => v.message).join(", "))) :
          Option.none()
      },
      _schema.toASTAnnotations({ typeId: { id: BrandTypeId, annotation: { constructor } }, ...annotations })
    )
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const InstanceOfTypeId = Symbol.for("@effect/schema/TypeId/InstanceOf")

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
  annotations?: Annotations<InstanceType<A>>
): instanceOf<InstanceType<A>> =>
  declare(
    (u): u is InstanceType<A> => u instanceof constructor,
    {
      title: constructor.name,
      description: `an instance of ${constructor.name}`,
      pretty: (): Pretty.Pretty<InstanceType<A>> => String,
      typeId: { id: InstanceOfTypeId, annotation: { constructor } },
      ...annotations
    }
  )

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $undefined extends Annotable<$undefined, undefined> {}

const $undefined: $undefined = make(AST.undefinedKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $void extends Annotable<$void, void> {}

const $void: $void = make(AST.voidKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $null extends Annotable<$null, null> {}

const $null: $null = make(AST._null)

export {
  /**
   * @category primitives
   * @since 1.0.0
   */
  $null as null,
  /**
   * @category primitives
   * @since 1.0.0
   */
  $undefined as undefined,
  /**
   * @category primitives
   * @since 1.0.0
   */
  $void as void
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $never extends Annotable<$never, never> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const never: $never = make(AST.neverKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $unknown extends Annotable<$unknown, unknown> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const unknown: $unknown = make(AST.unknownKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $any extends Annotable<$any, any> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const any: $any = make(AST.anyKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $string extends Annotable<$string, string> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const string: $string = make(AST.stringKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $number extends Annotable<$number, number> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const number: $number = make(AST.numberKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $boolean extends Annotable<$boolean, boolean> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const boolean: $boolean = make(AST.booleanKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface bigintFromSelf extends Annotable<bigintFromSelf, bigint> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const bigintFromSelf: bigintFromSelf = make(AST.bigIntKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface symbolFromSelf extends Annotable<symbolFromSelf, symbol> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const symbolFromSelf: symbolFromSelf = make(AST.symbolKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $object extends Annotable<$object, object> {}

/**
 * @category primitives
 * @since 1.0.0
 */
export const object: $object = make(AST.objectKeyword)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface union<Members extends ReadonlyArray<Schema.Any>> extends
  Annotable<
    union<Members>,
    Schema.Type<Members[number]>,
    Schema.Encoded<Members[number]>,
    Schema.Context<Members[number]>
  >
{
  readonly members: Readonly<Members>
}

class $union<Members extends ReadonlyArray<Schema.Any>>
  extends _schema.Schema<Schema.Type<Members[number]>, Schema.Encoded<Members[number]>, Schema.Context<Members[number]>>
  implements union<Members>
{
  static ast = <Members extends ReadonlyArray<Schema.Any>>(members: Members): AST.AST => {
    return AST.Union.make(members.map((m) => m.ast))
  }
  constructor(readonly members: Members, ast: AST.AST = $union.ast(members)) {
    super(ast)
  }
  annotations(annotations: Annotations<Schema.Type<Members[number]>>): union<Members> {
    return new $union(this.members, _schema.annotations(this.ast, annotations))
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function union<Members extends AST.Members<Schema.Any>>(...members: Members): union<Members>
export function union<Member extends Schema.Any>(member: Member): Member
export function union(): $never
export function union<Members extends ReadonlyArray<Schema.Any>>(
  ...members: Members
): Schema<Schema.Type<Members[number]>, Schema.Encoded<Members[number]>, Schema.Context<Members[number]>>
export function union<Members extends ReadonlyArray<Schema.Any>>(
  ...members: Members
): Schema<Schema.Type<Members[number]>, Schema.Encoded<Members[number]>, Schema.Context<Members[number]>> | $never {
  return AST.isMembers(members)
    ? new $union(members)
    : ReadonlyArray.isNonEmptyReadonlyArray(members)
    ? members[0] as any
    : never
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullable = <A, I, R>(self: Schema<A, I, R>): union<[Schema<A, I, R>, $null]> => union(self, $null)

/**
 * @category combinators
 * @since 1.0.0
 */
export const orUndefined = <A, I, R>(self: Schema<A, I, R>): union<[Schema<A, I, R>, $undefined]> =>
  union(self, $undefined)

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullish = <A, I, R>(self: Schema<A, I, R>): union<[Schema<A, I, R>, $null, $undefined]> =>
  union(self, $null, $undefined)

/**
 * @category combinators
 * @since 1.0.0
 */
export const keyof = <A, I, R>(self: Schema<A, I, R>): Schema<keyof A> =>
  make<keyof A>(AST.keyof(self.ast)).annotations({ description: `keyof<${format(self)}>` })

/**
 * @since 1.0.0
 */
export interface OptionalElement<E extends Schema.Any> {
  readonly optionalElement: E
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
  export type Elements = ReadonlyArray<Schema.Any | OptionalElement<Schema.Any>>

  /**
   * @since 1.0.0
   */
  export type Type<
    Elements extends TupleType.Elements,
    Rest extends Schema.Any,
    RestElements extends ReadonlyArray<Schema.Any>
  > = [Rest] extends [never] ? ElementsType<Elements> :
    Readonly<[
      ...ElementsType<Elements>,
      ...ReadonlyArray<Schema.Type<Rest>>,
      ...{ readonly [K in keyof RestElements]: Schema.Type<RestElements[K]> }
    ]>

  /**
   * @since 1.0.0
   */
  export type Encoded<
    Elements extends TupleType.Elements,
    Rest extends Schema.Any,
    RestElements extends ReadonlyArray<Schema.Any>
  > = [Rest] extends [never] ? ElementsEncoded<Elements> :
    Readonly<[
      ...ElementsEncoded<Elements>,
      ...ReadonlyArray<Schema.Encoded<Rest>>,
      ...{ readonly [K in keyof RestElements]: Schema.Encoded<RestElements[K]> }
    ]>
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface tupleType<
  Elements extends TupleType.Elements,
  Rest extends Schema.Any,
  RestElements extends ReadonlyArray<Schema.Any>
> extends
  Annotable<
    tupleType<Elements, Rest, RestElements>,
    TupleType.Type<Elements, Rest, RestElements>,
    TupleType.Encoded<Elements, Rest, RestElements>,
    Schema.Context<Elements[number]> | Schema.Context<Rest> | Schema.Context<RestElements[number]>
  >
{
  readonly elements: Elements
  readonly rest: Rest
  readonly restElements: RestElements
}

/**
 * @since 1.0.0
 */
export const oe = <E extends Schema.Any>(self: E): OptionalElement<E> => ({
  optionalElement: self
})

/**
 * @since 1.0.0
 */
export const tupleType = <
  const Elements extends TupleType.Elements,
  Rest extends Schema.Any,
  const RestElements extends ReadonlyArray<Schema.Any>
>(_elements: Elements, _rest: Rest, _restElements: RestElements): tupleType<Elements, Rest, RestElements> => {
  return null as any
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface tuple<Elements extends TupleType.Elements> extends
  Annotable<
    tuple<Elements>,
    TupleType.Type<Elements, never, []>,
    TupleType.Encoded<Elements, never, []>,
    Schema.Context<Elements[number]>
  >
{
  readonly elements: Readonly<Elements>
  annotations(annotations: Annotations<TupleType.Type<Elements, never, []>>): tuple<Elements>
}

class $tuple<Elements extends TupleType.Elements> extends _schema.Schema<
  TupleType.Type<Elements, never, []>,
  TupleType.Encoded<Elements, never, []>,
  Schema.Context<Elements[number]>
> implements tuple<Elements> {
  static ast = <Elements extends TupleType.Elements>(elements: Elements): AST.AST => {
    return new AST.Tuple(
      elements.map((schema) =>
        isSchema(schema) ? new AST.Element(schema.ast, false) : new AST.Element(schema.optionalElement.ast, true)
      ),
      Option.none(),
      true
    )
  }
  constructor(readonly elements: Elements, ast: AST.AST = $tuple.ast(elements)) {
    super(ast)
  }
  annotations(annotations: Annotations<TupleType.Type<Elements, never, []>>): tuple<Elements> {
    return new $tuple(this.elements, _schema.annotations(this.ast, annotations))
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const tuple = <Elements extends ReadonlyArray<Schema.Any>>(...elements: Elements): tuple<Elements> =>
  new $tuple(elements)

/**
 * @category combinators
 * @since 1.0.0
 */
export const rest =
  <B, IB, R2>(rest: Schema<B, IB, R2>) =>
  <A extends ReadonlyArray<any>, I extends ReadonlyArray<any>, R1>(
    self: Schema<A, I, R1>
  ): Schema<readonly [...A, ...Array<B>], readonly [...I, ...Array<IB>], R1 | R2> =>
    make(AST.appendRestElement(self.ast, rest.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const element =
  <B, IB, R2>(element: Schema<B, IB, R2>) =>
  <A extends ReadonlyArray<any>, I extends ReadonlyArray<any>, R1>(
    self: Schema<A, I, R1>
  ): Schema<readonly [...A, B], readonly [...I, IB], R1 | R2> =>
    make(AST.appendElement(self.ast, new AST.Element(element.ast, false)))

/**
 * @category combinators
 * @since 1.0.0
 */
export const optionalElement =
  <B, IB, R2>(element: Schema<B, IB, R2>) =>
  <A extends ReadonlyArray<any>, I extends ReadonlyArray<any>, R1>(
    self: Schema<A, I, R1>
  ): Schema<readonly [...A, B?], readonly [...I, IB?], R1 | R2> => {
    if (AST.isTuple(self.ast)) {
      return make(AST.appendElement(self.ast, new AST.Element(element.ast, true)))
    }
    throw new Error("`optionalElement` is not supported on this schema")
  }

/**
 * @category api interface
 * @since 1.0.0
 */
export interface array<Value extends Schema.Any> extends
  Annotable<
    array<Value>,
    ReadonlyArray<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{
  readonly value: Value
}

class $array<Value extends Schema.Any>
  extends _schema.Schema<ReadonlyArray<Schema.Type<Value>>, ReadonlyArray<Schema.Encoded<Value>>, Schema.Context<Value>>
  implements array<Value>
{
  static ast = <Value extends Schema.Any>(value: Value): AST.AST => {
    return new AST.Tuple([], Option.some([value.ast]), true)
  }
  constructor(readonly value: Value, ast: AST.AST = $array.ast(value)) {
    super(ast)
  }
  annotations(annotations: Annotations<ReadonlyArray<Schema.Type<Value>>>): array<Value> {
    return new $array(this.value, _schema.annotations(this.ast, annotations))
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const array = <Value extends Schema.Any>(value: Value): array<Value> => new $array(value)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface nonEmptyArray<Value extends Schema.Any> extends
  Annotable<
    nonEmptyArray<Value>,
    ReadonlyArray.NonEmptyReadonlyArray<Schema.Type<Value>>,
    ReadonlyArray.NonEmptyReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{
  readonly value: Value
}

class $nonEmptyArray<Value extends Schema.Any> extends _schema.Schema<
  ReadonlyArray.NonEmptyReadonlyArray<Schema.Type<Value>>,
  ReadonlyArray.NonEmptyReadonlyArray<Schema.Encoded<Value>>,
  Schema.Context<Value>
> implements nonEmptyArray<Value> {
  static ast = <Value extends Schema.Any>(value: Value): AST.AST => {
    return new AST.Tuple(
      [new AST.Element(value.ast, false)],
      Option.some([value.ast]),
      true
    )
  }
  constructor(readonly value: Value, ast: AST.AST = $nonEmptyArray.ast(value)) {
    super(ast)
  }
  annotations(annotations: Annotations<ReadonlyArray.NonEmptyReadonlyArray<Schema.Type<Value>>>): nonEmptyArray<Value> {
    return new $nonEmptyArray(this.value, _schema.annotations(this.ast, annotations))
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const nonEmptyArray = <Value extends Schema.Any>(value: Value): nonEmptyArray<Value> => new $nonEmptyArray(value)

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
  export type Any<Key extends PropertyKey = PropertyKey> =
    | PropertySignature<Token, any, Key, Token, any, unknown>
    | PropertySignature<Token, never, Key, Token, never, unknown>

  /**
   * @since 1.0.0
   */
  export type AST =
    | PropertySignatureDeclaration
    | PropertySignatureTransformation
}

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
    readonly ast: AST.AST,
    readonly isOptional: boolean,
    readonly annotations?: AST.Annotations | undefined
  ) {}
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
    readonly from: {
      readonly ast: AST.AST
      readonly isOptional: boolean
      readonly annotations?: AST.Annotations | undefined
      readonly key?: PropertyKey | undefined
    },
    readonly to: {
      readonly ast: AST.AST
      readonly isOptional: boolean
      readonly annotations?: AST.Annotations | undefined
    },
    readonly decode: AST.PropertySignatureTransformation["decode"],
    readonly encode: AST.PropertySignatureTransformation["encode"]
  ) {}
}

/**
 * @since 1.0.0
 * @category symbol
 */
export const PropertySignatureTypeId: unique symbol = _schema.PropertySignatureTypeId

/**
 * @since 1.0.0
 * @category symbol
 */
export type PropertySignatureTypeId = typeof PropertySignatureTypeId

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
    annotations: PropertySignatureAnnotations<Type>
  ): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, R>
}

class $PropertySignature<
  TypeToken extends PropertySignature.Token,
  Type,
  Key extends PropertyKey,
  EncodedToken extends PropertySignature.Token,
  Encoded,
  R = never
> implements PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, R> {
  readonly [TypeId]: Schema.Variance<Type, Encoded, R>[TypeId] = _schema.variance
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
    annotations: PropertySignatureAnnotations<Type>
  ): PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, R> {
    const ast = this.ast
    switch (ast._tag) {
      case "PropertySignatureDeclaration":
        return new $PropertySignature(
          new PropertySignatureDeclaration(ast.ast, ast.isOptional, { ...ast.annotations, ...annotations })
        )
      case "PropertySignatureTransformation":
        return new $PropertySignature(
          new PropertySignatureTransformation(
            ast.from,
            {
              ...ast.to,
              annotations: { ...ast.to.annotations, ...annotations }
            },
            ast.decode,
            ast.encode
          )
        )
    }
  }
}

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export const propertySignatureDeclaration = <A, I, R, IsOptional extends boolean = false>(options: {
  readonly schema: Schema<A, I, R>
  readonly isOptional?: IsOptional | undefined
  readonly annotations?: Annotations<A> | undefined
}): PropertySignature<PropertySignature.GetToken<IsOptional>, A, never, PropertySignature.GetToken<IsOptional>, I, R> =>
  new $PropertySignature(
    new PropertySignatureDeclaration(
      options.schema.ast,
      options.isOptional ?? false,
      _schema.toASTAnnotations(options.annotations)
    )
  )

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export const propertySignatureTransformation = <
  FA,
  FI,
  FR,
  FromIsOptional extends boolean,
  TA,
  TI,
  TR,
  ToIsOptional extends boolean,
  const Key extends PropertyKey = never
>(
  from: {
    readonly schema: Schema<FA, FI, FR>
    readonly isOptional: FromIsOptional
    readonly annotations?: Annotations<FA> | undefined
    readonly key?: Key | undefined
  },
  to: {
    readonly schema: Schema<TA, TI, TR>
    readonly isOptional: ToIsOptional
  },
  decode: (o: Option.Option<FA>) => Option.Option<TI>,
  encode: (o: Option.Option<TI>) => Option.Option<FA>
): PropertySignature<
  PropertySignature.GetToken<ToIsOptional>,
  TA,
  Key,
  PropertySignature.GetToken<FromIsOptional>,
  FI,
  FR | TR
> =>
  new $PropertySignature(
    new PropertySignatureTransformation(
      {
        ast: from.schema.ast,
        isOptional: from.isOptional,
        annotations: _schema.toASTAnnotations(from.annotations),
        key: from.key
      },
      {
        ast: to.schema.ast,
        isOptional: to.isOptional
      },
      decode,
      encode
    )
  )

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export const propertySignatureKey: {
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
      return new $PropertySignature(
        new PropertySignatureTransformation(
          {
            ast: ast.ast,
            isOptional: ast.isOptional,
            annotations: ast.annotations,
            key
          },
          {
            ast: AST.typeAST(ast.ast),
            isOptional: ast.isOptional
          },
          identity,
          identity
        )
      )
    }
    case "PropertySignatureTransformation":
      return new $PropertySignature(
        new PropertySignatureTransformation(
          {
            ast: ast.from.ast,
            isOptional: ast.from.isOptional,
            annotations: ast.from.annotations,
            key
          },
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
  from: {
    readonly schema: Schema<FA, FI, FR>
    readonly annotations?: Annotations<FA> | undefined
  },
  to: Schema<TA, TI, TR>,
  decode: (o: Option.Option<FA>) => TI,
  encode: (ti: TI) => Option.Option<FA>
): PropertySignature<":", TA, never, "?:", FI, FR | TR> =>
  propertySignatureTransformation(
    {
      schema: from.schema,
      isOptional: true,
      annotations: from.annotations
    },
    {
      schema: to,
      isOptional: false
    },
    (o) => Option.some(decode(o)),
    Option.flatMap(encode)
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
  from: {
    readonly schema: Schema<FA, FI, FR>
    readonly annotations?: Annotations<FA> | undefined
  },
  to: Schema<TA, TI, TR>,
  decode: (o: Option.Option<FA>) => Option.Option<TI>,
  encode: (o: Option.Option<TI>) => Option.Option<FA>
): PropertySignature<"?:", TA, never, "?:", FI, FR | TR> =>
  propertySignatureTransformation(
    {
      schema: from.schema,
      isOptional: true,
      annotations: from.annotations
    },
    {
      schema: to,
      isOptional: true
    },
    decode,
    encode
  )

/**
 * @category PropertySignature
 * @since 1.0.0
 */
export const optional: {
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly default: () => A
      readonly nullable: true
      readonly encodedAnnotations?: Annotations<A | null>
    }
  ): PropertySignature<":", A, never, "?:", I | null, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly default: () => A
      readonly encodedAnnotations?: Annotations<A>
    }
  ): PropertySignature<":", A, never, "?:", I, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly nullable: true
      readonly as: "Option"
      readonly encodedAnnotations?: Annotations<A | null>
    }
  ): PropertySignature<":", Option.Option<A>, never, "?:", I | null, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly as: "Option"
      readonly encodedAnnotations?: Annotations<A>
    }
  ): PropertySignature<":", Option.Option<A>, never, "?:", I, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly nullable: true
      readonly encodedAnnotations?: Annotations<A>
    }
  ): PropertySignature<"?:", A, never, "?:", I | null, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
    }
  ): PropertySignature<"?:", A, never, "?:", I, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly default: () => A
      readonly nullable: true
      readonly encodedAnnotations?: Annotations<A | null | undefined>
    }
  ): PropertySignature<":", A, never, "?:", I | null | undefined, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly nullable: true
      readonly as: "Option"
      readonly encodedAnnotations?: Annotations<A | null | undefined>
    }
  ): PropertySignature<":", Option.Option<A>, never, "?:", I | null | undefined, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly as: "Option"
      readonly encodedAnnotations?: Annotations<A | undefined>
    }
  ): PropertySignature<":", Option.Option<A>, never, "?:", I | undefined, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly default: () => A
      readonly encodedAnnotations?: Annotations<A | undefined>
    }
  ): PropertySignature<":", A, never, "?:", I | undefined, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly nullable: true
      readonly encodedAnnotations?: Annotations<A | undefined>
    }
  ): PropertySignature<"?:", A | undefined, never, "?:", I | null | undefined, R>
  <A, I, R>(
    schema: Schema<A, I, R>
  ): PropertySignature<"?:", A | undefined, never, "?:", I | undefined, R>
} = <A, I, R>(
  schema: Schema<A, I, R>,
  options?: {
    readonly exact?: true
    readonly default?: () => A
    readonly nullable?: true
    readonly as?: "Option"
    readonly encodedAnnotations?: Annotations<any>
  }
): PropertySignature<any, any, never, any, any, any> => {
  const isExact = options?.exact
  const defaultValue = options?.default
  const isNullable = options?.nullable
  const asOption = options?.as == "Option"
  const annotations = options?.encodedAnnotations

  if (isExact) {
    if (defaultValue) {
      if (isNullable) {
        return optionalToRequired(
          { schema: nullable(schema), annotations },
          typeSchema(schema),
          Option.match({ onNone: defaultValue, onSome: (a) => a === null ? defaultValue() : a }),
          Option.some
        )
      } else {
        return optionalToRequired(
          { schema, annotations },
          typeSchema(schema),
          Option.match({ onNone: defaultValue, onSome: identity }),
          Option.some
        )
      }
    } else if (asOption) {
      if (isNullable) {
        return optionalToRequired(
          { schema: nullable(schema), annotations },
          optionFromSelf(typeSchema(schema)),
          Option.filter(Predicate.isNotNull),
          identity
        )
      } else {
        return optionalToRequired(
          { schema, annotations },
          optionFromSelf(typeSchema(schema)),
          identity,
          identity
        )
      }
    } else {
      if (isNullable) {
        return optionalToOptional(
          { schema: nullable(schema), annotations },
          typeSchema(schema),
          Option.filter(Predicate.isNotNull),
          identity
        )
      } else {
        return propertySignatureDeclaration({ schema, isOptional: true })
      }
    }
  } else {
    if (defaultValue) {
      if (isNullable) {
        return optionalToRequired(
          { schema: nullish(schema), annotations },
          typeSchema(schema),
          Option.match({ onNone: defaultValue, onSome: (a) => (a == null ? defaultValue() : a) }),
          Option.some
        )
      } else {
        return optionalToRequired(
          { schema: orUndefined(schema), annotations },
          typeSchema(schema),
          Option.match({ onNone: defaultValue, onSome: (a) => (a === undefined ? defaultValue() : a) }),
          Option.some
        )
      }
    } else if (asOption) {
      if (isNullable) {
        return optionalToRequired(
          { schema: nullish(schema), annotations },
          optionFromSelf(typeSchema(schema)),
          Option.filter<A | null | undefined, A>((a): a is A => a != null),
          identity
        )
      } else {
        return optionalToRequired(
          { schema: orUndefined(schema), annotations },
          optionFromSelf(typeSchema(schema)),
          Option.filter(Predicate.isNotUndefined),
          identity
        )
      }
    } else {
      if (isNullable) {
        return optionalToOptional(
          { schema: nullish(schema), annotations },
          orUndefined(typeSchema(schema)),
          Option.filter(Predicate.isNotNull),
          identity
        )
      } else {
        return propertySignatureDeclaration({ schema: orUndefined(schema), isOptional: true })
      }
    }
  }
}

/**
 * @since 1.0.0
 */
export declare namespace Struct {
  /**
   * @since 1.0.0
   */
  export type Fields = Record<
    PropertyKey,
    | Schema.All
    | PropertySignature.Any
  >

  type Key<F extends Fields, K extends keyof F> = [K] extends [never] ? never :
    F[K] extends PropertySignature.Any<infer Key> ? [Key] extends [never] ? K : Key :
    K

  type EncodedTokenKeys<Fields extends Struct.Fields> = {
    [K in keyof Fields]: Fields[K] extends
      | PropertySignature<PropertySignature.Token, any, PropertyKey, "?:", any, unknown>
      | PropertySignature<PropertySignature.Token, never, PropertyKey, "?:", never, unknown> ? K
      : never
  }[keyof Fields]

  type TypeTokenKeys<Fields extends Struct.Fields> = {
    [K in keyof Fields]: Fields[K] extends
      | PropertySignature<"?:", any, PropertyKey, PropertySignature.Token, any, unknown>
      | PropertySignature<"?:", never, PropertyKey, PropertySignature.Token, never, unknown> ? K
      : never
  }[keyof Fields]

  /**
   * @since 1.0.0
   */
  export type Type<F extends Fields, OptionalKeys extends PropertyKey = TypeTokenKeys<F>> =
    & { readonly [K in Exclude<keyof F, OptionalKeys>]: Schema.Type<F[K]> }
    & { readonly [K in OptionalKeys]?: Schema.Type<F[K]> }

  /**
   * @since 1.0.0
   */
  export type Encoded<F extends Fields, OptionalKeys extends PropertyKey = EncodedTokenKeys<F>> =
    & { readonly [K in Exclude<keyof F, OptionalKeys> as Key<F, K>]: Schema.Encoded<F[K]> }
    & { readonly [K in OptionalKeys as Key<F, K>]?: Schema.Encoded<F[K]> }

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
  export type NonEmptyRecords = ReadonlyArray.NonEmptyReadonlyArray<Record>

  /**
   * @since 1.0.0
   */
  export type Type<
    Records extends IndexSignature.Records
  > = UnionToIntersection<
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
  > = UnionToIntersection<
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
export interface typeLiteral<
  Fields extends Struct.Fields,
  Records extends IndexSignature.Records
> extends
  Annotable<
    typeLiteral<Fields, Records>,
    Simplify<TypeLiteral.Type<Fields, Records>>,
    Simplify<TypeLiteral.Encoded<Fields, Records>>,
    | Struct.Context<Fields>
    | IndexSignature.Context<Records>
  >
{
  readonly fields: Simplify<Fields>
  readonly records: Simplify<Records>
}

const isPropertySignature = (u: unknown): u is PropertySignature.Any =>
  Predicate.hasProperty(u, PropertySignatureTypeId)

/** @internal */
export class $typeLiteral<
  Fields extends Struct.Fields,
  const Records extends IndexSignature.Records
> extends _schema.Schema<
  Simplify<TypeLiteral.Type<Fields, Records>>,
  Simplify<TypeLiteral.Encoded<Fields, Records>>,
  | Struct.Context<Fields>
  | IndexSignature.Context<Records>
> implements typeLiteral<Fields, Records> {
  static ast = <
    Fields extends Struct.Fields,
    const Records extends IndexSignature.Records
  >(fields: Fields, records: Records): AST.AST => {
    const ownKeys = _util.ownKeys(fields)
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
              const type = ast.ast
              const isOptional = ast.isOptional
              const toAnnotations = _schema.toASTAnnotations(ast.annotations)
              from.push(new AST.PropertySignature(key, type, isOptional, true))
              to.push(new AST.PropertySignature(key, AST.typeAST(type), isOptional, true, toAnnotations))
              pss.push(new AST.PropertySignature(key, type, isOptional, true, toAnnotations))
              break
            }
            case "PropertySignatureTransformation": {
              const fromKey = ast.from.key ?? key
              from.push(
                new AST.PropertySignature(
                  fromKey,
                  ast.from.ast,
                  ast.from.isOptional,
                  true,
                  _schema.toASTAnnotations(ast.from.annotations)
                )
              )
              to.push(
                new AST.PropertySignature(
                  key,
                  ast.to.ast,
                  ast.to.isOptional,
                  true,
                  _schema.toASTAnnotations(ast.to.annotations)
                )
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
      if (ReadonlyArray.isNonEmptyReadonlyArray(transformations)) {
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
            issTo.push(AST.IndexSignature.make(is.parameter, AST.typeAST(is.type), is.isReadonly))
          })
        }
        return new AST.Transform(
          AST.TypeLiteral.make(from, issFrom),
          AST.TypeLiteral.make(to, issTo),
          AST.TypeLiteralTransformation.make(transformations)
        )
      }
    }
    const iss: Array<AST.IndexSignature> = []
    for (const r of records) {
      const { indexSignatures, propertySignatures } = AST.record(r.key.ast, r.value.ast)
      propertySignatures.forEach((ps) => pss.push(ps))
      indexSignatures.forEach((is) => iss.push(is))
    }
    return AST.TypeLiteral.make(pss, iss)
  }
  constructor(
    readonly fields: Fields,
    readonly records: Records,
    ast: AST.AST = $typeLiteral.ast(fields, records)
  ) {
    super(ast)
  }
  annotations(
    annotations: Annotations<Simplify<TypeLiteral.Type<Fields, Records>>>
  ): typeLiteral<Fields, Records> {
    return new $typeLiteral(this.fields, this.records, _schema.annotations(this.ast, annotations))
  }
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface struct<Fields extends Struct.Fields> extends typeLiteral<Fields, []> {
  annotations(annotations: Annotations<Simplify<Struct.Type<Fields>>>): struct<Fields>
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function struct<Fields extends Struct.Fields, const Records extends IndexSignature.NonEmptyRecords>(
  fields: Fields,
  ...records: Records
): typeLiteral<Fields, Records>
export function struct<Fields extends Struct.Fields>(fields: Fields): struct<Fields>
export function struct<Fields extends Struct.Fields, const Records extends IndexSignature.Records>(
  fields: Fields,
  ...records: Records
): typeLiteral<Fields, Records> {
  return new $typeLiteral(fields, records)
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface record<K extends Schema.All, V extends Schema.All> extends typeLiteral<{}, [{ key: K; value: V }]> {
  readonly key: K
  readonly value: V
  annotations(annotations: Annotations<Simplify<TypeLiteral.Type<{}, [{ key: K; value: V }]>>>): record<K, V>
}

class $record<K extends Schema.All, V extends Schema.All> extends $typeLiteral<
  {},
  [{ key: K; value: V }]
> implements record<K, V> {
  constructor(readonly key: K, readonly value: V, ast?: AST.AST) {
    super({}, [{ key, value }], ast)
  }
  annotations(annotations: Annotations<Simplify<TypeLiteral.Type<{}, [{ key: K; value: V }]>>>): record<K, V> {
    return new $record(this.key, this.value, _schema.annotations(this.ast, annotations))
  }
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const record = <K extends Schema.All, V extends Schema.All>(key: K, value: V): record<K, V> =>
  new $record(key, value)

/**
 * @category struct transformations
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
<R, I extends { [K in keyof A]?: any }>(
  self: Schema<A, I, R>
): Schema<Simplify<Pick<A, Keys[number]>>, Simplify<Pick<I, Keys[number]>>, R> => {
  const ast = self.ast
  if (AST.isTransform(ast)) {
    if (AST.isTypeLiteralTransformation(ast.transformation)) {
      const propertySignatureTransformations = ast.transformation.propertySignatureTransformations
        .filter((t) => (keys as ReadonlyArray<PropertyKey>).includes(t.to))
      if (ReadonlyArray.isNonEmptyReadonlyArray(propertySignatureTransformations)) {
        return make(
          new AST.Transform(
            AST.pick(ast.from, keys),
            AST.pick(ast.to, keys),
            AST.TypeLiteralTransformation.make(propertySignatureTransformations)
          )
        )
      } else {
        return make(AST.pick(ast.from, keys))
      }
    }
    throw new Error(`pick: cannot handle this kind of transformation`)
  }
  return make(AST.pick(ast, keys))
}

/**
 * @category struct transformations
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
<R, I extends { [K in keyof A]?: any }>(
  self: Schema<A, I, R>
): Schema<Simplify<Omit<A, Keys[number]>>, Simplify<Omit<I, Keys[number]>>, R> => {
  const ast = self.ast
  if (AST.isTransform(ast)) {
    if (AST.isTypeLiteralTransformation(ast.transformation)) {
      const propertySignatureTransformations = ast.transformation.propertySignatureTransformations
        .filter((t) => !(keys as ReadonlyArray<PropertyKey>).includes(t.to))
      if (ReadonlyArray.isNonEmptyReadonlyArray(propertySignatureTransformations)) {
        return make(
          new AST.Transform(
            AST.omit(ast.from, keys),
            AST.omit(ast.to, keys),
            AST.TypeLiteralTransformation.make(propertySignatureTransformations)
          )
        )
      } else {
        return make(AST.omit(ast.from, keys))
      }
    }
    throw new Error(`omit: cannot handle this kind of transformation`)
  }
  return make(AST.omit(ast, keys))
}

/**
 * Given a schema `Schema<A, I, R>` and a key `K`, this function extracts a specific field from the `A` type, producing a new schema that represents a transformation from the `I` type to `A[K]`.
 *
 * If the option `{ transformation: false }` is provided, the returned schema `Schema<A[K], I[K], R>` only represents the value of the field without any transformation.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 *
 * // ---------------------------------------------
 * // use case: pull out a single field from a
 * // struct through a transformation
 * // ---------------------------------------------
 *
 * const mytable = S.struct({
 *   column1: S.NumberFromString,
 *   column2: S.number
 * })
 *
 * // const pullOutColumn1: S.Schema<number, {
 * //     readonly column1: string;
 * //     readonly column2: number;
 * // }, never>
 * const pullOutColumn1 = mytable.pipe(S.pluck("column1"))
 *
 * console.log(S.decode(S.array(pullOutColumn1))([{ column1: "1", column2: 100 }, { column1: "2", column2: 300 }]))
 * // Output: { _id: 'Either', _tag: 'Right', right: [ 1, 2 ] }
 *
 * // ---------------------------------------------
 * // use case: pull out a single field from a
 * // struct (no transformation)
 * // ---------------------------------------------
 *
 * // const pullOutColumn1Value: S.Schema<number, string, never>
 * const pullOutColumn1Value = mytable.pipe(S.pluck("column1", { transformation: false }))
 *
 * console.log(S.decode(S.array(pullOutColumn1Value))(["1", "2"]))
 * // Output: { _id: 'Either', _tag: 'Right', right: [ 1, 2 ] }
 *
 * @category struct transformations
 * @since 1.0.0
 */
export const pluck: {
  <A, K extends keyof A>(
    key: K,
    options: { readonly transformation: false }
  ): <I extends { [P in K]?: any }, R>(schema: Schema<A, I, R>) => Schema<A[K], I[K], R>
  <A, K extends keyof A>(key: K): <I, R>(schema: Schema<A, I, R>) => Schema<A[K], I, R>
  <A, I extends { [P in K]?: any }, R, K extends keyof A>(
    schema: Schema<A, I, R>,
    key: K,
    options: { readonly transformation: false }
  ): Schema<A[K], I[K], R>
  <A, I, R, K extends keyof A>(schema: Schema<A, I, R>, key: K): Schema<A[K], I, R>
} = dual(
  (args) => isSchema(args[0]),
  <A, I, R, K extends keyof A>(
    schema: Schema<A, I, R>,
    key: K,
    options?: { readonly transformation: false }
  ): Schema<A[K], I, R> => {
    if (options && options.transformation == false) {
      const ps = AST.getPropertyKeyIndexedAccess(schema.ast, key)
      return make(ps.isOptional ? AST.orUndefined(ps.type) : ps.type)
    } else {
      const ps = AST.getPropertyKeyIndexedAccess(typeSchema(schema).ast, key)
      const value = make<A[K], A[K], R>(ps.isOptional ? AST.orUndefined(ps.type) : ps.type)
      return transform(
        schema,
        value,
        (a) => a[key],
        (ak) => ps.isOptional && ak === undefined ? {} : { [key]: ak } as any
      )
    }
  }
)

const makeBrandSchema = <S extends Schema.Any<never>, B extends string | symbol>(
  self: AST.AST,
  annotations: Annotations<Schema.Type<S> & Brand.Brand<B>>
): brand<S, B> => {
  const ast = AST.annotations(self, _schema.toASTAnnotations(annotations))
  const _validateEither = validateEither(make(ast))

  const refined: any = Brand.refined((unbranded) =>
    Either.match(_validateEither(unbranded), {
      onLeft: (e) => Option.some(Brand.error(TreeFormatter.formatError(e), e)),
      onRight: () => Option.none()
    })
  )
  // make refined a BrandSchema...
  refined[TypeId] = _schema.variance
  refined.ast = ast
  refined.pipe = function() {
    return pipeArguments(this, arguments)
  }
  refined.annotations = (annotations: Annotations<Schema.Type<S> & Brand.Brand<B>>) => {
    return makeBrandSchema(ast, annotations)
  }
  return refined
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface brand<S extends Schema.Any<never>, B extends string | symbol>
  extends
    Annotable<brand<S, B>, Schema.Type<S> & Brand.Brand<B>, Schema.Encoded<S>>,
    Brand.Brand.Constructor<Schema.Type<S> & Brand.Brand<B>>
{}

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
 * const Int = Schema.number.pipe(Schema.int(), Schema.brand("Int"))
 * type Int = Schema.Schema.Type<typeof Int> // number & Brand<"Int">
 *
 * @category combinators
 * @since 1.0.0
 */
export const brand = <S extends Schema.Any<never>, B extends string | symbol>(
  brand: B,
  annotations?: Annotations<Schema.Type<S> & Brand.Brand<B>>
) =>
(self: S): brand<S, B> => {
  const brandAnnotation: AST.BrandAnnotation = Option.match(AST.getBrandAnnotation(self.ast), {
    onNone: () => [brand],
    onSome: (brands) => [...brands, brand]
  })
  return makeBrandSchema(self.ast, {
    ...annotations,
    [AST.BrandAnnotationId]: brandAnnotation
  })
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const partial: {
  <A, I, R>(
    self: Schema<A, I, R>,
    options: { readonly exact: true }
  ): Schema<{ [K in keyof A]?: A[K] }, { [K in keyof I]?: I[K] }, R>
  <A, I, R>(
    self: Schema<A, I, R>
  ): Schema<{ [K in keyof A]?: A[K] | undefined }, Simplify<{ [K in keyof I]?: I[K] | undefined }>, R>
} = <A, I, R>(
  self: Schema<A, I, R>,
  options?: { readonly exact: true }
): Schema<Partial<A>, Partial<I>, R> => make(AST.partial(self.ast, options))

/**
 * @category combinators
 * @since 1.0.0
 */
export const required = <A, I, R>(
  self: Schema<A, I, R>
): Schema<{ [K in keyof A]-?: A[K] }, { [K in keyof I]-?: I[K] }, R> => make(AST.required(self.ast))

/**
 * Creates a new schema with shallow mutability applied to its properties.
 *
 * @param schema - The original schema to make properties mutable (shallowly).
 *
 * @category combinators
 * @since 1.0.0
 */
export const mutable = <A, I, R>(
  schema: Schema<A, I, R>
): Schema<{ -readonly [P in keyof A]: A[P] }, { -readonly [P in keyof I]: I[P] }, R> => {
  const ast = AST.mutable(schema.ast)
  return ast === schema.ast ? schema as any : make(ast)
}

const getExtendErrorMessage = (x: AST.AST, y: AST.AST, path: ReadonlyArray<string>) =>
  `cannot extend \`${x}\` with \`${y}\` (path [${path?.join(", ")}])`

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
        path = [...path, _util.formatUnknown(name)]
        propertySignatures[i] = new AST.PropertySignature(name, extendAST(type, ps.type, path), isOptional, true)
      }
    }
    return AST.TypeLiteral.make(
      propertySignatures,
      x.indexSignatures.concat(y.indexSignatures)
    )
  }
  throw new Error(getExtendErrorMessage(x, y, path))
}

const extendAST = (x: AST.AST, y: AST.AST, path: ReadonlyArray<string>): AST.AST =>
  intersectUnionMembers(AST.isUnion(x) ? x.types : [x], AST.isUnion(y) ? y.types : [y], path)

const intersectUnionMembers = (
  xs: ReadonlyArray<AST.AST>,
  ys: ReadonlyArray<AST.AST>,
  path: ReadonlyArray<string>
): AST.AST =>
  AST.Union.make(
    xs.flatMap((x) => {
      return ys.map((y) => {
        if (AST.isTypeLiteral(x)) {
          if (AST.isTypeLiteral(y)) {
            return intersectTypeLiterals(x, y, path)
          } else if (
            AST.isTransform(y) && AST.isTypeLiteralTransformation(y.transformation)
          ) {
            return new AST.Transform(
              intersectTypeLiterals(x, y.from, path),
              intersectTypeLiterals(AST.typeAST(x), y.to, path),
              AST.TypeLiteralTransformation.make(
                y.transformation.propertySignatureTransformations
              )
            )
          }
        } else if (
          AST.isTransform(x) && AST.isTypeLiteralTransformation(x.transformation)
        ) {
          if (AST.isTypeLiteral(y)) {
            return new AST.Transform(
              intersectTypeLiterals(x.from, y, path),
              intersectTypeLiterals(x.to, AST.typeAST(y), path),
              AST.TypeLiteralTransformation.make(
                x.transformation.propertySignatureTransformations
              )
            )
          } else if (
            AST.isTransform(y) && AST.isTypeLiteralTransformation(y.transformation)
          ) {
            return new AST.Transform(
              intersectTypeLiterals(x.from, y.from, path),
              intersectTypeLiterals(x.to, y.to, path),
              AST.TypeLiteralTransformation.make(
                x.transformation.propertySignatureTransformations.concat(
                  y.transformation.propertySignatureTransformations
                )
              )
            )
          }
        }
        throw new Error(getExtendErrorMessage(x, y, path))
      })
    })
  )

/**
 * @category api interface
 * @since 1.0.0
 */
export interface extend<Self extends Schema.Any, That extends Schema.Any> extends
  Schema<
    Simplify<Schema.Type<Self> & Schema.Type<That>>,
    Simplify<Schema.Encoded<Self> & Schema.Encoded<That>>,
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
  <C, B, R2>(to: Schema<C, B, R2>): <A, R1>(from: Schema<B, A, R1>) => Schema<C, A, R1 | R2>
  <D, C, R2>(
    to: Schema<D, C, R2>,
    options: { strict: false }
  ): <B, A, R1>(from: Schema<B, A, R1>) => Schema<D, A, R1 | R2>
  <B, A, R1, C, R2>(from: Schema<B, A, R1>, to: Schema<C, B, R2>): Schema<C, A, R1 | R2>
  <A, B, R1, D, C, R2>(from: Schema<B, A, R1>, to: Schema<D, C, R2>, options: { strict: false }): Schema<D, A, R1 | R2>
} = dual(
  (args) => isSchema(args[1]),
  <A, B, R1, D, C, R2>(from: Schema<A, B, R1>, to: Schema<D, C, R2>): Schema<D, A, R1 | R2> =>
    make(AST.compose(from.ast, to.ast))
)

/**
 * @category combinators
 * @since 1.0.0
 */
export const suspend = <A, I, R>(
  f: () => Schema<A, I, R>,
  annotations?: Annotations<A>
): Schema<A, I, R> => make(new AST.Suspend(() => f().ast, _schema.toASTAnnotations(annotations)))

/**
 * @category combinators
 * @since 1.0.0
 */
export function filter<A>(
  f: (a: A, options: ParseOptions, self: AST.Refinement) => Option.Option<ParseResult.ParseIssue>,
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R>
export function filter<C extends A, B extends A, A = C>(
  refinement: Predicate.Refinement<A, B>,
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<C, I, R>) => Schema<C & B, I, R>
export function filter<A>(
  predicate: Predicate.Predicate<NoInfer<A>>,
  annotations?: FilterAnnotations<NoInfer<A>>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R>
export function filter<A>(
  predicate: Predicate.Predicate<A> | AST.Refinement["filter"],
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> {
  return (self) =>
    make(
      new AST.Refinement(
        self.ast,
        (a, options, ast) => {
          const out = predicate(a, options, ast)
          if (Predicate.isBoolean(out)) {
            return out
              ? Option.none()
              : Option.some(new ParseResult.Type(ast, a))
          }
          return out
        },
        _schema.toASTAnnotations(annotations)
      )
    )
}

/**
 * Create a new `Schema` by transforming the input and output of an existing `Schema`
 * using the provided decoding functions.
 *
 * @category combinators
 * @since 1.0.0
 */
export const transformOrFail: {
  <ToA, ToI, ToR, FromA, R3, R4>(
    to: Schema<ToA, ToI, ToR>,
    decode: (fromA: FromA, options: ParseOptions, ast: AST.Transform) => Effect.Effect<ToI, ParseResult.ParseIssue, R3>,
    encode: (toI: ToI, options: ParseOptions, ast: AST.Transform) => Effect.Effect<FromA, ParseResult.ParseIssue, R4>
  ): <FromI, FromR>(self: Schema<FromA, FromI, FromR>) => Schema<ToA, FromI, FromR | ToR | R3 | R4>
  <ToA, ToI, ToR, FromA, R3, R4>(
    to: Schema<ToA, ToI, ToR>,
    decode: (
      fromA: FromA,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<unknown, ParseResult.ParseIssue, R3>,
    encode: (toI: ToI, options: ParseOptions, ast: AST.Transform) => Effect.Effect<unknown, ParseResult.ParseIssue, R4>,
    options: { strict: false }
  ): <FromI, FromR>(self: Schema<FromA, FromI, FromR>) => Schema<ToA, FromI, FromR | ToR | R3 | R4>
  <FromA, FromI, FromR, ToA, ToI, ToR, R3, R4>(
    from: Schema<FromA, FromI, FromR>,
    to: Schema<ToA, ToI, ToR>,
    decode: (fromA: FromA, options: ParseOptions, ast: AST.Transform) => Effect.Effect<ToI, ParseResult.ParseIssue, R3>,
    encode: (toI: ToI, options: ParseOptions, ast: AST.Transform) => Effect.Effect<FromA, ParseResult.ParseIssue, R4>
  ): Schema<ToA, FromI, FromR | ToR | R3 | R4>
  <FromA, FromI, FromR, ToA, ToI, ToR, R3, R4>(
    from: Schema<FromA, FromI, FromR>,
    to: Schema<ToA, ToI, ToR>,
    decode: (
      fromA: FromA,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<unknown, ParseResult.ParseIssue, R3>,
    encode: (toI: ToI, options: ParseOptions, ast: AST.Transform) => Effect.Effect<unknown, ParseResult.ParseIssue, R4>,
    options: { strict: false }
  ): Schema<ToA, FromI, FromR | ToR | R3 | R4>
} = dual((args) => isSchema(args[0]) && isSchema(args[1]), <FromA, FromI, FromR, ToA, ToI, ToR, R3, R4>(
  from: Schema<FromA, FromI, FromR>,
  to: Schema<ToA, ToI, ToR>,
  decode: (fromA: FromA, options: ParseOptions, ast: AST.Transform) => Effect.Effect<ToI, ParseResult.ParseIssue, R3>,
  encode: (toI: ToI, options: ParseOptions, ast: AST.Transform) => Effect.Effect<FromA, ParseResult.ParseIssue, R4>
): Schema<ToA, FromI, FromR | ToR | R3 | R4> =>
  make(
    new AST.Transform(
      from.ast,
      to.ast,
      new AST.FinalTransformation(decode, encode)
    )
  ))

/**
 * Create a new `Schema` by transforming the input and output of an existing `Schema`
 * using the provided mapping functions.
 *
 * @category combinators
 * @since 1.0.0
 */
export const transform: {
  <ToA, ToI, ToR, FromA>(
    to: Schema<ToA, ToI, ToR>,
    decode: (fromA: FromA) => ToI,
    encode: (toI: ToI) => FromA
  ): <FromI, FromR>(from: Schema<FromA, FromI, FromR>) => Schema<ToA, FromI, FromR | ToR>
  <ToA, ToI, ToR, FromA>(
    to: Schema<ToA, ToI, ToR>,
    decode: (fromA: FromA) => unknown,
    encode: (toI: ToI) => unknown,
    options: { strict: false }
  ): <FromI, FromR>(from: Schema<FromA, FromI, FromR>) => Schema<ToA, FromI, FromR | ToR>
  <FromA, FromI, FromR, ToA, ToI, ToR>(
    from: Schema<FromA, FromI, FromR>,
    to: Schema<ToA, ToI, ToR>,
    decode: (fromA: FromA) => ToI,
    encode: (toI: ToI) => FromA
  ): Schema<ToA, FromI, FromR | ToR>
  <FromA, FromI, FromR, ToA, ToI, ToR>(
    from: Schema<FromA, FromI, FromR>,
    to: Schema<ToA, ToI, ToR>,
    decode: (fromA: FromA) => unknown,
    encode: (toI: ToI) => unknown,
    options: { strict: false }
  ): Schema<ToA, FromI, FromR | ToR>
} = dual(
  (args) => isSchema(args[0]) && isSchema(args[1]),
  <FromA, FromI, FromR, ToA, ToI, ToR>(
    from: Schema<FromA, FromI, FromR>,
    to: Schema<ToA, ToI, ToR>,
    decode: (fromA: FromA) => ToI,
    encode: (toI: ToI) => FromA
  ): Schema<ToA, FromI, FromR | ToR> =>
    transformOrFail(from, to, (fromA) => ParseResult.succeed(decode(fromA)), (toI) => ParseResult.succeed(encode(toI)))
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
): transformLiteral<Type, Encoded> => transform(literal(from), literal(to), () => to, () => from)

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
): union<{ -readonly [I in keyof A]: transformLiteral<A[I][1], A[I][0]> }>
export function transformLiterals<Encoded extends AST.LiteralValue, Type extends AST.LiteralValue>(
  pairs: [Encoded, Type]
): transformLiteral<Type, Encoded>
export function transformLiterals<
  const A extends ReadonlyArray<readonly [from: AST.LiteralValue, to: AST.LiteralValue]>
>(...pairs: A): Schema<A[number][1], A[number][0]>
export function transformLiterals<
  const A extends ReadonlyArray<readonly [from: AST.LiteralValue, to: AST.LiteralValue]>
>(...pairs: A): Schema<A[number][1], A[number][0]> {
  return union(...pairs.map(([from, to]) => transformLiteral(from, to)))
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
 * const Circle = S.struct({ radius: S.number })
 * const Square = S.struct({ sideLength: S.number })
 * const Shape = S.union(
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
  <K extends PropertyKey, V extends AST.LiteralValue | symbol, A extends object>(
    key: K,
    value: V,
    annotations?: Annotations<Simplify<A & { readonly [k in K]: V }>>
  ): <I, R>(
    schema: Schema<A, I, R>
  ) => Schema<Simplify<A & { readonly [k in K]: V }>, I, R>
  <A, I, R, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<A, I, R>,
    key: K,
    value: V,
    annotations?: Annotations<Simplify<A & { readonly [k in K]: V }>>
  ): Schema<Simplify<A & { readonly [k in K]: V }>, I, R>
} = dual(
  (args) => isSchema(args[0]),
  <A, I, R, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<A, I, R>,
    key: K,
    value: V,
    annotations?: Annotations<Simplify<A & { readonly [k in K]: V }>>
  ): Schema<Simplify<A & { readonly [k in K]: V }>, I, R> => {
    const attached = extend(
      typeSchema(schema),
      struct({ [key]: Predicate.isSymbol(value) ? uniqueSymbolFromSelf(value) : literal(value) })
    ).ast
    return make(
      new AST.Transform(
        schema.ast,
        annotations ? AST.annotations(attached, _schema.toASTAnnotations(annotations)) : attached,
        AST.TypeLiteralTransformation.make(
          [
            new AST.PropertySignatureTransformation(
              key,
              key,
              () => Option.some(value),
              () => Option.none()
            )
          ]
        )
      )
    )
  }
)

/**
 * @since 1.0.0
 */
export interface PropertySignatureAnnotations<A> extends AST.Annotations {
  readonly title?: AST.TitleAnnotation
  readonly description?: AST.DescriptionAnnotation
  readonly examples?: AST.ExamplesAnnotation<A>
  readonly default?: AST.DefaultAnnotation<A>
  readonly documentation?: AST.DocumentationAnnotation
}

/**
 * @since 1.0.0
 */
export interface Annotations<A, TypeParameters extends ReadonlyArray<any> = readonly []>
  extends PropertySignatureAnnotations<A>
{
  readonly identifier?: AST.IdentifierAnnotation
  readonly message?: AST.MessageAnnotation
  readonly typeId?: AST.TypeAnnotation | { id: AST.TypeAnnotation; annotation: unknown }
  readonly jsonSchema?: AST.JSONSchemaAnnotation
  readonly arbitrary?: (
    ...arbitraries: { readonly [K in keyof TypeParameters]: Arbitrary<TypeParameters[K]> }
  ) => Arbitrary<A>
  readonly pretty?: (
    ...pretties: { readonly [K in keyof TypeParameters]: Pretty.Pretty<TypeParameters[K]> }
  ) => Pretty.Pretty<A>
  readonly equivalence?: (
    ...equivalences: { readonly [K in keyof TypeParameters]: Equivalence.Equivalence<TypeParameters[K]> }
  ) => Equivalence.Equivalence<A>
  readonly concurrency?: AST.ConcurrencyAnnotation
  readonly batching?: AST.BatchingAnnotation
}

/**
 * @since 1.0.0
 */
export interface FilterAnnotations<A> extends Annotations<A, readonly [A]> {}

/**
 * @category annotations
 * @since 1.0.0
 */
export const annotations: {
  <S extends Annotable.Any>(annotations: Annotations<Schema.Type<S>>): (self: S) => Annotable.Self<S>
  <S extends Annotable.Any>(self: S, annotations: Annotations<Schema.Type<S>>): Annotable.Self<S>
} = dual(
  2,
  <A, I, R>(self: Schema<A, I, R>, annotations: Annotations<A>): Schema<A, I, R> => self.annotations(annotations)
)

/**
 * @category annotations
 * @since 1.0.0
 */
export const message = (message: AST.MessageAnnotation) => <S extends Annotable.Any>(self: S): Annotable.Self<S> =>
  self.annotations({ [AST.MessageAnnotationId]: message })

/**
 * @category annotations
 * @since 1.0.0
 */
export const identifier =
  (identifier: AST.IdentifierAnnotation) => <S extends Annotable.Any>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.IdentifierAnnotationId]: identifier })

/**
 * @category annotations
 * @since 1.0.0
 */
export const title = (title: AST.TitleAnnotation) => <S extends Annotable.Any>(self: S): Annotable.Self<S> =>
  self.annotations({ [AST.TitleAnnotationId]: title })

/**
 * @category annotations
 * @since 1.0.0
 */
export const description =
  (description: AST.DescriptionAnnotation) => <S extends Annotable.Any>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.DescriptionAnnotationId]: description })

/**
 * @category annotations
 * @since 1.0.0
 */
export const examples =
  <S extends Annotable.Any>(examples: AST.ExamplesAnnotation<Schema.Type<S>>) => (self: S): Annotable.Self<S> =>
    self.annotations({ [AST.ExamplesAnnotationId]: examples })

const _default = <S extends Annotable.Any>(value: Schema.Type<S>) => (self: S): Annotable.Self<S> =>
  self.annotations({ [AST.DefaultAnnotationId]: value })

export {
  /**
   * @category annotations
   * @since 1.0.0
   */
  _default as default
}

/**
 * @category annotations
 * @since 1.0.0
 */
export const documentation =
  (documentation: AST.DocumentationAnnotation) => <S extends Annotable.Any>(self: S): Annotable.Self<S> =>
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
  (jsonSchema: AST.JSONSchemaAnnotation) => <S extends Annotable.Any>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.JSONSchemaAnnotationId]: jsonSchema })

/**
 * @category annotations
 * @since 1.0.0
 */
export const equivalence =
  <S extends Annotable.Any>(equivalence: Equivalence.Equivalence<Schema.Type<S>>) => (self: S): Annotable.Self<S> =>
    self.annotations({ [_hooks.EquivalenceHookId]: () => equivalence })

/**
 * @category annotations
 * @since 1.0.0
 */
export const concurrency =
  (concurrency: AST.ConcurrencyAnnotation) => <S extends Annotable.Any>(self: S): Annotable.Self<S> =>
    self.annotations({ [AST.ConcurrencyAnnotationId]: concurrency })

/**
 * @category annotations
 * @since 1.0.0
 */
export const batching = (batching: AST.BatchingAnnotation) => <S extends Annotable.Any>(self: S): Annotable.Self<S> =>
  self.annotations({ [AST.BatchingAnnotationId]: batching })

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
  ): <I, R>(self: Schema<A, I, R>) => Schema<Simplify<Rename<A, M>>, I, R>
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
  ): Schema<Simplify<Rename<A, M>>, I, R>
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
  ): Schema<Simplify<Rename<A, M>>, I, R> => {
    return make(AST.rename(self.ast, mapping))
  }
)

/**
 * @category type id
 * @since 1.0.0
 */
export const TrimmedTypeId = Symbol.for("@effect/schema/TypeId/Trimmed")

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
  <A extends string>(annotations?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
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
export const MaxLengthTypeId: unique symbol = _filters.MaxLengthTypeId

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
  annotations?: FilterAnnotations<A>
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
export const MinLengthTypeId: unique symbol = _filters.MinLengthTypeId

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
  annotations?: FilterAnnotations<A>
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
export const PatternTypeId = Symbol.for("@effect/schema/TypeId/Pattern")

/**
 * @category string filters
 * @since 1.0.0
 */
export const pattern = <A extends string>(
  regex: RegExp,
  annotations?: FilterAnnotations<A>
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
export const StartsWithTypeId = Symbol.for("@effect/schema/TypeId/StartsWith")

/**
 * @category string filters
 * @since 1.0.0
 */
export const startsWith = <A extends string>(
  startsWith: string,
  annotations?: FilterAnnotations<A>
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
export const EndsWithTypeId = Symbol.for("@effect/schema/TypeId/EndsWith")

/**
 * @category string filters
 * @since 1.0.0
 */
export const endsWith = <A extends string>(
  endsWith: string,
  annotations?: FilterAnnotations<A>
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
export const IncludesTypeId = Symbol.for("@effect/schema/TypeId/Includes")

/**
 * @category string filters
 * @since 1.0.0
 */
export const includes = <A extends string>(
  searchString: string,
  annotations?: FilterAnnotations<A>
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
export const LowercasedTypeId = Symbol.for("@effect/schema/TypeId/Lowercased")

/**
 * Verifies that a string is lowercased.
 *
 * @category string filters
 * @since 1.0.0
 */
export const lowercased =
  <A extends string>(annotations?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
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
export const Lowercased: Schema<string> = string.pipe(
  lowercased({ identifier: "Lowercased", title: "Lowercased" })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const UppercasedTypeId = Symbol.for("@effect/schema/TypeId/Uppercased")

/**
 * Verifies that a string is uppercased.
 *
 * @category string filters
 * @since 1.0.0
 */
export const uppercased =
  <A extends string>(annotations?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
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
export const Uppercased: Schema<string> = string.pipe(
  uppercased({ identifier: "Uppercased", title: "Uppercased" })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const LengthTypeId: unique symbol = _filters.LengthTypeId

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
  length: number,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a.length === length, {
      typeId: LengthTypeId,
      description: length === 1 ? `a single character` : `a string ${length} character(s) long`,
      jsonSchema: { minLength: length, maxLength: length },
      ...annotations
    })
  )

/**
 * A schema representing a single character.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const Char = string.pipe(length(1, { identifier: "Char" }))

/**
 * @category string filters
 * @since 1.0.0
 */
export const nonEmpty = <A extends string>(
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> =>
  minLength(1, {
    description: "a non empty string",
    ...annotations
  })

/**
 * This schema converts a string to lowercase.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Lowercase: Schema<string> = transform(
  string,
  Lowercased,
  (s) => s.toLowerCase(),
  identity
).annotations({ identifier: "Lowercase" })

/**
 * This schema converts a string to uppercase.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Uppercase: Schema<string> = transform(
  string,
  Uppercased,
  (s) => s.toUpperCase(),
  identity
).annotations({ identifier: "Uppercase" })

/**
 * @category string constructors
 * @since 1.0.0
 */
export const Trimmed: Schema<string> = string.pipe(
  trimmed({ identifier: "Trimmed", title: "Trimmed" })
)

/**
 * This schema allows removing whitespaces from the beginning and end of a string.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Trim: Schema<string> = transform(
  string,
  Trimmed,
  (s) => s.trim(),
  identity
).annotations({ identifier: "Trim" })

/**
 * Returns a achema that allows splitting a string into an array of strings.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const split = (separator: string): Schema<ReadonlyArray<string>, string> =>
  transform(
    string,
    array(string),
    S.split(separator),
    ReadonlyArray.join(separator)
  )

/**
 * @since 1.0.0
 */
export type ParseJsonOptions = {
  readonly reviver?: Parameters<typeof JSON.parse>[1]
  readonly replacer?: Parameters<typeof JSON.stringify>[1]
  readonly space?: Parameters<typeof JSON.stringify>[2]
}

const JsonString = string.annotations({
  [AST.IdentifierAnnotationId]: "JsonString",
  [AST.TitleAnnotationId]: "JsonString",
  [AST.DescriptionAnnotationId]: "a JSON string"
})

/**
 * The `parseJson` combinator provides a method to convert JSON strings into the `unknown` type using the underlying
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
 * assert.deepStrictEqual(S.decodeUnknownSync(S.parseJson(S.struct({ a: S.NumberFromString })))(`{"a":"1"}`), { a: 1 })
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
    unknown,
    (s, _, ast) =>
      ParseResult.try({
        try: () => JSON.parse(s, options?.reviver),
        catch: (e: any) => new ParseResult.Type(ast, s, e.message)
      }),
    (u, _, ast) =>
      ParseResult.try({
        try: () => JSON.stringify(u, options?.replacer, options?.space),
        catch: (e: any) => new ParseResult.Type(ast, u, e.message)
      })
  )
}

/**
 * @category string constructors
 * @since 1.0.0
 */
export const NonEmpty: Schema<string> = string.pipe(
  nonEmpty({ identifier: "NonEmpty", title: "NonEmpty" })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const UUIDTypeId = Symbol.for("@effect/schema/TypeId/UUID")

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

/**
 * @category api interface
 * @since 1.0.0
 */
export interface UUID extends Annotable<UUID, string> {}

/**
 * Represents a Universally Unique Identifier (UUID).
 *
 * This schema ensures that the provided string adheres to the standard UUID format.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const UUID: UUID = string.pipe(
  pattern(uuidRegex, {
    typeId: UUIDTypeId,
    identifier: "UUID",
    title: "UUID",
    description: "a Universally Unique Identifier",
    arbitrary: (): Arbitrary<string> => (fc) => fc.uuid()
  })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const ULIDTypeId = Symbol.for("@effect/schema/TypeId/ULID")

const ulidRegex = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i

/**
 * @category api interface
 * @since 1.0.0
 */
export interface ULID extends Annotable<ULID, string> {}

/**
 * Represents a Universally Unique Lexicographically Sortable Identifier (ULID).
 *
 * ULIDs are designed to be compact, URL-safe, and ordered, making them suitable for use as identifiers.
 * This schema ensures that the provided string adheres to the standard ULID format.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const ULID: ULID = string.pipe(
  pattern(ulidRegex, {
    typeId: ULIDTypeId,
    identifier: "ULID",
    title: "ULID",
    description: "a Universally Unique Lexicographically Sortable Identifier",
    arbitrary: (): Arbitrary<string> => (fc) => fc.ulid()
  })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const FiniteTypeId = Symbol.for("@effect/schema/TypeId/Finite")

/**
 * Ensures that the provided value is a finite number.
 *
 * This schema filters out non-finite numeric values, allowing only finite numbers to pass through.
 *
 * @category number filters
 * @since 1.0.0
 */
export const finite =
  <A extends number>(annotations?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
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
export const GreaterThanTypeId: unique symbol = _filters.GreaterThanTypeId

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
  annotations?: FilterAnnotations<A>
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
export const GreaterThanOrEqualToTypeId: unique symbol = _filters.GreaterThanOrEqualToTypeId

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
  annotations?: FilterAnnotations<A>
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
export const MultipleOfTypeId = Symbol.for("@effect/schema/TypeId/MultipleOf")

/**
 * @category number filters
 * @since 1.0.0
 */
export const multipleOf = <A extends number>(
  divisor: number,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => N.remainder(a, divisor) === 0, {
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
export const IntTypeId: unique symbol = _filters.IntTypeId

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
  <A extends number>(annotations?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
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
export const LessThanTypeId: unique symbol = _filters.LessThanTypeId

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
  <A extends number>(max: number, annotations?: FilterAnnotations<A>) =>
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
export const LessThanOrEqualToTypeId: unique symbol = _filters.LessThanOrEqualToTypeId

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
  annotations?: FilterAnnotations<A>
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
export const BetweenTypeId: unique symbol = _filters.BetweenTypeId

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
  annotations?: FilterAnnotations<A>
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
export const NonNaNTypeId = Symbol.for("@effect/schema/TypeId/NonNaN")

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonNaN =
  <A extends number>(annotations?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
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
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThan(0, annotations)

/**
 * @category number filters
 * @since 1.0.0
 */
export const negative = <A extends number>(
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThan(0, annotations)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonPositive = <A extends number>(
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThanOrEqualTo(0, annotations)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonNegative = <A extends number>(
  annotations?: FilterAnnotations<A>
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
      (self) => N.clamp(self, { minimum, maximum }),
      identity,
      { strict: false }
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
  string,
  number,
  (s, _, ast) => ParseResult.fromOption(N.parse(s), () => new ParseResult.Type(ast, s)),
  (n) => ParseResult.succeed(String(n))
).annotations({ identifier: "NumberFromString" })

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Finite: Schema<number> = number.pipe(finite({ identifier: "Finite", title: "Finite" }))

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Int: Schema<number> = number.pipe(int({ identifier: "Int", title: "Int" }))

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonNaN: Schema<number> = number.pipe(nonNaN({ identifier: "NonNaN", title: "NonNaN" }))

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Positive: Schema<number> = number.pipe(
  positive({ identifier: "Positive", title: "Positive" })
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Negative: Schema<number> = number.pipe(
  negative({ identifier: "Negative", title: "Negative" })
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonPositive: Schema<number> = number.pipe(
  nonPositive({ identifier: "NonPositive", title: "NonPositive" })
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonNegative: Schema<number> = number.pipe(
  nonNegative({ identifier: "NonNegative", title: "NonNegative" })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const JsonNumberTypeId = Symbol.for("@effect/schema/TypeId/JsonNumber")

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
export const JsonNumber: Schema<number> = number.pipe(
  filter((n) => !Number.isNaN(n) && Number.isFinite(n), {
    typeId: JsonNumberTypeId,
    identifier: "JsonNumber",
    title: "JSON-compatible number",
    description: "a JSON-compatible number, excluding NaN, +Infinity, and -Infinity",
    jsonSchema: { type: "number" }
  })
)

/**
 * @category boolean transformations
 * @since 1.0.0
 */
export const Not: Schema<boolean> = transform(
  boolean,
  boolean,
  (self) => !self,
  (self) => !self
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $symbol extends Annotable<$symbol, symbol, string> {}

/**
 * This schema transforms a `string` into a `symbol`.
 *
 * @category symbol transformations
 * @since 1.0.0
 */
export const symbol: $symbol = transform(
  string,
  symbolFromSelf,
  (s) => Symbol.for(s),
  (sym) => sym.description,
  { strict: false }
).annotations({ identifier: "symbol" })

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanBigintTypeId: unique symbol = _filters.GreaterThanBigintTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type GreaterThanBigintTypeId = typeof GreaterThanBigintTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const greaterThanBigint = <A extends bigint>(
  min: bigint,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a > min, {
      typeId: { id: GreaterThanBigintTypeId, annotation: { min } },
      description: min === 0n ? "a positive bigint" : `a bigint greater than ${min}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToBigintTypeId: unique symbol = _filters.GreaterThanOrEqualToBigintTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type GreaterThanOrEqualToBigintTypeId = typeof GreaterThanOrEqualToBigintTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const greaterThanOrEqualToBigint = <A extends bigint>(
  min: bigint,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min, {
      typeId: { id: GreaterThanOrEqualToBigintTypeId, annotation: { min } },
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
export const LessThanBigintTypeId: unique symbol = _filters.LessThanBigintTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type LessThanBigintTypeId = typeof LessThanBigintTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const lessThanBigint = <A extends bigint>(
  max: bigint,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a < max, {
      typeId: { id: LessThanBigintTypeId, annotation: { max } },
      description: max === 0n ? "a negative bigint" : `a bigint less than ${max}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToBigintTypeId: unique symbol = _filters.LessThanOrEqualToBigintTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type LessThanOrEqualToBigintTypeId = typeof LessThanOrEqualToBigintTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const lessThanOrEqualToBigint = <A extends bigint>(
  max: bigint,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a <= max, {
      typeId: { id: LessThanOrEqualToBigintTypeId, annotation: { max } },
      description: max === 0n ? "a non-positive bigint" : `a bigint less than or equal to ${max}n`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const BetweenBigintTypeId: unique symbol = _filters.BetweenBigintTypeId

/**
 * @category type id
 * @since 1.0.0
 */
export type BetweenBigintTypeId = typeof BetweenBigintTypeId

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const betweenBigint = <A extends bigint>(
  min: bigint,
  max: bigint,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min && a <= max, {
      typeId: { id: BetweenBigintTypeId, annotation: { max, min } },
      description: `a bigint between ${min}n and ${max}n`,
      ...annotations
    })
  )

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const positiveBigint = <A extends bigint>(
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThanBigint(0n, annotations)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const negativeBigint = <A extends bigint>(
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThanBigint(0n, annotations)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonNegativeBigint = <A extends bigint>(
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThanOrEqualToBigint(0n, annotations)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonPositiveBigint = <A extends bigint>(
  annotations?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThanOrEqualToBigint(0n, annotations)

/**
 * Clamps a bigint between a minimum and a maximum value.
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const clampBigint =
  (minimum: bigint, maximum: bigint) => <R, I, A extends bigint>(self: Schema<A, I, R>): Schema<A, I, R> =>
    transform(
      self,
      self.pipe(typeSchema, betweenBigint(minimum, maximum)),
      (self) => _bigInt.clamp(self, { minimum, maximum }),
      identity,
      { strict: false }
    )

/**
 * @category api interface
 * @since 1.0.0
 */
export interface $bigint extends Annotable<$bigint, bigint, string> {}

/**
 * This schema transforms a `string` into a `bigint` by parsing the string using the `BigInt` function.
 *
 * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const bigint: $bigint = transformOrFail(
  string,
  bigintFromSelf,
  (s, _, ast) => {
    if (s.trim() === "") {
      return ParseResult.fail(new ParseResult.Type(ast, s))
    }

    return ParseResult.try({
      try: () => BigInt(s),
      catch: () => new ParseResult.Type(ast, s)
    })
  },
  (n) => ParseResult.succeed(String(n))
).annotations({ identifier: "bigint" })

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const PositiveBigintFromSelf: Schema<bigint> = bigintFromSelf.pipe(
  positiveBigint({ identifier: "PositiveBigintFromSelf", title: "PositiveBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const PositiveBigint: Schema<bigint, string> = bigint.pipe(
  positiveBigint({ identifier: "PositiveBigint", title: "PositiveBigint" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NegativeBigintFromSelf: Schema<bigint> = bigintFromSelf.pipe(
  negativeBigint({ identifier: "NegativeBigintFromSelf", title: "NegativeBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NegativeBigint: Schema<bigint, string> = bigint.pipe(
  negativeBigint({ identifier: "NegativeBigint", title: "NegativeBigint" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonPositiveBigintFromSelf: Schema<bigint> = bigintFromSelf.pipe(
  nonPositiveBigint({ identifier: "NonPositiveBigintFromSelf", title: "NonPositiveBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonPositiveBigint: Schema<bigint, string> = bigint.pipe(
  nonPositiveBigint({ identifier: "NonPositiveBigint", title: "NonPositiveBigint" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonNegativeBigintFromSelf: Schema<bigint> = bigintFromSelf.pipe(
  nonNegativeBigint({ identifier: "NonNegativeBigintFromSelf", title: "NonNegativeBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonNegativeBigint: Schema<bigint, string> = bigint.pipe(
  nonNegativeBigint({ identifier: "NonNegativeBigint", title: "NonNegativeBigint" })
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BigintFromNumber extends Annotable<BigintFromNumber, bigint, number> {}

/**
 * This schema transforms a `number` into a `bigint` by parsing the number using the `BigInt` function.
 *
 * It returns an error if the value can't be safely encoded as a `number` due to being out of range.
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const BigintFromNumber: BigintFromNumber = transformOrFail(
  number,
  bigintFromSelf,
  (n, _, ast) =>
    ParseResult.try({
      try: () => BigInt(n),
      catch: () => new ParseResult.Type(ast, n)
    }),
  (b, _, ast) => ParseResult.fromOption(_bigInt.toNumber(b), () => new ParseResult.Type(ast, b))
).annotations({ identifier: "BigintFromNumber" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface SecretFromSelf extends Annotable<SecretFromSelf, _secret.Secret> {}

/**
 * @category Secret constructors
 * @since 1.0.0
 */
export const SecretFromSelf: SecretFromSelf = declare(
  _secret.isSecret,
  {
    identifier: "SecretFromSelf",
    pretty: (): Pretty.Pretty<_secret.Secret> => (secret) => String(secret),
    arbitrary: (): Arbitrary<_secret.Secret> => (fc) => fc.string().map((_) => _secret.fromString(_))
  }
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface Secret extends Annotable<Secret, _secret.Secret, string> {}

/**
 * A schema that transforms a `string` into a `Secret`.
 *
 * @category Secret transformations
 * @since 1.0.0
 */
export const Secret: Secret = transform(
  string,
  SecretFromSelf,
  (str) => _secret.fromString(str),
  (secret) => _secret.value(secret),
  { strict: false }
).annotations({ identifier: "Secret" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface DurationFromSelf extends Annotable<DurationFromSelf, _duration.Duration> {}

/**
 * @category Duration constructors
 * @since 1.0.0
 */
export const DurationFromSelf: DurationFromSelf = declare(
  _duration.isDuration,
  {
    identifier: "DurationFromSelf",
    pretty: (): Pretty.Pretty<_duration.Duration> => String,
    arbitrary: (): Arbitrary<_duration.Duration> => (fc) =>
      fc.oneof(
        fc.constant(_duration.infinity),
        fc.bigUint().map((_) => _duration.nanos(_)),
        fc.bigUint().map((_) => _duration.micros(_)),
        fc.maxSafeNat().map((_) => _duration.millis(_)),
        fc.maxSafeNat().map((_) => _duration.seconds(_)),
        fc.maxSafeNat().map((_) => _duration.minutes(_)),
        fc.maxSafeNat().map((_) => _duration.hours(_)),
        fc.maxSafeNat().map((_) => _duration.days(_)),
        fc.maxSafeNat().map((_) => _duration.weeks(_))
      ),
    equivalence: (): Equivalence.Equivalence<_duration.Duration> => _duration.Equivalence
  }
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface DurationFromNanos extends Annotable<DurationFromNanos, _duration.Duration, bigint> {}

/**
 * A schema that transforms a `bigint` tuple into a `Duration`.
 * Treats the value as the number of nanoseconds.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const DurationFromNanos: DurationFromNanos = transformOrFail(
  bigintFromSelf,
  DurationFromSelf,
  (nanos) => ParseResult.succeed(_duration.nanos(nanos)),
  (duration, _, ast) =>
    Option.match(_duration.toNanos(duration), {
      onNone: () => ParseResult.fail(new ParseResult.Type(ast, duration)),
      onSome: (val) => ParseResult.succeed(val)
    })
).annotations({ identifier: "DurationFromNanos" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface DurationFromMillis extends Annotable<DurationFromMillis, _duration.Duration, number> {}

/**
 * A schema that transforms a `number` tuple into a `Duration`.
 * Treats the value as the number of milliseconds.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const DurationFromMillis: DurationFromMillis = transform(
  number,
  DurationFromSelf,
  (ms) => _duration.millis(ms),
  (n) => _duration.toMillis(n)
).annotations({ identifier: "DurationFromMillis" })

const hrTime: Schema<readonly [seconds: number, nanos: number]> = tuple(
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
export interface Duration extends Annotable<Duration, _duration.Duration, readonly [seconds: number, nanos: number]> {}

/**
 * A schema that transforms a `[number, number]` tuple into a `Duration`.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const Duration: Duration = transform(
  hrTime,
  DurationFromSelf,
  ([seconds, nanos]) => _duration.nanos(BigInt(seconds) * BigInt(1e9) + BigInt(nanos)),
  (duration) => _duration.toHrTime(duration)
).annotations({ identifier: "Duration" })

/**
 * Clamps a `Duration` between a minimum and a maximum value.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const clampDuration =
  (minimum: _duration.DurationInput, maximum: _duration.DurationInput) =>
  <R, I, A extends _duration.Duration>(self: Schema<A, I, R>): Schema<A, I, R> =>
    transform(
      self,
      self.pipe(typeSchema, betweenDuration(minimum, maximum)),
      (self) => _duration.clamp(self, { minimum, maximum }),
      identity,
      { strict: false }
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanDurationTypeId = Symbol.for("@effect/schema/TypeId/LessThanDuration")

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const lessThanDuration = <A extends _duration.Duration>(
  max: _duration.DurationInput,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _duration.lessThan(a, max), {
      typeId: { id: LessThanDurationTypeId, annotation: { max } },
      description: `a Duration less than ${_duration.decode(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToDurationTypeId = Symbol.for(
  "@effect/schema/TypeId/LessThanOrEqualToDuration"
)

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const lessThanOrEqualToDuration = <A extends _duration.Duration>(
  max: _duration.DurationInput,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _duration.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanDurationTypeId, annotation: { max } },
      description: `a Duration less than or equal to ${_duration.decode(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanDurationTypeId = Symbol.for("@effect/schema/TypeId/GreaterThanDuration")

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const greaterThanDuration = <A extends _duration.Duration>(
  min: _duration.DurationInput,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _duration.greaterThan(a, min), {
      typeId: { id: GreaterThanDurationTypeId, annotation: { min } },
      description: `a Duration greater than ${_duration.decode(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToDurationTypeId = Symbol.for(
  "@effect/schema/TypeId/GreaterThanOrEqualToDuration"
)

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const greaterThanOrEqualToDuration = <A extends _duration.Duration>(
  min: _duration.DurationInput,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _duration.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToDurationTypeId, annotation: { min } },
      description: `a Duration greater than or equal to ${_duration.decode(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const BetweenDurationTypeId = Symbol.for("@effect/schema/TypeId/BetweenDuration")

/**
 * @category Duration filters
 * @since 1.0.0
 */
export const betweenDuration = <A extends _duration.Duration>(
  minimum: _duration.DurationInput,
  maximum: _duration.DurationInput,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _duration.between(a, { minimum, maximum }), {
      typeId: { id: BetweenDurationTypeId, annotation: { maximum, minimum } },
      description: `a Duration between ${_duration.decode(minimum)} and ${_duration.decode(maximum)}`,
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
    pretty: (): Pretty.Pretty<Uint8Array> => (u8arr) => `new Uint8Array(${JSON.stringify(Array.from(u8arr))})`,
    arbitrary: (): Arbitrary<Uint8Array> => (fc) => fc.uint8Array(),
    equivalence: (): Equivalence.Equivalence<Uint8Array> => ReadonlyArray.getEquivalence(Equal.equals) as any
  }
)

const _Uint8Array: Schema<Uint8Array, ReadonlyArray<number>> = transform(
  array(number.pipe(
    between(0, 255, {
      title: "8-bit unsigned integer",
      description: "a 8-bit unsigned integer"
    })
  )).annotations({ description: "an array of 8-bit unsigned integers" }),
  Uint8ArrayFromSelf,
  (a) => Uint8Array.from(a),
  (arr) => Array.from(arr)
).annotations({ identifier: "Uint8Array" })

export {
  /**
   * A schema that transforms a `number` array into a `Uint8Array`.
   *
   * @category Uint8Array transformations
   * @since 1.0.0
   */
  _Uint8Array as Uint8Array
}

const makeEncodingTransformation = (
  id: string,
  decode: (s: string) => Either.Either<Uint8Array, Encoding.DecodeException>,
  encode: (u: Uint8Array) => string
): Schema<Uint8Array, string> =>
  transformOrFail(
    string,
    Uint8ArrayFromSelf,
    (s, _, ast) =>
      Either.mapLeft(
        decode(s),
        (decodeException) => new ParseResult.Type(ast, s, decodeException.message)
      ),
    (u) => ParseResult.succeed(encode(u)),
    { strict: false }
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
export const MinItemsTypeId: unique symbol = _filters.MinItemsTypeId

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
  annotations?: FilterAnnotations<ReadonlyArray<A>>
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
export const MaxItemsTypeId: unique symbol = _filters.MaxItemsTypeId

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
  annotations?: FilterAnnotations<ReadonlyArray<A>>
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
export const ItemsCountTypeId: unique symbol = _filters.ItemsCountTypeId

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
  annotations?: FilterAnnotations<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): Schema<ReadonlyArray<A>, I, R> =>
  self.pipe(
    filter((a): a is ReadonlyArray<A> => a.length === n, {
      typeId: ItemsCountTypeId,
      description: `an array of exactly ${n} items`,
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
export const head = <A, I, R>(self: Schema<ReadonlyArray<A>, I, R>): Schema<Option.Option<A>, I, R> =>
  transform(
    self,
    optionFromSelf(getNumberIndexedAccess(typeSchema(self))),
    ReadonlyArray.head,
    Option.match({ onNone: () => [], onSome: ReadonlyArray.of })
  )

/**
 * Retrieves the first element of a `ReadonlyArray`.
 *
 * If the array is empty, it returns the `fallback` argument if provided; otherwise, it fails.
 *
 * @category ReadonlyArray transformations
 * @since 1.0.0
 */
export const headOr: {
  <A>(fallback?: LazyArg<A>): <I, R>(self: Schema<ReadonlyArray<A>, I, R>) => Schema<A, I, R>
  <A, I, R>(self: Schema<ReadonlyArray<A>, I, R>, fallback?: LazyArg<A>): Schema<A, I, R>
} = dual(
  (args) => isSchema(args[0]),
  <A, I, R>(self: Schema<ReadonlyArray<A>, I, R>, fallback?: LazyArg<A>): Schema<A, I, R> =>
    transformOrFail(
      self,
      getNumberIndexedAccess(typeSchema(self)),
      (as, _, ast) =>
        as.length > 0
          ? ParseResult.succeed(as[0])
          : fallback
          ? ParseResult.succeed(fallback())
          : ParseResult.fail(new ParseResult.Type(ast, as)),
      (a) => ParseResult.succeed(ReadonlyArray.of(a))
    )
)

/**
 * @category type id
 * @since 1.0.0
 */
export const ValidDateTypeId = Symbol.for("@effect/schema/TypeId/ValidDate")

/**
 * A filter that **excludes invalid** dates (e.g., `new Date("Invalid Date")` is rejected).
 *
 * @category Date filters
 * @since 1.0.0
 */
export const validDate =
  (annotations?: FilterAnnotations<Date>) => <I, R>(self: Schema<Date, I, R>): Schema<Date, I, R> =>
    self.pipe(
      filter((a) => !Number.isNaN(a.getTime()), {
        typeId: ValidDateTypeId,
        description: "a valid Date",
        ...annotations
      })
    )

/**
 * Represents a schema for handling potentially **invalid** `Date` instances (e.g., `new Date("Invalid Date")` is not rejected).
 *
 * @category Date constructors
 * @since 1.0.0
 */
export const DateFromSelf: Schema<Date> = declare(
  Predicate.isDate,
  {
    identifier: "DateFromSelf",
    description: "a potentially invalid Date instance",
    pretty: (): Pretty.Pretty<Date> => (date) => `new Date(${JSON.stringify(date)})`,
    arbitrary: (): Arbitrary<Date> => (fc) => fc.date({ noInvalidDate: false }),
    equivalence: () => Equivalence.Date
  }
)

/**
 * Represents a schema for handling only **valid** dates. For example, `new Date("Invalid Date")` is rejected, even though it is an instance of `Date`.
 *
 * @category Date constructors
 * @since 1.0.0
 */
export const ValidDateFromSelf: Schema<Date> = DateFromSelf.pipe(
  validDate({
    identifier: "ValidDateFromSelf",
    description: "a valid Date instance"
  })
)

/**
 * Represents a schema that converts a `string` into a (potentially invalid) `Date` (e.g., `new Date("Invalid Date")` is not rejected).
 *
 * @category Date transformations
 * @since 1.0.0
 */
export const DateFromString: Schema<Date, string> = transform(
  string,
  DateFromSelf,
  (s) => new Date(s),
  (n) => n.toISOString()
).annotations({ identifier: "DateFromString" })

const _Date: Schema<Date, string> = DateFromString.pipe(
  validDate({ identifier: "Date" })
)

export {
  /**
   * A schema that transforms a `string` into a **valid** `Date`, ensuring that invalid dates, such as `new Date("Invalid Date")`, are rejected.
   *
   * @category Date transformations
   * @since 1.0.0
   */
  _Date as Date
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

const OptionNoneEncoded = struct({
  _tag: literal("None")
}).annotations({ description: "NoneEncoded" })

const optionSomeEncoded = <A, I, R>(value: Schema<A, I, R>) =>
  struct({
    _tag: literal("Some"),
    value
  }).annotations({ description: `SomeEncoded<${format(value)}>` })

const optionEncoded = <A, I, R>(value: Schema<A, I, R>) =>
  union(
    OptionNoneEncoded,
    optionSomeEncoded(value)
  ).annotations({
    description: `OptionEncoded<${format(value)}>`
  })

const optionDecode = <A>(input: OptionEncoded<A>): Option.Option<A> =>
  input._tag === "None" ? Option.none() : Option.some(input.value)

const optionArbitrary = <A>(value: Arbitrary<A>): Arbitrary<Option.Option<A>> => {
  const arb = arbitrary.make(optionEncoded(schemaFromArbitrary(value)))
  return (fc) => arb(fc).map(optionDecode)
}

const optionPretty = <A>(value: Pretty.Pretty<A>): Pretty.Pretty<Option.Option<A>> =>
  Option.match({
    onNone: () => "none()",
    onSome: (a) => `some(${value(a)})`
  })

const optionParse =
  <R, A>(decodeUnknown: ParseResult.DecodeUnknown<A, R>): ParseResult.DeclarationDecodeUnknown<Option.Option<A>, R> =>
  (u, options, ast) =>
    Option.isOption(u) ?
      Option.isNone(u) ?
        ParseResult.succeed(Option.none())
        : ParseResult.map(decodeUnknown(u.value, options), Option.some)
      : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface optionFromSelf<Value extends Schema.Any> extends
  Annotable<
    optionFromSelf<Value>,
    Option.Option<Schema.Type<Value>>,
    Option.Option<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromSelf = <Value extends Schema.Any>(
  value: Value
): optionFromSelf<Value> => {
  return declare(
    [value],
    (value) => optionParse(ParseResult.decodeUnknown(value)),
    (value) => optionParse(ParseResult.encodeUnknown(value)),
    {
      description: `Option<${format(value)}>`,
      pretty: optionPretty,
      arbitrary: optionArbitrary,
      equivalence: Option.getEquivalence
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
export interface option<Value extends Schema.Any> extends
  Annotable<
    option<Value>,
    Option.Option<Schema.Type<Value>>,
    OptionEncoded<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const option = <Value extends Schema.Any>(value: Value): option<Value> => {
  const _value = asSchema(value)
  return transform(
    optionEncoded(_value),
    optionFromSelf(typeSchema(_value)),
    optionDecode,
    Option.match({
      onNone: () => makeNoneEncoded,
      onSome: makeSomeEncoded
    })
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface optionFromNullable<Value extends Schema.Any> extends
  Annotable<
    optionFromNullable<Value>,
    Option.Option<Schema.Type<Value>>,
    Schema.Encoded<Value> | null,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromNullable = <Value extends Schema.Any>(
  value: Value
): optionFromNullable<Value> => {
  const _value = asSchema(value)
  return transform(nullable(_value), optionFromSelf(typeSchema(_value)), Option.fromNullable, Option.getOrNull)
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface optionFromNullish<Value extends Schema.Any> extends
  Annotable<
    optionFromNullish<Value>,
    Option.Option<Schema.Type<Value>>,
    Schema.Encoded<Value> | null | undefined,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromNullish = <Value extends Schema.Any>(
  value: Value,
  onNoneEncoding: null | undefined
): optionFromNullish<Value> => {
  const _value = asSchema(value)
  return transform(
    nullish(_value),
    optionFromSelf(typeSchema(_value)),
    Option.fromNullable,
    onNoneEncoding === null ? Option.getOrNull : Option.getOrUndefined
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface optionFromOrUndefined<Value extends Schema.Any> extends
  Annotable<
    optionFromOrUndefined<Value>,
    Option.Option<Schema.Type<Value>>,
    Schema.Encoded<Value> | undefined,
    Schema.Context<Value>
  >
{}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromOrUndefined = <Value extends Schema.Any>(
  value: Value
): optionFromOrUndefined<Value> => {
  const _value = asSchema(value)
  return transform(orUndefined(_value), optionFromSelf(typeSchema(_value)), Option.fromNullable, Option.getOrUndefined)
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
  struct({
    _tag: literal("Right"),
    right
  }).annotations({ description: `RightEncoded<${format(right)}>` })

const leftEncoded = <LA, LI, LR>(left: Schema<LA, LI, LR>): Schema<LeftEncoded<LA>, LeftEncoded<LI>, LR> =>
  struct({
    _tag: literal("Left"),
    left
  }).annotations({ description: `LeftEncoded<${format(left)}>` })

const eitherEncoded = <RA, RI, RR, LA, LI, LR>(
  right: Schema<RA, RI, RR>,
  left: Schema<LA, LI, LR>
) =>
  union(rightEncoded(right), leftEncoded(left)).annotations({
    description: `EitherEncoded<${format(left)}, ${format(right)}>`
  })

const eitherDecode = <R, L>(input: EitherEncoded<R, L>): Either.Either<R, L> =>
  input._tag === "Left" ? Either.left(input.left) : Either.right(input.right)

const eitherArbitrary = <R, L>(
  right: Arbitrary<R>,
  left: Arbitrary<L>
): Arbitrary<Either.Either<R, L>> => {
  const arb = arbitrary.make(eitherEncoded(schemaFromArbitrary(right), schemaFromArbitrary(left)))
  return (fc) => arb(fc).map(eitherDecode)
}

const eitherPretty = <R, L>(
  right: Pretty.Pretty<R>,
  left: Pretty.Pretty<L>
): Pretty.Pretty<Either.Either<R, L>> =>
  Either.match({
    onLeft: (e) => `left(${left(e)})`,
    onRight: (a) => `right(${right(a)})`
  })

const eitherParse = <RR, R, LR, L>(
  parseRight: ParseResult.DecodeUnknown<R, RR>,
  decodeUnknownLeft: ParseResult.DecodeUnknown<L, LR>
): ParseResult.DeclarationDecodeUnknown<Either.Either<R, L>, LR | RR> =>
(u, options, ast) =>
  Either.isEither(u) ?
    Either.match(u, {
      onLeft: (left) => ParseResult.map(decodeUnknownLeft(left, options), Either.left),
      onRight: (right) => ParseResult.map(parseRight(right, options), Either.right)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface eitherFromSelf<R extends Schema.Any, L extends Schema.Any> extends
  Annotable<
    eitherFromSelf<R, L>,
    Either.Either<Schema.Type<R>, Schema.Type<L>>,
    Either.Either<Schema.Encoded<R>, Schema.Encoded<L>>,
    Schema.Context<R> | Schema.Context<L>
  >
{}

/**
 * @category Either transformations
 * @since 1.0.0
 */
export const eitherFromSelf = <R extends Schema.Any, L extends Schema.Any>({ left, right }: {
  readonly left: L
  readonly right: R
}): eitherFromSelf<R, L> => {
  return declare(
    [right, left],
    (right, left) => eitherParse(ParseResult.decodeUnknown(right), ParseResult.decodeUnknown(left)),
    (right, left) => eitherParse(ParseResult.encodeUnknown(right), ParseResult.encodeUnknown(left)),
    {
      description: `Either<${format(left)}, ${format(right)}>`,
      pretty: eitherPretty,
      arbitrary: eitherArbitrary,
      equivalence: (right, left) => Either.getEquivalence(left, right)
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
export interface either<R extends Schema.Any, L extends Schema.Any> extends
  Annotable<
    either<R, L>,
    Either.Either<Schema.Type<R>, Schema.Type<L>>,
    EitherEncoded<Schema.Encoded<R>, Schema.Encoded<L>>,
    Schema.Context<R> | Schema.Context<L>
  >
{}

/**
 * @category Either transformations
 * @since 1.0.0
 */
export const either = <R extends Schema.Any, L extends Schema.Any>({ left, right }: {
  readonly left: L
  readonly right: R
}): either<R, L> => {
  const _right = asSchema(right)
  const _left = asSchema(left)
  return transform(
    eitherEncoded(_right, _left),
    eitherFromSelf({ left: typeSchema(_left), right: typeSchema(_right) }),
    eitherDecode,
    Either.match({ onLeft: makeLeftEncoded, onRight: makeRightEncoded })
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface eitherFromUnion<R extends Schema.Any, L extends Schema.Any> extends
  Annotable<
    eitherFromUnion<R, L>,
    Either.Either<Schema.Type<R>, Schema.Type<L>>,
    Schema.Encoded<R> | Schema.Encoded<L>,
    Schema.Context<R> | Schema.Context<L>
  >
{}

/**
 * @example
 * import * as Schema from "@effect/schema/Schema"
 *
 * // Schema<string | number, Either<string, number>>
 * Schema.eitherFromUnion({ left: Schema.string, right: Schema.number })
 *
 * @category Either transformations
 * @since 1.0.0
 */
export const eitherFromUnion = <R extends Schema.Any, L extends Schema.Any>({ left, right }: {
  readonly left: L
  readonly right: R
}): eitherFromUnion<R, L> => {
  const _right = asSchema(right)
  const _left = asSchema(left)
  const toright = typeSchema(_right)
  const toleft = typeSchema(_left)
  const fromRight = transform(_right, rightEncoded(toright), makeRightEncoded, (r) => r.right)
  const fromLeft = transform(_left, leftEncoded(toleft), makeLeftEncoded, (l) => l.left)
  return transform(
    union(fromRight, fromLeft),
    eitherFromSelf({ left: toleft, right: toright }),
    (from) => from._tag === "Left" ? Either.left(from.left) : Either.right(from.right),
    Either.match({ onLeft: makeLeftEncoded, onRight: makeRightEncoded })
  )
}

const readonlyMapArbitrary = <K, V>(
  key: Arbitrary<K>,
  value: Arbitrary<V>
): Arbitrary<ReadonlyMap<K, V>> =>
(fc) => fc.array(fc.tuple(key(fc), value(fc))).map((as) => new Map(as))

const readonlyMapPretty = <K, V>(
  key: Pretty.Pretty<K>,
  value: Pretty.Pretty<V>
): Pretty.Pretty<ReadonlyMap<K, V>> =>
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
  const arrayEquivalence = ReadonlyArray.getEquivalence(
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
export interface readonlyMapFromSelf<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
    readonlyMapFromSelf<K, V>,
    ReadonlyMap<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyMap<Schema.Encoded<K>, Schema.Encoded<V>>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category ReadonlyMap transformations
 * @since 1.0.0
 */
export const readonlyMapFromSelf = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): readonlyMapFromSelf<K, V> => {
  return declare(
    [key, value],
    (key, value) => readonlyMapParse(ParseResult.decodeUnknown(array(tuple(key, value)))),
    (key, value) => readonlyMapParse(ParseResult.encodeUnknown(array(tuple(key, value)))),
    {
      description: `ReadonlyMap<${format(key)}, ${format(value)}>`,
      pretty: readonlyMapPretty,
      arbitrary: readonlyMapArbitrary,
      equivalence: readonlyMapEquivalence
    }
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface readonlyMap<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
    readonlyMap<K, V>,
    ReadonlyMap<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyArray<readonly [Schema.Encoded<K>, Schema.Encoded<V>]>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category ReadonlyMap transformations
 * @since 1.0.0
 */
export const readonlyMap = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): readonlyMap<K, V> => {
  const _key = asSchema(key)
  const _value = asSchema(value)
  return transform(
    array(tuple(_key, _value)),
    readonlyMapFromSelf({ key: typeSchema(_key), value: typeSchema(_value) }),
    (as) => new Map(as),
    (map) => Array.from(map.entries())
  )
}

const readonlySetArbitrary = <A>(item: Arbitrary<A>): Arbitrary<ReadonlySet<A>> => (fc) =>
  fc.array(item(fc)).map((as) => new Set(as))

const readonlySetPretty = <A>(item: Pretty.Pretty<A>): Pretty.Pretty<ReadonlySet<A>> => (set) =>
  `new Set([${Array.from(set.values()).map((a) => item(a)).join(", ")}])`

const readonlySetEquivalence = <A>(
  item: Equivalence.Equivalence<A>
): Equivalence.Equivalence<ReadonlySet<A>> => {
  const arrayEquivalence = ReadonlyArray.getEquivalence(item)
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
export interface readonlySetFromSelf<Value extends Schema.Any> extends
  Annotable<
    readonlySetFromSelf<Value>,
    ReadonlySet<Schema.Type<Value>>,
    ReadonlySet<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category ReadonlySet transformations
 * @since 1.0.0
 */
export const readonlySetFromSelf = <Value extends Schema.Any>(
  value: Value
): readonlySetFromSelf<Value> => {
  return declare(
    [value],
    (item) => readonlySetParse(ParseResult.decodeUnknown(array(item))),
    (item) => readonlySetParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `ReadonlySet<${format(value)}>`,
      pretty: readonlySetPretty,
      arbitrary: readonlySetArbitrary,
      equivalence: readonlySetEquivalence
    }
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface readonlySet<Value extends Schema.Any> extends
  Annotable<
    readonlySet<Value>,
    ReadonlySet<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category ReadonlySet transformations
 * @since 1.0.0
 */
export const readonlySet = <Value extends Schema.Any>(value: Value): readonlySet<Value> => {
  const _value = asSchema(value)
  return transform(
    array(_value),
    readonlySetFromSelf(typeSchema(_value)),
    (as) => new Set(as),
    (set) => Array.from(set)
  )
}

const bigDecimalPretty = (): Pretty.Pretty<_bigDecimal.BigDecimal> => (val) =>
  `BigDecimal(${_bigDecimal.format(_bigDecimal.normalize(val))})`

const bigDecimalArbitrary = (): Arbitrary<_bigDecimal.BigDecimal> => (fc) =>
  fc.tuple(fc.bigInt(), fc.integer()).map(([value, scale]) => _bigDecimal.make(value, scale))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BigDecimalFromSelf extends Annotable<BigDecimalFromSelf, _bigDecimal.BigDecimal> {}

/**
 * @category BigDecimal constructors
 * @since 1.0.0
 */
export const BigDecimalFromSelf: BigDecimalFromSelf = declare(
  _bigDecimal.isBigDecimal,
  {
    identifier: "BigDecimalFromSelf",
    pretty: bigDecimalPretty,
    arbitrary: bigDecimalArbitrary,
    equivalence: () => _bigDecimal.Equivalence
  }
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BigDecimal extends Annotable<BigDecimal, _bigDecimal.BigDecimal, string> {}

/**
 * @category BigDecimal transformations
 * @since 1.0.0
 */
export const BigDecimal: BigDecimal = transformOrFail(
  string,
  BigDecimalFromSelf,
  (num, _, ast) =>
    _bigDecimal.fromString(num).pipe(Option.match({
      onNone: () => ParseResult.fail(new ParseResult.Type(ast, num)),
      onSome: (val) => ParseResult.succeed(_bigDecimal.normalize(val))
    })),
  (val) => ParseResult.succeed(_bigDecimal.format(_bigDecimal.normalize(val)))
).annotations({ identifier: "BigDecimal" })

/**
 * @category api interface
 * @since 1.0.0
 */
export interface BigDecimalFromNumber extends Annotable<BigDecimalFromNumber, _bigDecimal.BigDecimal, number> {}

/**
 * A schema that transforms a `number` into a `BigDecimal`.
 * When encoding, this Schema will produce incorrect results if the BigDecimal exceeds the 64-bit range of a number.
 *
 * @category BigDecimal transformations
 * @since 1.0.0
 */
export const BigDecimalFromNumber: BigDecimalFromNumber = transformOrFail(
  number,
  BigDecimalFromSelf,
  (num) => ParseResult.succeed(_bigDecimal.fromNumber(num)),
  (val) => ParseResult.succeed(_bigDecimal.unsafeToNumber(val))
).annotations({ identifier: "BigDecimalFromNumber" })

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanBigDecimalTypeId = Symbol.for("@effect/schema/TypeId/GreaterThanBigDecimal")

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const greaterThanBigDecimal = <A extends _bigDecimal.BigDecimal>(
  min: _bigDecimal.BigDecimal,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _bigDecimal.greaterThan(a, min), {
      typeId: { id: GreaterThanBigDecimalTypeId, annotation: { min } },
      description: `a BigDecimal greater than ${_bigDecimal.format(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToBigDecimalTypeId = Symbol.for(
  "@effect/schema/TypeId/GreaterThanOrEqualToBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const greaterThanOrEqualToBigDecimal = <A extends _bigDecimal.BigDecimal>(
  min: _bigDecimal.BigDecimal,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _bigDecimal.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToBigDecimalTypeId, annotation: { min } },
      description: `a BigDecimal greater than or equal to ${_bigDecimal.format(min)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanBigDecimalTypeId = Symbol.for("@effect/schema/TypeId/LessThanBigDecimal")

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const lessThanBigDecimal = <A extends _bigDecimal.BigDecimal>(
  max: _bigDecimal.BigDecimal,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _bigDecimal.lessThan(a, max), {
      typeId: { id: LessThanBigDecimalTypeId, annotation: { max } },
      description: `a BigDecimal less than ${_bigDecimal.format(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToBigDecimalTypeId = Symbol.for(
  "@effect/schema/TypeId/LessThanOrEqualToBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const lessThanOrEqualToBigDecimal = <A extends _bigDecimal.BigDecimal>(
  max: _bigDecimal.BigDecimal,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _bigDecimal.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanOrEqualToBigDecimalTypeId, annotation: { max } },
      description: `a BigDecimal less than or equal to ${_bigDecimal.format(max)}`,
      ...annotations
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const PositiveBigDecimalTypeId = Symbol.for(
  "@effect/schema/TypeId/PositiveBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const positiveBigDecimal = <A extends _bigDecimal.BigDecimal>(
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _bigDecimal.isPositive(a), {
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
export const NonNegativeBigDecimalTypeId = Symbol.for(
  "@effect/schema/TypeId/NonNegativeBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const nonNegativeBigDecimal = <A extends _bigDecimal.BigDecimal>(
  annotations?: FilterAnnotations<A>
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
export const NegativeBigDecimalTypeId = Symbol.for(
  "@effect/schema/TypeId/NegativeBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const negativeBigDecimal = <A extends _bigDecimal.BigDecimal>(
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _bigDecimal.isNegative(a), {
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
export const NonPositiveBigDecimalTypeId = Symbol.for(
  "@effect/schema/TypeId/NonPositiveBigDecimal"
)

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const nonPositiveBigDecimal = <A extends _bigDecimal.BigDecimal>(
  annotations?: FilterAnnotations<A>
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
export const BetweenBigDecimalTypeId = Symbol.for("@effect/schema/TypeId/BetweenBigDecimal")

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const betweenBigDecimal = <A extends _bigDecimal.BigDecimal>(
  minimum: _bigDecimal.BigDecimal,
  maximum: _bigDecimal.BigDecimal,
  annotations?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => _bigDecimal.between(a, { minimum, maximum }), {
      typeId: { id: BetweenBigDecimalTypeId, annotation: { maximum, minimum } },
      description: `a BigDecimal between ${_bigDecimal.format(minimum)} and ${_bigDecimal.format(maximum)}`,
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
  (minimum: _bigDecimal.BigDecimal, maximum: _bigDecimal.BigDecimal) =>
  <R, I, A extends _bigDecimal.BigDecimal>(self: Schema<A, I, R>): Schema<A, I, R> =>
    transform(
      self,
      self.pipe(typeSchema, betweenBigDecimal(minimum, maximum)),
      (self) => _bigDecimal.clamp(self, { minimum, maximum }),
      identity,
      { strict: false }
    )

/**
 * Negates a `BigDecimal`.
 *
 * @category BigDecimal transformations
 * @since 1.0.0
 */
export const negateBigDecimal = <R, I, A extends _bigDecimal.BigDecimal>(
  self: Schema<A, I, R>
): Schema<A, I, R> =>
  transform(
    self,
    typeSchema(self),
    (self) => _bigDecimal.negate(self),
    (self) => _bigDecimal.negate(self),
    { strict: false }
  )

const chunkArbitrary = <A>(item: Arbitrary<A>): Arbitrary<Chunk.Chunk<A>> => (fc) =>
  fc.array(item(fc)).map(Chunk.fromIterable)

const chunkPretty = <A>(item: Pretty.Pretty<A>): Pretty.Pretty<Chunk.Chunk<A>> => (c) =>
  `Chunk(${Chunk.toReadonlyArray(c).map(item).join(", ")})`

const chunkParse = <R, A>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<Chunk.Chunk<A>, R> =>
(u, options, ast) =>
  Chunk.isChunk(u) ?
    Chunk.isEmpty(u) ?
      ParseResult.succeed(Chunk.empty())
      : ParseResult.map(decodeUnknown(Chunk.toReadonlyArray(u), options), Chunk.fromIterable)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface chunkFromSelf<Value extends Schema.Any> extends
  Annotable<
    chunkFromSelf<Value>,
    Chunk.Chunk<Schema.Type<Value>>,
    Chunk.Chunk<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Chunk transformations
 * @since 1.0.0
 */
export const chunkFromSelf = <Value extends Schema.Any>(value: Value): chunkFromSelf<Value> => {
  return declare(
    [value],
    (item) => chunkParse(ParseResult.decodeUnknown(array(item))),
    (item) => chunkParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `Chunk<${format(value)}>`,
      pretty: chunkPretty,
      arbitrary: chunkArbitrary,
      equivalence: Chunk.getEquivalence
    }
  )
}

/**
 * @category api interface
 * @since 1.0.0
 */
export interface chunk<Value extends Schema.Any> extends
  Annotable<
    chunk<Value>,
    Chunk.Chunk<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category Chunk transformations
 * @since 1.0.0
 */
export const chunk = <Value extends Schema.Any>(value: Value): chunk<Value> => {
  const _value = asSchema(value)
  return transform(
    array(_value),
    chunkFromSelf(typeSchema(_value)),
    (as) => as.length === 0 ? Chunk.empty() : Chunk.fromIterable(as),
    Chunk.toReadonlyArray
  )
}

const toData = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(a: A): A =>
  Array.isArray(a) ? Data.array(a) : Data.struct(a)

const dataArbitrary = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Arbitrary<A>
): Arbitrary<A> =>
(fc) => item(fc).map(toData)

const dataPretty = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Pretty.Pretty<A>
): Pretty.Pretty<A> =>
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
export const dataFromSelf = <
  R,
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<A, I, R>
): Schema<A, I, R> => {
  return declare(
    [item],
    (item) => dataParse(ParseResult.decodeUnknown(item)),
    (item) => dataParse(ParseResult.encodeUnknown(item)),
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
export const data = <
  R,
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<A, I, R>
): Schema<A, I, R> =>
  transform(
    item,
    dataFromSelf(typeSchema(item)),
    toData,
    (a) => Array.isArray(a) ? Array.from(a) : Object.assign({}, a),
    { strict: false }
  )

type MissingSelfGeneric<Usage extends string, Params extends string = ""> =
  `Missing \`Self\` generic - use \`class Self extends ${Usage}<Self>()(${Params}{ ... })\``

/**
 * @category classes
 * @since 1.0.0
 */
export interface ClassSchema<Self, Fields extends Struct.Fields, A, I, R, C, Inherited, Proto>
  extends Schema<Self, I, R>
{
  new(
    props: keyof C extends never ? void | {} : C,
    disableValidation?: boolean | undefined
  ): A & Omit<Inherited, keyof A> & Proto

  readonly fields: Simplify<Fields>

  readonly extend: <Extended = never>() => <newFields extends Struct.Fields>(
    fields: newFields,
    annotations?: Annotations<Extended>
  ) => [Extended] extends [never] ? MissingSelfGeneric<"Base.extend">
    : ClassSchema<
      Extended,
      Fields & newFields,
      Simplify<A & Struct.Type<newFields>>,
      Simplify<I & Struct.Encoded<newFields>>,
      R | Struct.Context<newFields>,
      Simplify<C & Struct.Type<newFields>>,
      Self,
      Proto
    >

  readonly transformOrFail: <Transformed = never>() => <
    newFields extends Struct.Fields,
    R2,
    R3
  >(
    fields: newFields,
    decode: (
      input: A,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<Simplify<A & Struct.Type<newFields>>, ParseResult.ParseIssue, R2>,
    encode: (
      input: Simplify<A & Struct.Type<newFields>>,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<A, ParseResult.ParseIssue, R3>
  ) => [Transformed] extends [never] ? MissingSelfGeneric<"Base.transform">
    : ClassSchema<
      Transformed,
      Fields & newFields,
      Simplify<A & Struct.Type<newFields>>,
      I,
      R | Struct.Context<newFields> | R2 | R3,
      Simplify<C & Struct.Type<newFields>>,
      Self,
      Proto
    >

  readonly transformOrFailFrom: <Transformed = never>() => <
    newFields extends Struct.Fields,
    R2,
    R3
  >(
    fields: newFields,
    decode: (
      input: I,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<Simplify<I & Struct.Encoded<newFields>>, ParseResult.ParseIssue, R2>,
    encode: (
      input: Simplify<I & Struct.Encoded<newFields>>,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<I, ParseResult.ParseIssue, R3>
  ) => [Transformed] extends [never] ? MissingSelfGeneric<"Base.transformFrom">
    : ClassSchema<
      Transformed,
      Fields & newFields,
      Simplify<A & Struct.Type<newFields>>,
      I,
      R | Struct.Context<newFields> | R2 | R3,
      Simplify<C & Struct.Type<newFields>>,
      Self,
      Proto
    >
}

const TAG = "_tag"

/**
 * @category classes
 * @since 1.0.0
 */
export const Class = <Self = never>() =>
<Fields extends Struct.Fields>(
  fields: Fields,
  annotations?: Annotations<Self>
): [Self] extends [never] ? MissingSelfGeneric<"Class">
  : ClassSchema<
    Self,
    Fields,
    Simplify<Struct.Type<Fields>>,
    Simplify<Struct.Encoded<Fields>>,
    Struct.Context<Fields>,
    Simplify<Struct.Type<Fields>>,
    {},
    {}
  > => makeClass({ fields, Base: Data.Class, annotations })

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedClass = <Self = never>() =>
<Tag extends string, Fields extends Struct.Fields>(
  tag: Tag,
  fields: Fields,
  annotations?: Annotations<Self>
): [Self] extends [never] ? MissingSelfGeneric<"TaggedClass", `"Tag", `>
  : ClassSchema<
    Self,
    { readonly [TAG]: literal<[Tag]> } & Fields,
    Simplify<{ readonly [TAG]: Tag } & Struct.Type<Fields>>,
    Simplify<{ readonly [TAG]: Tag } & Struct.Encoded<Fields>>,
    Struct.Context<Fields>,
    Simplify<Struct.Type<Fields>>,
    {},
    {}
  > =>
{
  return makeClass({
    fields: extendFields({ [TAG]: literal(tag) }, fields),
    Base: Data.Class,
    tag: { [TAG]: tag },
    annotations
  })
}

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedError = <Self = never>() =>
<Tag extends string, Fields extends Struct.Fields>(
  tag: Tag,
  fields: Fields,
  annotations?: Annotations<Self>
): [Self] extends [never] ? MissingSelfGeneric<"TaggedError", `"Tag", `>
  : ClassSchema<
    Self,
    { readonly [TAG]: literal<[Tag]> } & Fields,
    Simplify<{ readonly [TAG]: Tag } & Struct.Type<Fields>>,
    Simplify<{ readonly [TAG]: Tag } & Struct.Encoded<Fields>>,
    Struct.Context<Fields>,
    Simplify<Struct.Type<Fields>>,
    {},
    Cause.YieldableError
  > =>
{
  return makeClass({
    fields: extendFields({ [TAG]: literal(tag) }, fields),
    Base: Data.Error,
    tag: { [TAG]: tag },
    annotations
  })
}

/**
 * @category classes
 * @since 1.0.0
 */
export interface TaggedRequest<Tag extends string, R, IS, S, RR, IE, E, IA, A>
  extends Request.Request<A, E>, Serializable.SerializableWithResult<R, IS, S, RR, IE, E, IA, A>
{
  readonly [TAG]: Tag
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
    | TaggedRequest<string, any, any, any, any, never, never, any, any>
}

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedRequest =
  <Self = never>() =>
  <Tag extends string, Fields extends Struct.Fields, EA, EI, ER, AA, AI, AR>(
    tag: Tag,
    Failure: Schema<EA, EI, ER>,
    Success: Schema<AA, AI, AR>,
    fields: Fields,
    annotations?: Annotations<Self>
  ): [Self] extends [never] ? MissingSelfGeneric<"TaggedRequest", `"Tag", SuccessSchema, FailureSchema, `>
    : ClassSchema<
      Self,
      { readonly [TAG]: literal<[Tag]> } & Fields,
      Simplify<{ readonly [TAG]: Tag } & Struct.Type<Fields>>,
      Simplify<{ readonly [TAG]: Tag } & Struct.Encoded<Fields>>,
      Struct.Context<Fields>,
      Simplify<Struct.Type<Fields>>,
      TaggedRequest<
        Tag,
        Struct.Context<Fields>,
        { readonly [TAG]: Tag } & Struct.Encoded<Fields>,
        Self,
        ER | AR,
        EI,
        EA,
        AI,
        AA
      >,
      {}
    > =>
  {
    class SerializableRequest extends Request.Class<any, any, { readonly [TAG]: string }> {
      get [_serializable.symbol]() {
        return this.constructor
      }
      get [_serializable.symbolResult]() {
        return { Failure, Success }
      }
    }
    return makeClass({
      fields: extendFields({ [TAG]: literal(tag) }, fields),
      Base: SerializableRequest,
      tag: { [TAG]: tag },
      annotations
    })
  }

const extendFields = (a: Struct.Fields, b: Struct.Fields): Struct.Fields => {
  const out: Struct.Fields = { ...a }
  for (const name of _util.ownKeys(b)) {
    if (name in a) {
      throw new Error(AST.getDuplicatePropertySignatureErrorMessage(name))
    }
    out[name] = b[name]
  }
  return out
}

const makeClass = ({ Base, annotations, fields, fromSchema, tag }: {
  fields: Struct.Fields
  Base: new(...args: ReadonlyArray<any>) => any
  fromSchema?: Schema.Any | undefined
  tag?: { [TAG]: AST.LiteralValue } | undefined
  annotations?: Annotations<any> | undefined
}): any => {
  const schema = fromSchema ?? struct(fields)
  const validate = Parser.validateSync(schema)

  return class extends Base {
    constructor(
      props: { [x: string | symbol]: unknown } = {},
      disableValidation: boolean = false
    ) {
      if (tag !== undefined) {
        props = { ...props, ...tag }
      }
      if (disableValidation !== true) {
        props = validate(props)
      }
      super(props, true)
    }

    static [TypeId] = _schema.variance

    toString() {
      return Pretty.make(this.constructor as any)(this)
    }

    static pipe() {
      return pipeArguments(this, arguments)
    }

    static annotations(annotations: Annotations<any>) {
      return make(this.ast).annotations(annotations)
    }

    static fields = fields

    static get ast() {
      const toSchema = typeSchema(schema)
      const encode = Parser.encodeUnknown(toSchema)
      const pretty = Pretty.make(toSchema)
      const arb = arbitrary.make(toSchema)
      const equivalence = _equivalence.make(toSchema)
      const declaration: Schema.Any = declare(
        [],
        () => (input, _, ast) =>
          input instanceof this ? ParseResult.succeed(input) : ParseResult.fail(new ParseResult.Type(ast, input)),
        () => (input, options) =>
          input instanceof this
            ? ParseResult.succeed(input)
            : ParseResult.map(
              encode(input, options),
              (props) => new this(props, true)
            ),
        {
          identifier: this.name,
          title: this.name,
          description: `an instance of ${this.name}`,
          pretty: () => (self: any) => `${self.constructor.name}(${pretty(self)})`,
          arbitrary: () => (fc: any) => arb(fc).map((props: any) => new this(props)),
          equivalence: () => equivalence as any,
          [AST.SurrogateAnnotationId]: toSchema.ast,
          ...annotations
        }
      )
      const transformation = transform(
        schema,
        declaration,
        (input) => new this(input, true),
        identity
      )
      return transformation.ast
    }

    static struct = schema

    static extend<Extended>() {
      return (newFields: Struct.Fields, annotations?: Annotations<Extended>) => {
        const extendedFields = extendFields(fields, newFields)
        return makeClass({
          fields: extendedFields,
          Base: this,
          tag,
          annotations
        })
      }
    }

    static transformOrFail<Transformed>() {
      return (newFields: Struct.Fields, decode: any, encode: any, annotations?: Annotations<Transformed>) => {
        const transformedFields: Struct.Fields = extendFields(fields, newFields)
        return makeClass({
          fromSchema: transformOrFail(
            schema,
            typeSchema(struct(transformedFields)),
            decode,
            encode
          ),
          fields: transformedFields,
          Base: this,
          tag,
          annotations
        })
      }
    }

    static transformOrFailFrom<Transformed>() {
      return (newFields: Struct.Fields, decode: any, encode: any, annotations?: Annotations<Transformed>) => {
        const transformedFields: Struct.Fields = extendFields(fields, newFields)
        return makeClass({
          fromSchema: transformOrFail(
            encodedSchema(schema),
            struct(transformedFields),
            decode,
            encode
          ),
          fields: transformedFields,
          Base: this,
          tag,
          annotations
        })
      }
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

const FiberIdCompositeEncoded = struct({
  _tag: literal("Composite"),
  left: suspend(() => FiberIdEncoded),
  right: suspend(() => FiberIdEncoded)
}).annotations({ identifier: "FiberIdCompositeEncoded" })

const FiberIdNoneEncoded = struct({
  _tag: literal("None")
}).annotations({ identifier: "FiberIdNoneEncoded" })

const FiberIdRuntimeEncoded = struct({
  _tag: literal("Runtime"),
  id: Int.pipe(nonNegative({
    title: "id",
    description: "id"
  })),
  startTimeMillis: Int.pipe(nonNegative({
    title: "startTimeMillis",
    description: "startTimeMillis"
  }))
}).annotations({ identifier: "FiberIdRuntimeEncoded" })

const FiberIdEncoded: Schema<FiberIdEncoded> = union(
  FiberIdCompositeEncoded,
  FiberIdNoneEncoded,
  FiberIdRuntimeEncoded
).annotations({ identifier: "FiberIdEncoded" })

const fiberIdFromArbitrary = arbitrary.make(FiberIdEncoded)

const fiberIdArbitrary: Arbitrary<_fiberId.FiberId> = (fc) => fiberIdFromArbitrary(fc).map(fiberIdDecode)

const fiberIdPretty: Pretty.Pretty<_fiberId.FiberId> = (fiberId) => {
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
export interface FiberIdFromSelf extends Annotable<FiberIdFromSelf, _fiberId.FiberId> {}

/**
 * @category FiberId constructors
 * @since 1.0.0
 */
export const FiberIdFromSelf: FiberIdFromSelf = declare(
  _fiberId.isFiberId,
  {
    identifier: "FiberIdFromSelf",
    pretty: () => fiberIdPretty,
    arbitrary: () => fiberIdArbitrary
  }
)

const fiberIdDecode = (input: FiberIdEncoded): _fiberId.FiberId => {
  switch (input._tag) {
    case "Composite":
      return _fiberId.composite(fiberIdDecode(input.left), fiberIdDecode(input.right))
    case "None":
      return _fiberId.none
    case "Runtime":
      return _fiberId.runtime(input.id, input.startTimeMillis)
  }
}

const fiberIdEncode = (input: _fiberId.FiberId): FiberIdEncoded => {
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
export interface FiberId extends Annotable<FiberId, _fiberId.FiberId, FiberIdEncoded> {}

/**
 * @category FiberId transformations
 * @since 1.0.0
 */
export const FiberId: FiberId = transform(
  FiberIdEncoded,
  FiberIdFromSelf,
  fiberIdDecode,
  fiberIdEncode
).annotations({ identifier: "FiberId" })

/**
 * @category Cause utils
 * @since 1.0.0
 */
export type CauseEncoded<E> =
  | {
    readonly _tag: "Die"
    readonly defect: unknown
  }
  | {
    readonly _tag: "Empty"
  }
  | {
    readonly _tag: "Fail"
    readonly error: E
  }
  | {
    readonly _tag: "Interrupt"
    readonly fiberId: FiberIdEncoded
  }
  | {
    readonly _tag: "Parallel"
    readonly left: CauseEncoded<E>
    readonly right: CauseEncoded<E>
  }
  | {
    readonly _tag: "Sequential"
    readonly left: CauseEncoded<E>
    readonly right: CauseEncoded<E>
  }

const causeDieEncoded = <R>(defect: Schema<unknown, unknown, R>) =>
  struct({
    _tag: literal("Die"),
    defect
  })

const CauseEmptyEncoded = struct({
  _tag: literal("Empty")
})

const causeFailEncoded = <E, EI, R>(error: Schema<E, EI, R>) =>
  struct({
    _tag: literal("Fail"),
    error
  })

const CauseInterruptEncoded = struct({
  _tag: literal("Interrupt"),
  fiberId: FiberIdEncoded
})

const causeParallelEncoded = <E, EI, R>(causeEncoded: Schema<CauseEncoded<E>, CauseEncoded<EI>, R>) =>
  struct({
    _tag: literal("Parallel"),
    left: causeEncoded,
    right: causeEncoded
  })

const causeSequentialEncoded = <E, EI, R>(causeEncoded: Schema<CauseEncoded<E>, CauseEncoded<EI>, R>) =>
  struct({
    _tag: literal("Sequential"),
    left: causeEncoded,
    right: causeEncoded
  })

const causeEncoded = <E, EI, R1, R2>(
  error: Schema<E, EI, R1>,
  defect: Schema<unknown, unknown, R2>
): Schema<CauseEncoded<E>, CauseEncoded<EI>, R1 | R2> => {
  const recur = suspend(() => out)
  const out: Schema<CauseEncoded<E>, CauseEncoded<EI>, R1 | R2> = union(
    causeDieEncoded(defect),
    CauseEmptyEncoded,
    causeFailEncoded(error),
    CauseInterruptEncoded,
    causeParallelEncoded(recur),
    causeSequentialEncoded(recur)
  ).annotations({ description: `CauseEncoded<${format(error)}>` })
  return out
}

const causeArbitrary = <E>(
  error: Arbitrary<E>,
  defect: Arbitrary<unknown>
): Arbitrary<Cause.Cause<E>> => {
  const arb = arbitrary.make(causeEncoded(schemaFromArbitrary(error), schemaFromArbitrary(defect)))
  return (fc) => arb(fc).map(causeDecode)
}

const causePretty = <E>(error: Pretty.Pretty<E>): Pretty.Pretty<Cause.Cause<E>> => (cause) => {
  const f = (cause: Cause.Cause<E>): string => {
    switch (cause._tag) {
      case "Empty":
        return "Cause.empty"
      case "Die":
        return `Cause.die(${Cause.pretty(cause)})`
      case "Interrupt":
        return `Cause.interrupt(${fiberIdPretty(cause.fiberId)})`
      case "Fail":
        return `Cause.fail(${error(cause.error)})`
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
): ParseResult.DeclarationDecodeUnknown<Cause.Cause<A>, R> =>
(u, options, ast) =>
  Cause.isCause(u) ?
    ParseResult.map(decodeUnknown(causeEncode(u), options), causeDecode)
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface causeFromSelf<E extends Schema.Any, DR> extends
  Annotable<
    causeFromSelf<E, DR>,
    Cause.Cause<Schema.Type<E>>,
    Cause.Cause<Schema.Encoded<E>>,
    Schema.Context<E> | DR
  >
{}

/**
 * @category Cause transformations
 * @since 1.0.0
 */
export const causeFromSelf = <E extends Schema.Any, DR = never>({ defect = unknown, error }: {
  readonly error: E
  readonly defect?: Schema<unknown, unknown, DR> | undefined
}): causeFromSelf<E, DR> => {
  return declare(
    [error, defect],
    (error, defect) => causeParse(ParseResult.decodeUnknown(causeEncoded(error, defect))),
    (error, defect) => causeParse(ParseResult.encodeUnknown(causeEncoded(error, defect))),
    {
      description: `Cause<${format(error)}>`,
      pretty: causePretty,
      arbitrary: causeArbitrary
    }
  )
}

function causeDecode<E>(cause: CauseEncoded<E>): Cause.Cause<E> {
  switch (cause._tag) {
    case "Die":
      return Cause.die(cause.defect)
    case "Empty":
      return Cause.empty
    case "Interrupt":
      return Cause.interrupt(fiberIdDecode(cause.fiberId))
    case "Fail":
      return Cause.fail(cause.error)
    case "Parallel":
      return Cause.parallel(causeDecode(cause.left), causeDecode(cause.right))
    case "Sequential":
      return Cause.sequential(causeDecode(cause.left), causeDecode(cause.right))
  }
}

function causeEncode<E>(cause: Cause.Cause<E>): CauseEncoded<E> {
  switch (cause._tag) {
    case "Empty":
      return { _tag: "Empty" }
    case "Die":
      return { _tag: "Die", defect: cause.defect }
    case "Interrupt":
      return { _tag: "Interrupt", fiberId: cause.fiberId }
    case "Fail":
      return { _tag: "Fail", error: cause.error }
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

const causeDefectPretty: Schema<unknown> = transform(
  unknown,
  unknown,
  identity,
  (defect) => {
    if (Predicate.isObject(defect)) {
      return Cause.pretty(Cause.die(defect))
    }
    return String(defect)
  }
)

/**
 * @category api interface
 * @since 1.0.0
 */
export interface cause<E extends Schema.Any, DR> extends
  Annotable<
    cause<E, DR>,
    Cause.Cause<Schema.Type<E>>,
    CauseEncoded<Schema.Encoded<E>>,
    Schema.Context<E> | DR
  >
{}

/**
 * @category Cause transformations
 * @since 1.0.0
 */
export const cause = <E extends Schema.Any, DR = never>({ defect = causeDefectPretty, error }: {
  readonly error: E
  readonly defect?: Schema<unknown, unknown, DR> | undefined
}): cause<E, DR> => {
  const _error = asSchema(error)
  return transform(
    causeEncoded(_error, defect),
    causeFromSelf({ error: typeSchema(_error), defect: typeSchema(defect) }),
    causeDecode,
    causeEncode
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
  struct({
    _tag: literal("Failure"),
    cause: causeEncoded(error, defect)
  })

const exitSuccessEncoded = <A, I, R>(
  value: Schema<A, I, R>
) =>
  struct({
    _tag: literal("Success"),
    value
  })

const exitEncoded = <A, I, R, E, EI, ER, DR>(
  value: Schema<A, I, R>,
  error: Schema<E, EI, ER>,
  defect: Schema<unknown, unknown, DR>
): Schema<ExitEncoded<A, E>, ExitEncoded<I, EI>, ER | R | DR> =>
  union(
    exitFailureEncoded(error, defect),
    exitSuccessEncoded(value)
  )

const exitDecode = <A, E>(input: ExitEncoded<A, E>): Exit.Exit<A, E> => {
  switch (input._tag) {
    case "Failure":
      return Exit.failCause(causeDecode(input.cause))
    case "Success":
      return Exit.succeed(input.value)
  }
}

const exitArbitrary = <A, E>(
  value: Arbitrary<A>,
  error: Arbitrary<E>,
  defect: Arbitrary<unknown>
): Arbitrary<Exit.Exit<A, E>> => {
  const arb = arbitrary.make(
    exitEncoded(schemaFromArbitrary(value), schemaFromArbitrary(error), schemaFromArbitrary(defect))
  )
  return (fc) => arb(fc).map(exitDecode)
}

const exitPretty = <A, E>(value: Pretty.Pretty<A>, error: Pretty.Pretty<E>): Pretty.Pretty<Exit.Exit<A, E>> => (exit) =>
  exit._tag === "Failure"
    ? `Exit.failCause(${causePretty(error)(exit.cause)})`
    : `Exit.succeed(${value(exit.value)})`

const exitParse = <A, R, E, ER>(
  decodeUnknownValue: ParseResult.DecodeUnknown<A, R>,
  decodeUnknownCause: ParseResult.DecodeUnknown<Cause.Cause<E>, ER>
): ParseResult.DeclarationDecodeUnknown<Exit.Exit<A, E>, ER | R> =>
(u, options, ast) =>
  Exit.isExit(u) ?
    Exit.match(u, {
      onFailure: (cause) => ParseResult.map(decodeUnknownCause(cause, options), Exit.failCause),
      onSuccess: (value) => ParseResult.map(decodeUnknownValue(value, options), Exit.succeed)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface exitFromSelf<A extends Schema.Any, E extends Schema.Any, DR> extends
  Annotable<
    exitFromSelf<A, E, DR>,
    Exit.Exit<Schema.Type<A>, Schema.Type<E>>,
    Exit.Exit<Schema.Encoded<A>, Schema.Encoded<E>>,
    Schema.Context<A> | Schema.Context<E> | DR
  >
{}

/**
 * @category Exit transformations
 * @since 1.0.0
 */
export const exitFromSelf = <A extends Schema.Any, E extends Schema.Any, DR = never>(
  { defect = unknown, failure, success }: {
    readonly failure: E
    readonly success: A
    readonly defect?: Schema<unknown, unknown, DR> | undefined
  }
): exitFromSelf<A, E, DR> =>
  declare(
    [success, failure, defect],
    (success, failure, defect) =>
      exitParse(
        ParseResult.decodeUnknown(success),
        ParseResult.decodeUnknown(causeFromSelf({ error: failure, defect }))
      ),
    (success, failure, defect) =>
      exitParse(
        ParseResult.encodeUnknown(success),
        ParseResult.encodeUnknown(causeFromSelf({ error: failure, defect }))
      ),
    {
      description: `Exit<${format(failure)}, ${format(success)}>`,
      pretty: exitPretty,
      arbitrary: exitArbitrary
    }
  )

/**
 * @category api interface
 * @since 1.0.0
 */
export interface exit<A extends Schema.All, E extends Schema.All, DR> extends
  Annotable<
    exit<A, E, DR>,
    Exit.Exit<Schema.Type<A>, Schema.Type<E>>,
    ExitEncoded<Schema.Encoded<A>, Schema.Encoded<E>>,
    Schema.Context<A> | Schema.Context<E> | DR
  >
{}

/**
 * @category Exit transformations
 * @since 1.0.0
 */
export const exit = <A extends Schema.All, E extends Schema.All, DR = never>(
  { defect = causeDefectPretty, failure, success }: {
    readonly failure: E
    readonly success: A
    readonly defect?: Schema<unknown, unknown, DR> | undefined
  }
): exit<A, E, DR> => {
  const _success = asSchema(success)
  const _failure = asSchema(failure)
  return transform(
    exitEncoded(_success, _failure, defect),
    exitFromSelf({ failure: typeSchema(_failure), success: typeSchema(_success), defect: typeSchema(defect) }),
    exitDecode,
    (exit) =>
      exit._tag === "Failure"
        ? { _tag: "Failure", cause: exit.cause } as const
        : { _tag: "Success", value: exit.value } as const
  )
}

const hashSetArbitrary = <A>(item: Arbitrary<A>): Arbitrary<HashSet.HashSet<A>> => (fc) =>
  fc.array(item(fc)).map((as) => HashSet.fromIterable(as))

const hashSetPretty = <A>(item: Pretty.Pretty<A>): Pretty.Pretty<HashSet.HashSet<A>> => (set) =>
  `HashSet(${Array.from(set).map((a) => item(a)).join(", ")})`

const hashSetEquivalence = <A>(
  item: Equivalence.Equivalence<A>
): Equivalence.Equivalence<HashSet.HashSet<A>> => {
  const arrayEquivalence = ReadonlyArray.getEquivalence(item)
  return Equivalence.make((a, b) => arrayEquivalence(Array.from(a), Array.from(b)))
}

const hashSetParse = <R, A>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<HashSet.HashSet<A>, R> =>
(u, options, ast) =>
  HashSet.isHashSet(u) ?
    ParseResult.map(
      decodeUnknown(Array.from(u), options),
      (as): HashSet.HashSet<A> => HashSet.fromIterable(as)
    )
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface hashSetFromSelf<Value extends Schema.Any> extends
  Annotable<
    hashSetFromSelf<Value>,
    HashSet.HashSet<Schema.Type<Value>>,
    HashSet.HashSet<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category HashSet transformations
 * @since 1.0.0
 */
export const hashSetFromSelf = <Value extends Schema.Any>(
  value: Value
): hashSetFromSelf<Value> => {
  return declare(
    [value],
    (item) => hashSetParse(ParseResult.decodeUnknown(array(item))),
    (item) => hashSetParse(ParseResult.encodeUnknown(array(item))),
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
export interface hashSet<Value extends Schema.Any> extends
  Annotable<
    hashSet<Value>,
    HashSet.HashSet<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category HashSet transformations
 * @since 1.0.0
 */
export const hashSet = <Value extends Schema.Any>(value: Value): hashSet<Value> => {
  const _value = asSchema(value)
  return transform(
    array(_value),
    hashSetFromSelf(typeSchema(_value)),
    (as) => HashSet.fromIterable(as),
    (set) => Array.from(set)
  )
}

const hashMapArbitrary = <K, V>(
  key: Arbitrary<K>,
  value: Arbitrary<V>
): Arbitrary<HashMap.HashMap<K, V>> =>
(fc) => fc.array(fc.tuple(key(fc), value(fc))).map((as) => HashMap.fromIterable(as))

const hashMapPretty = <K, V>(
  key: Pretty.Pretty<K>,
  value: Pretty.Pretty<V>
): Pretty.Pretty<HashMap.HashMap<K, V>> =>
(map) =>
  `HashMap([${
    Array.from(map)
      .map(([k, v]) => `[${key(k)}, ${value(v)}]`)
      .join(", ")
  }])`

const hashMapEquivalence = <K, V>(
  key: Equivalence.Equivalence<K>,
  value: Equivalence.Equivalence<V>
): Equivalence.Equivalence<HashMap.HashMap<K, V>> => {
  const arrayEquivalence = ReadonlyArray.getEquivalence(
    Equivalence.make<[K, V]>(([ka, va], [kb, vb]) => key(ka, kb) && value(va, vb))
  )
  return Equivalence.make((a, b) => arrayEquivalence(Array.from(a), Array.from(b)))
}

const hashMapParse = <R, K, V>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<readonly [K, V]>, R>
): ParseResult.DeclarationDecodeUnknown<HashMap.HashMap<K, V>, R> =>
(u, options, ast) =>
  HashMap.isHashMap(u) ?
    ParseResult.map(decodeUnknown(Array.from(u), options), (as): HashMap.HashMap<K, V> => HashMap.fromIterable(as))
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface hashMapFromSelf<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
    hashMapFromSelf<K, V>,
    HashMap.HashMap<Schema.Type<K>, Schema.Type<V>>,
    HashMap.HashMap<Schema.Encoded<K>, Schema.Encoded<V>>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category HashMap transformations
 * @since 1.0.0
 */
export const hashMapFromSelf = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): hashMapFromSelf<K, V> => {
  return declare(
    [key, value],
    (key, value) => hashMapParse(ParseResult.decodeUnknown(array(tuple(key, value)))),
    (key, value) => hashMapParse(ParseResult.encodeUnknown(array(tuple(key, value)))),
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
export interface hashMap<K extends Schema.Any, V extends Schema.Any> extends
  Annotable<
    hashMap<K, V>,
    HashMap.HashMap<Schema.Type<K>, Schema.Type<V>>,
    ReadonlyArray<readonly [Schema.Encoded<K>, Schema.Encoded<V>]>,
    Schema.Context<K> | Schema.Context<V>
  >
{}

/**
 * @category HashMap transformations
 * @since 1.0.0
 */
export const hashMap = <K extends Schema.Any, V extends Schema.Any>({ key, value }: {
  readonly key: K
  readonly value: V
}): hashMap<K, V> => {
  const _key = asSchema(key)
  const _value = asSchema(value)
  return transform(
    array(tuple(_key, _value)),
    hashMapFromSelf({ key: typeSchema(_key), value: typeSchema(_value) }),
    (as) => HashMap.fromIterable(as),
    (map) => Array.from(map)
  )
}

const listArbitrary = <A>(item: Arbitrary<A>): Arbitrary<List.List<A>> => (fc) =>
  fc.array(item(fc)).map((as) => List.fromIterable(as))

const listPretty = <A>(item: Pretty.Pretty<A>): Pretty.Pretty<List.List<A>> => (set) =>
  `List(${Array.from(set).map((a) => item(a)).join(", ")})`

const listEquivalence = <A>(
  item: Equivalence.Equivalence<A>
): Equivalence.Equivalence<List.List<A>> => {
  const arrayEquivalence = ReadonlyArray.getEquivalence(item)
  return Equivalence.make((a, b) => arrayEquivalence(Array.from(a), Array.from(b)))
}

const listParse = <R, A>(
  decodeUnknown: ParseResult.DecodeUnknown<ReadonlyArray<A>, R>
): ParseResult.DeclarationDecodeUnknown<List.List<A>, R> =>
(u, options, ast) =>
  List.isList(u) ?
    ParseResult.map(
      decodeUnknown(Array.from(u), options),
      (as): List.List<A> => List.fromIterable(as)
    )
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @category api interface
 * @since 1.0.0
 */
export interface listFromSelf<Value extends Schema.Any> extends
  Annotable<
    listFromSelf<Value>,
    List.List<Schema.Type<Value>>,
    List.List<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category List transformations
 * @since 1.0.0
 */
export const listFromSelf = <Value extends Schema.Any>(
  value: Value
): listFromSelf<Value> => {
  return declare(
    [value],
    (item) => listParse(ParseResult.decodeUnknown(array(item))),
    (item) => listParse(ParseResult.encodeUnknown(array(item))),
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
export interface list<Value extends Schema.Any> extends
  Annotable<
    list<Value>,
    List.List<Schema.Type<Value>>,
    ReadonlyArray<Schema.Encoded<Value>>,
    Schema.Context<Value>
  >
{}

/**
 * @category List transformations
 * @since 1.0.0
 */
export const list = <Value extends Schema.Any>(value: Value): list<Value> => {
  const _value = asSchema(value)
  return transform(
    array(_value),
    listFromSelf(typeSchema(_value)),
    (as) => List.fromIterable(as),
    (set) => Array.from(set)
  )
}

const schemaFromArbitrary = <A>(value: Arbitrary<A>): Schema<A> =>
  suspend<A, A, never>(() => any).annotations({
    [_hooks.ArbitraryHookId]: () => value
  })
