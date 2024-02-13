/**
 * @since 1.0.0
 */

import * as BigDecimal from "effect/BigDecimal"
import * as BigInt_ from "effect/BigInt"
import * as Brand from "effect/Brand"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Encoding from "effect/Encoding"
import * as Equal from "effect/Equal"
import * as Equivalence from "effect/Equivalence"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
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
import * as Secret from "effect/Secret"
import * as S from "effect/String"
import type { Covariant, Equals, Invariant, Mutable, NoInfer, Simplify } from "effect/Types"
import type { Arbitrary } from "./Arbitrary.js"
import * as arbitrary from "./Arbitrary.js"
import * as ArrayFormatter from "./ArrayFormatter.js"
import type { ParseOptions } from "./AST.js"
import * as AST from "./AST.js"
import * as Internal from "./internal/ast.js"
import * as InternalBigInt from "./internal/bigint.js"
import * as filters from "./internal/filters.js"
import * as hooks from "./internal/hooks.js"
import * as InternalSchema from "./internal/schema.js"
import * as InternalSerializable from "./internal/serializable.js"
import * as Parser from "./Parser.js"
import * as ParseResult from "./ParseResult.js"
import * as Pretty from "./Pretty.js"
import type * as Serializable from "./Serializable.js"

/**
 * @since 1.0.0
 * @category symbol
 */
export const TypeId: unique symbol = InternalSchema.TypeId

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
}

/**
 * @category hashing
 * @since 1.0.0
 */
export const hash = <A, I, R>(schema: Schema<A, I, R>): number => AST.hash(schema.ast)

/**
 * @category formatting
 * @since 1.0.0
 */
export const format = <A, I, R>(schema: Schema<A, I, R>): string => AST.format(schema.ast)

/**
 * @since 1.0.0
 */
export declare module Schema {
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
  export type Context<S> = S extends Schema.Variance<infer _A, infer _I, infer R> ? R : never

  /**
   * @since 1.0.0
   */
  export type From<S> = S extends Schema.Variance<infer _A, infer I, infer _R> ? I : never

  /**
   * @since 1.0.0
   */
  export type To<S> = S extends Schema.Variance<infer A, infer _I, infer _R> ? A : never

  /**
   * @since 1.0.0
   */
  export type ToAsserts<S extends Schema<any>> = (
    input: unknown,
    options?: AST.ParseOptions
  ) => asserts input is Schema.To<S>
}

/**
 * @since 1.0.0
 */
export const from = <A, I, R>(schema: Schema<A, I, R>): Schema<I> => make(AST.from(schema.ast))

/**
 * @since 1.0.0
 */
export const to = <A, I, R>(schema: Schema<A, I, R>): Schema<A> => make(AST.to(schema.ast))

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
  return (u: unknown, overrideOptions?: ParseOptions): Either.Either<ParseResult.ParseError, I> =>
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
) => (a: A, overrideOptions?: ParseOptions) => Either.Either<ParseResult.ParseError, I> = encodeUnknownEither

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
  return (u: unknown, overrideOptions?: ParseOptions): Either.Either<ParseResult.ParseError, A> =>
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
) => (i: I, overrideOptions?: ParseOptions) => Either.Either<ParseResult.ParseError, A> = decodeUnknownEither

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
export const validateEither = <A, I>(
  schema: Schema<A, I, never>,
  options?: ParseOptions
) => {
  const validateEither = Parser.validateEither(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Either.Either<ParseResult.ParseError, A> =>
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
export const isSchema = (u: unknown): u is Schema<unknown, unknown, unknown> =>
  Predicate.isObject(u) && TypeId in u && "ast" in u

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <A, I, R>(ast: AST.AST) => Schema<A, I, R> = InternalSchema.make

const makeLiteral = <Literal extends AST.LiteralValue>(value: Literal): Schema<Literal> =>
  make(AST.createLiteral(value))

/**
 * @category constructors
 * @since 1.0.0
 */
export const literal = <Literals extends ReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
): Schema<Literals[number]> => union(...literals.map((literal) => makeLiteral(literal)))

/**
 * @category constructors
 * @since 1.0.0
 */
export const uniqueSymbol = <S extends symbol>(
  symbol: S,
  annotations?: AST.Annotations
): Schema<S> => make(AST.createUniqueSymbol(symbol, annotations))

/**
 * @category constructors
 * @since 1.0.0
 */
export const enums = <A extends { [x: string]: string | number }>(
  enums: A
): Schema<A[keyof A]> =>
  make(
    AST.createEnums(
      Object.keys(enums).filter(
        (key) => typeof enums[enums[key]] !== "number"
      ).map((key) => [key, enums[key]])
    )
  )

/**
 * @since 1.0.0
 */
export type Join<T> = T extends [infer Head, ...infer Tail]
  ? `${Head & (string | number | bigint | boolean | null | undefined)}${Tail extends [] ? ""
    : Join<Tail>}`
  : never

/**
 * @category constructors
 * @since 1.0.0
 */
export const templateLiteral = <T extends [Schema<any, any, never>, ...Array<Schema<any, any, never>>]>(
  ...[head, ...tail]: T
): Schema<Join<{ [K in keyof T]: Schema.To<T[K]> }>> => {
  let types: ReadonlyArray<AST.TemplateLiteral | AST.Literal> = getTemplateLiterals(head.ast)
  for (const span of tail) {
    types = ReadonlyArray.flatMap(
      types,
      (a) => getTemplateLiterals(span.ast).map((b) => combineTemplateLiterals(a, b))
    )
  }
  return make(AST.createUnion(types))
}

const combineTemplateLiterals = (
  a: AST.TemplateLiteral | AST.Literal,
  b: AST.TemplateLiteral | AST.Literal
): AST.TemplateLiteral | AST.Literal => {
  if (AST.isLiteral(a)) {
    return AST.isLiteral(b) ?
      AST.createLiteral(String(a.literal) + String(b.literal)) :
      AST.createTemplateLiteral(String(a.literal) + b.head, b.spans)
  }
  if (AST.isLiteral(b)) {
    return AST.createTemplateLiteral(
      a.head,
      ReadonlyArray.modifyNonEmptyLast(
        a.spans,
        (span) => ({ ...span, literal: span.literal + String(b.literal) })
      )
    )
  }
  return AST.createTemplateLiteral(
    a.head,
    ReadonlyArray.appendAll(
      ReadonlyArray.modifyNonEmptyLast(
        a.spans,
        (span) => ({ ...span, literal: span.literal + String(b.head) })
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
      return [AST.createTemplateLiteral("", [{ type: ast, literal: "" }])]
    case "Union":
      return ReadonlyArray.flatMap(ast.types, getTemplateLiterals)
    default:
      throw new Error(`templateLiteral: unsupported template literal span (${AST.format(ast)})`)
  }
}

const declareConstructor = <
  const P extends ReadonlyArray<Schema<any, any, any>>,
  R extends Schema.Context<P[number]>,
  I,
  A
>(
  typeParameters: P,
  decodeUnknown: (
    ...typeParameters: P
  ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<A, ParseResult.ParseIssue, R>,
  encodeUnknown: (
    ...typeParameters: P
  ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<I, ParseResult.ParseIssue, R>,
  annotations?: DeclareAnnotations<P, A>
): Schema<A, I, Schema.Context<P[number]>> =>
  make(AST.createDeclaration(
    typeParameters.map((tp) => tp.ast),
    (...typeParameters) => decodeUnknown(...typeParameters.map((ast) => make(ast)) as any),
    (...typeParameters) => encodeUnknown(...typeParameters.map((ast) => make(ast)) as any),
    toAnnotations(annotations)
  ))

const declarePrimitive = <A>(
  is: (input: unknown) => input is A,
  annotations?: DeclareAnnotations<[], A>
): Schema<A> => {
  const decodeUnknown = () => (input: unknown, _: ParseOptions, ast: AST.Declaration) =>
    is(input) ? ParseResult.succeed(input) : ParseResult.fail(ParseResult.type(ast, input))
  const encodeUnknown = decodeUnknown
  return make(AST.createDeclaration([], decodeUnknown, encodeUnknown, toAnnotations(annotations)))
}

/**
 * @since 1.0.0
 */
export interface DeclareAnnotations<P extends ReadonlyArray<any>, A> extends DocAnnotations {
  readonly message?: AST.MessageAnnotation<A>
  readonly typeId?: AST.TypeAnnotation | { id: AST.TypeAnnotation; annotation: unknown }
  readonly arbitrary?: (...arbitraries: { readonly [K in keyof P]: Arbitrary<P[K]> }) => Arbitrary<A>
  readonly pretty?: (...pretties: { readonly [K in keyof P]: Pretty.Pretty<P[K]> }) => Pretty.Pretty<A>
  readonly equivalence?: (
    ...equivalences: { readonly [K in keyof P]: Equivalence.Equivalence<P[K]> }
  ) => Equivalence.Equivalence<A>
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
    annotations?: DeclareAnnotations<readonly [], A>
  ): Schema<A>
  <const P extends ReadonlyArray<Schema<any, any, any>>, R extends Schema.Context<P[number]>, I, A>(
    typeParameters: P,
    decodeUnknown: (
      ...typeParameters: P
    ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<A, ParseResult.ParseIssue, R>,
    encodeUnknown: (
      ...typeParameters: P
    ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<I, ParseResult.ParseIssue, R>,
    annotations?: DeclareAnnotations<{ readonly [K in keyof P]: Schema.To<P[K]> }, A>
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
  options?: FilterAnnotations<Brand.Brand.Unbranded<C>>
) =>
<R, I, A extends Brand.Brand.Unbranded<C>>(self: Schema<A, I, R>): Schema<A & C, I, R> => {
  return make(AST.createRefinement(
    self.ast,
    (a: A, _: ParseOptions, ast: AST.AST): Option.Option<ParseResult.ParseIssue> => {
      const either = constructor.either(a)
      return Either.isLeft(either) ?
        Option.some(ParseResult.type(ast, a, either.left.map((v) => v.message).join(", "))) :
        Option.none()
    },
    toAnnotations({ typeId: { id: BrandTypeId, annotation: { constructor } }, ...options })
  ))
}

/**
 * @category type id
 * @since 1.0.0
 */
export const InstanceOfTypeId = Symbol.for("@effect/schema/TypeId/InstanceOf")

/**
 * @category constructors
 * @since 1.0.0
 */
export const instanceOf = <A extends abstract new(...args: any) => any>(
  constructor: A,
  options?: DeclareAnnotations<[], InstanceType<A>>
): Schema<InstanceType<A>> =>
  declare(
    (u): u is InstanceType<A> => u instanceof constructor,
    {
      title: constructor.name,
      description: `an instance of ${constructor.name}`,
      pretty: (): Pretty.Pretty<InstanceType<A>> => String,
      typeId: { id: InstanceOfTypeId, annotation: { constructor } },
      ...options
    }
  )

const _undefined: Schema<undefined> = make(AST.undefinedKeyword)

const _void: Schema<void> = make(AST.voidKeyword)

const _null: Schema<null> = make(AST._null)

export {
  /**
   * @category primitives
   * @since 1.0.0
   */
  _null as null,
  /**
   * @category primitives
   * @since 1.0.0
   */
  _undefined as undefined,
  /**
   * @category primitives
   * @since 1.0.0
   */
  _void as void
}

/**
 * @category primitives
 * @since 1.0.0
 */
export const never: Schema<never> = make(AST.neverKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const unknown: Schema<unknown> = make(AST.unknownKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const any: Schema<any> = make(AST.anyKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const string: Schema<string> = make(AST.stringKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const number: Schema<number> = make(AST.numberKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const boolean: Schema<boolean> = make(AST.booleanKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const bigintFromSelf: Schema<bigint> = make(AST.bigIntKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const symbolFromSelf: Schema<symbol> = make(AST.symbolKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const object: Schema<object> = make(AST.objectKeyword)

/**
 * @category combinators
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any, any, any>>>(
  ...members: Members
): Schema<Schema.To<Members[number]>, Schema.From<Members[number]>, Schema.Context<Members[number]>> =>
  make(AST.createUnion(members.map((m) => m.ast)))

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullable = <A, I, R>(self: Schema<A, I, R>): Schema<A | null, I | null, R> => union(_null, self)

/**
 * @category combinators
 * @since 1.0.0
 */
export const orUndefined = <A, I, R>(
  self: Schema<A, I, R>
): Schema<A | undefined, I | undefined, R> => union(_undefined, self)

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullish = <A, I, R>(
  self: Schema<A, I, R>
): Schema<A | null | undefined, I | null | undefined, R> => union(_null, _undefined, self)

/**
 * @category combinators
 * @since 1.0.0
 */
export const keyof = <A, I, R>(schema: Schema<A, I, R>): Schema<keyof A> => make(AST.keyof(schema.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const tuple = <Elements extends ReadonlyArray<Schema<any, any, any>>>(
  ...elements: Elements
): Schema<
  { readonly [K in keyof Elements]: Schema.To<Elements[K]> },
  { readonly [K in keyof Elements]: Schema.From<Elements[K]> },
  Schema.Context<Elements[number]>
> =>
  make(
    AST.createTuple(
      elements.map((schema) => AST.createElement(schema.ast, false)),
      Option.none(),
      true
    )
  )

/**
 * @category combinators
 * @since 1.0.0
 */
export const rest =
  <B, IB, R2>(rest: Schema<B, IB, R2>) =>
  <A extends ReadonlyArray<any>, I extends ReadonlyArray<any>, R1>(
    self: Schema<A, I, R1>
  ): Schema<readonly [...A, ...Array<B>], readonly [...I, ...Array<IB>], R1 | R2> => {
    if (AST.isTuple(self.ast)) {
      return make(AST.appendRestElement(self.ast, rest.ast))
    }
    throw new Error("`rest` is not supported on this schema")
  }

/**
 * @category combinators
 * @since 1.0.0
 */
export const element =
  <B, IB, R2>(element: Schema<B, IB, R2>) =>
  <A extends ReadonlyArray<any>, I extends ReadonlyArray<any>, R1>(
    self: Schema<A, I, R1>
  ): Schema<readonly [...A, B], readonly [...I, IB], R1 | R2> => {
    if (AST.isTuple(self.ast)) {
      return make(AST.appendElement(self.ast, AST.createElement(element.ast, false)))
    }
    throw new Error("`element` is not supported on this schema")
  }

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
      return make(AST.appendElement(self.ast, AST.createElement(element.ast, true)))
    }
    throw new Error("`optionalElement` is not supported on this schema")
  }

/**
 * @category combinators
 * @since 1.0.0
 */
export const array = <A, I, R>(item: Schema<A, I, R>): Schema<ReadonlyArray<A>, ReadonlyArray<I>, R> =>
  make(AST.createTuple([], Option.some([item.ast]), true))

/**
 * @category combinators
 * @since 1.0.0
 */
export const nonEmptyArray = <A, I, R>(
  item: Schema<A, I, R>
): Schema<readonly [A, ...Array<A>], readonly [I, ...Array<I>], R> => tuple(item).pipe(rest(item))

/**
 * @since 1.0.0
 */
export interface PropertySignature<From, FromIsOptional, To, ToIsOptional, R = never>
  extends Schema.Variance<To, From, R>, Pipeable
{
  readonly FromIsOptional: FromIsOptional
  readonly ToIsOptional: ToIsOptional
}

type PropertySignatureAST =
  | {
    readonly _tag: "Declaration"
    readonly from: AST.AST
    readonly isOptional: boolean
    readonly annotations?: AST.Annotations | undefined
  }
  | {
    readonly _tag: "OptionalToRequired"
    readonly from: AST.AST
    readonly to: AST.AST
    readonly decode: AST.FinalPropertySignatureTransformation["decode"]
    readonly encode: AST.FinalPropertySignatureTransformation["encode"]
    readonly annotations?: AST.Annotations | undefined
  }

/** @internal */
export class PropertySignatureImpl<R, From, FromIsOptional, To, ToIsOptional> {
  readonly [TypeId]: Schema.Variance<To, From, R>[TypeId] = InternalSchema.variance
  readonly FromIsOptional!: FromIsOptional
  readonly ToIsOptional!: ToIsOptional

  constructor(
    readonly propertySignatureAST: PropertySignatureAST
  ) {}

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @since 1.0.0
 */
export const propertySignatureAnnotations = (annotations: DocAnnotations) =>
<S extends StructFields[PropertyKey]>(
  self: S
): S extends Schema<infer A, infer I, infer R> ? PropertySignature<I, false, A, false, R> : S => {
  if (isSchema(self)) {
    return new PropertySignatureImpl({
      _tag: "Declaration",
      from: self.ast,
      isOptional: false,
      annotations: toAnnotations(annotations)
    }) as any
  }
  return new PropertySignatureImpl({
    ...(self as any).propertySignatureAST,
    annotations: toAnnotations(annotations)
  }) as any
}

/**
 * @category optional
 * @since 1.0.0
 */
export const optionalToRequired = <A, I, R, B>(
  from: Schema<A, I, R>,
  to: Schema<B>,
  decode: (o: Option.Option<A>) => B, // `none` here means: the value is missing in the input
  encode: (b: B) => Option.Option<A>, // `none` here means: the value will be missing in the output
  annotations?: DocAnnotations
): PropertySignature<I, true, B, false, R> =>
  new PropertySignatureImpl({
    _tag: "OptionalToRequired",
    from: from.ast,
    to: to.ast,
    decode: (o) => Option.some(decode(o)),
    encode: Option.flatMap(encode),
    annotations: toAnnotations(annotations)
  })

/**
 * @since 1.0.0
 */
export const optional: {
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly default: () => A
      readonly nullable: true
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I | null, true, A, false, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly default: () => A
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I, true, A, false, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly nullable: true
      readonly as: "Option"
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I | null, true, Option.Option<A>, false, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly as: "Option"
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I, true, Option.Option<A>, false, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly exact: true
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I, true, A, true, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly default: () => A
      readonly nullable: true
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I | null | undefined, true, A, false, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly nullable: true
      readonly as: "Option"
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I | undefined | null, true, Option.Option<A>, false, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly as: "Option"
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I | undefined, true, Option.Option<A>, false, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options: {
      readonly default: () => A
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I | undefined, true, A, false, R>
  <A, I, R>(
    schema: Schema<A, I, R>,
    options?: {
      readonly annotations?: DocAnnotations | undefined
    }
  ): PropertySignature<I | undefined, true, A | undefined, true, R>
} = <A, I, R>(
  schema: Schema<A, I, R>,
  options?: {
    readonly exact?: true
    readonly default?: () => A
    readonly nullable?: true
    readonly as?: "Option"
    readonly annotations?: DocAnnotations | undefined
  }
): PropertySignature<any, any, any, any, R> => {
  const isExact = options?.exact
  const value = options?.default
  const isNullable = options?.nullable
  const asOption = options?.as == "Option"
  const annotations = options?.annotations

  if (isExact) {
    if (value) {
      if (isNullable) {
        return optionalToRequired(
          nullable(schema),
          to(schema),
          Option.match({ onNone: value, onSome: (a) => a === null ? value() : a }),
          Option.some,
          annotations
        )
      } else {
        return optionalToRequired(
          schema,
          to(schema),
          Option.match({ onNone: value, onSome: identity }),
          Option.some,
          annotations
        )
      }
    } else {
      if (asOption) {
        if (isNullable) {
          return optionalToRequired(
            nullable(schema),
            optionFromSelf(to(schema)),
            Option.filter(Predicate.isNotNull),
            identity,
            annotations
          )
        } else {
          return optionalToRequired(
            schema,
            optionFromSelf(to(schema)),
            identity,
            identity,
            annotations
          )
        }
      }
      return new PropertySignatureImpl({
        _tag: "Declaration",
        from: schema.ast,
        isOptional: true,
        annotations: toAnnotations(annotations)
      })
    }
  } else {
    if (value) {
      if (isNullable) {
        return optionalToRequired(
          nullish(schema),
          to(schema),
          Option.match({ onNone: value, onSome: (a) => (a == null ? value() : a) }),
          Option.some,
          annotations
        )
      } else {
        return optionalToRequired(
          orUndefined(schema),
          to(schema),
          Option.match({ onNone: value, onSome: (a) => (a === undefined ? value() : a) }),
          Option.some,
          annotations
        )
      }
    } else {
      if (asOption) {
        if (isNullable) {
          return optionalToRequired(
            nullish(schema),
            optionFromSelf(to(schema)),
            Option.filter((a: A | null | undefined): a is A => a != null),
            identity,
            annotations
          )
        } else {
          return optionalToRequired(
            orUndefined(schema),
            optionFromSelf(to(schema)),
            Option.filter(Predicate.isNotUndefined),
            identity,
            annotations
          )
        }
      }
      return new PropertySignatureImpl({
        _tag: "Declaration",
        from: orUndefined(schema).ast,
        isOptional: true,
        annotations: toAnnotations(annotations)
      })
    }
  }
}

/**
 * @since 1.0.0
 */
export type FromOptionalKeys<Fields> = {
  [K in keyof Fields]: Fields[K] extends
    | PropertySignature<any, true, any, boolean, any>
    | PropertySignature<never, true, never, boolean, any> ? K
    : never
}[keyof Fields]

/**
 * @since 1.0.0
 */
export type ToOptionalKeys<Fields> = {
  [K in keyof Fields]: Fields[K] extends
    | PropertySignature<any, boolean, any, true, any>
    | PropertySignature<never, boolean, never, true, any> ? K
    : never
}[keyof Fields]

/**
 * @since 1.0.0
 */
export type StructFields = Record<
  PropertyKey,
  | Schema<any, any, any>
  | Schema<never, never, any>
  | PropertySignature<any, boolean, any, boolean, any>
  | PropertySignature<never, boolean, never, boolean, any>
>

/**
 * @since 1.0.0
 */
export type FromStruct<Fields extends StructFields> =
  & { readonly [K in Exclude<keyof Fields, FromOptionalKeys<Fields>>]: Schema.From<Fields[K]> }
  & { readonly [K in FromOptionalKeys<Fields>]?: Schema.From<Fields[K]> }

/**
 * @since 1.0.0
 */
export type ToStruct<Fields extends StructFields> =
  & { readonly [K in Exclude<keyof Fields, ToOptionalKeys<Fields>>]: Schema.To<Fields[K]> }
  & { readonly [K in ToOptionalKeys<Fields>]?: Schema.To<Fields[K]> }

/**
 * @category combinators
 * @since 1.0.0
 */
export const struct = <Fields extends StructFields>(
  fields: Fields
): Schema<Simplify<ToStruct<Fields>>, Simplify<FromStruct<Fields>>, Schema.Context<Fields[keyof Fields]>> => {
  const ownKeys = Internal.ownKeys(fields)
  const pss: Array<AST.PropertySignature> = []
  const pssFrom: Array<AST.PropertySignature> = []
  const pssTo: Array<AST.PropertySignature> = []
  const psTransformations: Array<AST.PropertySignatureTransform> = []
  for (let i = 0; i < ownKeys.length; i++) {
    const key = ownKeys[i]
    const field = fields[key] as any
    if ("propertySignatureAST" in field) {
      const psAst: PropertySignatureAST = field.propertySignatureAST
      const from = psAst.from
      const annotations = psAst.annotations
      switch (psAst._tag) {
        case "Declaration":
          pss.push(AST.createPropertySignature(key, from, psAst.isOptional, true, annotations))
          pssFrom.push(AST.createPropertySignature(key, from, psAst.isOptional, true))
          pssTo.push(
            AST.createPropertySignature(key, AST.to(from), psAst.isOptional, true, annotations)
          )
          break
        case "OptionalToRequired":
          pssFrom.push(AST.createPropertySignature(key, from, true, true))
          pssTo.push(AST.createPropertySignature(key, psAst.to, false, true, annotations))
          psTransformations.push(
            AST.createPropertySignatureTransform(
              key,
              key,
              AST.createFinalPropertySignatureTransformation(psAst.decode, psAst.encode)
            )
          )
          break
      }
    } else {
      pss.push(AST.createPropertySignature(key, field.ast, false, true))
      pssFrom.push(AST.createPropertySignature(key, field.ast, false, true))
      pssTo.push(AST.createPropertySignature(key, AST.to(field.ast), false, true))
    }
  }
  if (ReadonlyArray.isNonEmptyReadonlyArray(psTransformations)) {
    return make(
      AST.createTransform(
        AST.createTypeLiteral(pssFrom, []),
        AST.createTypeLiteral(pssTo, []),
        AST.createTypeLiteralTransformation(
          psTransformations
        )
      )
    )
  }
  return make(AST.createTypeLiteral(pss, []))
}

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
          AST.createTransform(
            AST.pick(ast.from, keys),
            AST.pick(ast.to, keys),
            AST.createTypeLiteralTransformation(propertySignatureTransformations)
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
          AST.createTransform(
            AST.omit(ast.from, keys),
            AST.omit(ast.to, keys),
            AST.createTypeLiteralTransformation(propertySignatureTransformations)
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
      return make(ps.isOptional ? AST.createUnion([AST.undefinedKeyword, ps.type]) : ps.type)
    } else {
      const ps = AST.getPropertyKeyIndexedAccess(to(schema).ast, key)
      const value = make<A[K], A[K], R>(ps.isOptional ? AST.createUnion([AST.undefinedKeyword, ps.type]) : ps.type)
      return transform(
        schema,
        value,
        (a) => a[key],
        (ak) => ps.isOptional && ak === undefined ? {} : { [key]: ak } as any
      )
    }
  }
)

/**
 * @category model
 * @since 1.0.0
 */
export interface BrandSchema<A extends Brand.Brand<any>, I, R> extends Schema<A, I, R>, Brand.Brand.Constructor<A> {}

const appendBrandAnnotation = <B extends string | symbol>(
  ast: AST.AST,
  brand: B,
  options?: DocAnnotations
): AST.AST => {
  const annotations = toAnnotations(options)
  const brands = ast.annotations[AST.BrandAnnotationId] as Array<string> | undefined
  annotations[AST.BrandAnnotationId] = brands ? [...brands, brand] : [brand]
  return AST.mergeAnnotations(ast, annotations)
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
 * const Int = Schema.number.pipe(Schema.int(), Schema.brand("Int"))
 * type Int = Schema.Schema.To<typeof Int> // number & Brand<"Int">
 *
 * @category combinators
 * @since 1.0.0
 */
export const brand =
  <B extends string | symbol, A>(brand: B, options?: DocAnnotations) =>
  <I>(self: Schema<A, I, never>): BrandSchema<A & Brand.Brand<B>, I, never> => {
    const ast = appendBrandAnnotation(self.ast, brand, options)
    const schema = make<I, A, never>(ast)
    const validateSync = Parser.validateSync(schema)
    const validateOption = Parser.validateOption(schema)
    const _validateEither = validateEither(schema)
    const is = Parser.is(schema)
    const out: any = Object.assign((input: unknown) => validateSync(input), {
      [Brand.RefinedConstructorsTypeId]: Brand.RefinedConstructorsTypeId,
      [TypeId]: InternalSchema.variance,
      ast,
      option: (input: unknown) => validateOption(input),
      either: (input: unknown) =>
        Either.mapLeft(
          _validateEither(input),
          (e) =>
            ArrayFormatter.formatError(e).map((err) => ({
              meta: err.path,
              message: err.message
            }))
        ),
      is: (input: unknown): input is A & Brand.Brand<B> => is(input),
      pipe() {
        return pipeArguments(this, arguments)
      }
    })
    return out
  }

/**
 * @category combinators
 * @since 1.0.0
 */
export const partial = <A, I, R>(
  self: Schema<A, I, R>
): Schema<Simplify<Partial<A>>, Simplify<Partial<I>>, R> => make(AST.partial(self.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const required = <A, I, R>(
  self: Schema<A, I, R>
): Schema<Simplify<Required<A>>, Simplify<Required<I>>, R> => make(AST.required(self.ast))

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
): Schema<Simplify<Mutable<A>>, Simplify<Mutable<I>>, R> => {
  const ast = AST.mutable(schema.ast)
  return ast === schema.ast ? schema as any : make(ast)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const record = <AK extends string | symbol, IK extends string | symbol, R1, AV, IV, R2>(
  key: Schema<AK, IK, R1>,
  value: Schema<AV, IV, R2>
): Schema<{ readonly [K in AK]: AV }, { readonly [K in IK]: IV }, R1 | R2> =>
  make(AST.createRecord(key.ast, value.ast, true))

/** @internal */
export const intersectUnionMembers = (xs: ReadonlyArray<AST.AST>, ys: ReadonlyArray<AST.AST>) => {
  return AST.createUnion(
    xs.flatMap((x) => {
      return ys.map((y) => {
        if (AST.isTypeLiteral(x)) {
          if (AST.isTypeLiteral(y)) {
            // isTypeLiteral(x) && isTypeLiteral(y)
            return AST.createTypeLiteral(
              x.propertySignatures.concat(y.propertySignatures),
              x.indexSignatures.concat(y.indexSignatures)
            )
          } else if (
            AST.isTransform(y) && AST.isTypeLiteralTransformation(y.transformation) &&
            AST.isTypeLiteral(y.from) && AST.isTypeLiteral(y.to)
          ) {
            // isTypeLiteral(x) && isTransform(y)
            const from = AST.createTypeLiteral(
              x.propertySignatures.concat(y.from.propertySignatures),
              x.indexSignatures.concat(y.from.indexSignatures)
            )
            const to = AST.createTypeLiteral(
              AST.getToPropertySignatures(x.propertySignatures).concat(y.to.propertySignatures),
              AST.getToIndexSignatures(x.indexSignatures).concat(y.to.indexSignatures)
            )
            return AST.createTransform(
              from,
              to,
              AST.createTypeLiteralTransformation(
                y.transformation.propertySignatureTransformations
              )
            )
          }
        } else if (
          AST.isTransform(x) && AST.isTypeLiteralTransformation(x.transformation) &&
          AST.isTypeLiteral(x.from) && AST.isTypeLiteral(x.to)
        ) {
          if (AST.isTypeLiteral(y)) {
            // isTransform(x) && isTypeLiteral(y)
            const from = AST.createTypeLiteral(
              x.from.propertySignatures.concat(y.propertySignatures),
              x.from.indexSignatures.concat(y.indexSignatures)
            )
            const to = AST.createTypeLiteral(
              x.to.propertySignatures.concat(AST.getToPropertySignatures(y.propertySignatures)),
              x.to.indexSignatures.concat(AST.getToIndexSignatures(y.indexSignatures))
            )
            return AST.createTransform(
              from,
              to,
              AST.createTypeLiteralTransformation(
                x.transformation.propertySignatureTransformations
              )
            )
          } else if (
            AST.isTransform(y) && AST.isTypeLiteralTransformation(y.transformation) &&
            AST.isTypeLiteral(y.from) && AST.isTypeLiteral(y.to)
          ) {
            // isTransform(x) && isTransform(y)
            const from = AST.createTypeLiteral(
              x.from.propertySignatures.concat(y.from.propertySignatures),
              x.from.indexSignatures.concat(y.from.indexSignatures)
            )
            const to = AST.createTypeLiteral(
              x.to.propertySignatures.concat(y.to.propertySignatures),
              x.to.indexSignatures.concat(y.to.indexSignatures)
            )
            return AST.createTransform(
              from,
              to,
              AST.createTypeLiteralTransformation(
                x.transformation.propertySignatureTransformations.concat(
                  y.transformation.propertySignatureTransformations
                )
              )
            )
          }
        }
        throw new Error("`extend` can only handle type literals or unions of type literals")
      })
    })
  )
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const extend: {
  <B, IB, R2>(
    that: Schema<B, IB, R2>
  ): <A, I, R1>(self: Schema<A, I, R1>) => Schema<Simplify<A & B>, Simplify<I & IB>, R1 | R2>
  <A, I, R1, B, IB, R2>(
    self: Schema<A, I, R1>,
    that: Schema<B, IB, R2>
  ): Schema<Simplify<A & B>, Simplify<I & IB>, R1 | R2>
} = dual(
  2,
  <A, I, R1, B, IB, R2>(
    self: Schema<A, I, R1>,
    that: Schema<B, IB, R2>
  ): Schema<Simplify<A & B>, Simplify<I & IB>, R1 | R2> =>
    make(
      intersectUnionMembers(
        AST.isUnion(self.ast) ? self.ast.types : [self.ast],
        AST.isUnion(that.ast) ? that.ast.types : [that.ast]
      )
    )
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
  annotations?: AST.Annotations
): Schema<A, I, R> => make(AST.createSuspend(() => f().ast, annotations))

/**
 * @category combinators
 * @since 1.0.0
 */
export function filter<A>(
  f: (a: A, options: ParseOptions, self: AST.Refinement) => Option.Option<ParseResult.ParseIssue>,
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R>
export function filter<C extends A, B extends A, A = C>(
  refinement: Predicate.Refinement<A, B>,
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<C, I, R>) => Schema<C & B, I, R>
export function filter<A>(
  predicate: Predicate.Predicate<NoInfer<A>>,
  options?: FilterAnnotations<NoInfer<A>>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R>
export function filter<A>(
  predicate: Predicate.Predicate<A> | AST.Refinement["filter"],
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> {
  return (self) =>
    make(AST.createRefinement(
      self.ast,
      (a, options, ast) => {
        const out = predicate(a, options, ast)
        if (Predicate.isBoolean(out)) {
          return out
            ? Option.none()
            : Option.some(ParseResult.type(ast, a))
        }
        return out
      },
      toAnnotations(options)
    ))
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
    AST.createTransform(
      from.ast,
      to.ast,
      AST.createFinalTransformation(decode, encode)
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
export const transformLiteral = <From extends AST.LiteralValue, To extends AST.LiteralValue>(
  from: From,
  to: To
): Schema<To, From, never> => transform(literal(from), literal(to), () => to, () => from)

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
export const transformLiterals = <
  const A extends ReadonlyArray<readonly [from: AST.LiteralValue, to: AST.LiteralValue]>
>(
  ...pairs: A
): Schema<A[number][1], A[number][0], never> => union(...pairs.map(([from, to]) => transformLiteral(from, to)))

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
  <K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    key: K,
    value: V,
    options?: DocAnnotations
  ): <A extends object, I, R>(
    schema: Schema<A, I, R>
  ) => Schema<Simplify<A & { readonly [k in K]: V }>, I, R>
  <A, I, R, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<A, I, R>,
    key: K,
    value: V,
    options?: DocAnnotations
  ): Schema<Simplify<A & { readonly [k in K]: V }>, I, R>
} = dual(
  (args) => isSchema(args[0]),
  <A, I, R, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<A, I, R>,
    key: K,
    value: V,
    options?: DocAnnotations
  ): Schema<Simplify<A & { readonly [k in K]: V }>, I, R> => {
    const attached = extend(
      to(schema),
      struct({ [key]: Predicate.isSymbol(value) ? uniqueSymbol(value) : literal(value) })
    ).ast
    return make(AST.createTransform(
      schema.ast,
      options ? AST.mergeAnnotations(attached, toAnnotations(options)) : attached,
      AST.createTypeLiteralTransformation(
        [
          AST.createPropertySignatureTransform(
            key,
            key,
            AST.createFinalPropertySignatureTransformation(
              () => Option.some(value),
              () => Option.none()
            )
          )
        ]
      )
    ))
  }
)

const toAnnotations = (
  options?: Record<string | symbol, any>
): Mutable<AST.Annotations> => {
  if (!options) {
    return {}
  }
  const out: Mutable<AST.Annotations> = {}

  // symbols are reserved for custom annotations
  const custom = Object.getOwnPropertySymbols(options)
  for (const sym of custom) {
    out[sym] = options[sym]
  }

  // string keys are reserved as /schema namespace
  if (options.typeId !== undefined) {
    const typeId = options.typeId
    if (typeof typeId === "object") {
      out[AST.TypeAnnotationId] = typeId.id
      out[typeId.id] = typeId.annotation
    } else {
      out[AST.TypeAnnotationId] = typeId
    }
  }
  const move = (from: keyof typeof options, to: symbol) => {
    if (options[from] !== undefined) {
      out[to] = options[from]
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
  move("arbitrary", hooks.ArbitraryHookId)
  move("pretty", hooks.PrettyHookId)
  move("equivalence", hooks.EquivalenceHookId)

  return out
}

/**
 * @since 1.0.0
 */
export interface DocAnnotations extends AST.Annotations {
  readonly identifier?: AST.IdentifierAnnotation
  readonly title?: AST.TitleAnnotation
  readonly description?: AST.DescriptionAnnotation
  readonly examples?: AST.ExamplesAnnotation
  readonly default?: AST.DefaultAnnotation
  readonly documentation?: AST.DocumentationAnnotation
}

/**
 * @since 1.0.0
 */
export interface FilterAnnotations<A> extends DeclareAnnotations<readonly [A], A> {
  /**
   * Attaches a JSON Schema annotation to this refinement.
   *
   * If the schema is composed of more than one refinement, the corresponding annotations will be merged.
   */
  readonly jsonSchema?: AST.JSONSchemaAnnotation
}

/**
 * @category annotations
 * @since 1.0.0
 */
export const annotations = (annotations: AST.Annotations) => <A, I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  make(AST.mergeAnnotations(self.ast, annotations))

/**
 * @category annotations
 * @since 1.0.0
 */
export const message = (message: AST.MessageAnnotation<unknown>) => <A, I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  make(AST.setAnnotation(self.ast, AST.MessageAnnotationId, message))

/**
 * @category annotations
 * @since 1.0.0
 */
export const identifier = (identifier: AST.IdentifierAnnotation) => <A, I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  make(AST.setAnnotation(self.ast, AST.IdentifierAnnotationId, identifier))

/**
 * @category annotations
 * @since 1.0.0
 */
export const title = (title: AST.TitleAnnotation) => <A, I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  make(AST.setAnnotation(self.ast, AST.TitleAnnotationId, title))

/**
 * @category annotations
 * @since 1.0.0
 */
export const description =
  (description: AST.DescriptionAnnotation) => <A, I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    make(AST.setAnnotation(self.ast, AST.DescriptionAnnotationId, description))

/**
 * @category annotations
 * @since 1.0.0
 */
export const examples = (examples: AST.ExamplesAnnotation) => <A, I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  make(AST.setAnnotation(self.ast, AST.ExamplesAnnotationId, examples))

const _default = <A>(value: A) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  make(AST.setAnnotation(self.ast, AST.DefaultAnnotationId, value))

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
  (documentation: AST.DocumentationAnnotation) => <A, I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    make(AST.setAnnotation(self.ast, AST.DocumentationAnnotationId, documentation))

/**
 * Attaches a JSON Schema annotation to a schema that represents a refinement.
 *
 * If the schema is composed of more than one refinement, the corresponding annotations will be merged.
 *
 * @category annotations
 * @since 1.0.0
 */
export const jsonSchema = (jsonSchema: AST.JSONSchemaAnnotation) => <A, I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  make(AST.setAnnotation(self.ast, AST.JSONSchemaAnnotationId, jsonSchema))

/**
 * @category annotations
 * @since 1.0.0
 */
export const equivalence =
  <A>(equivalence: Equivalence.Equivalence<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    make(AST.setAnnotation(self.ast, hooks.EquivalenceHookId, () => equivalence))

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
  <A extends string>(options?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => a === a.trim(), {
        typeId: TrimmedTypeId,
        description: "a string with no leading or trailing whitespace",
        ...options
      })
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const MaxLengthTypeId: unique symbol = filters.MaxLengthTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.length <= maxLength,
      {
        typeId: MaxLengthTypeId,
        description: `a string at most ${maxLength} character(s) long`,
        jsonSchema: { maxLength },
        ...options
      }
    )
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const MinLengthTypeId: unique symbol = filters.MinLengthTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.length >= minLength,
      {
        typeId: MinLengthTypeId,
        description: `a string at least ${minLength} character(s) long`,
        jsonSchema: { minLength },
        ...options
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
  options?: FilterAnnotations<A>
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
        ...options
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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.startsWith(startsWith),
      {
        typeId: { id: StartsWithTypeId, annotation: { startsWith } },
        description: `a string starting with ${JSON.stringify(startsWith)}`,
        jsonSchema: { pattern: `^${startsWith}` },
        ...options
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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.endsWith(endsWith),
      {
        typeId: { id: EndsWithTypeId, annotation: { endsWith } },
        description: `a string ending with ${JSON.stringify(endsWith)}`,
        jsonSchema: { pattern: `^.*${endsWith}$` },
        ...options
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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter(
      (a): a is A => a.includes(searchString),
      {
        typeId: { id: IncludesTypeId, annotation: { includes: searchString } },
        description: `a string including ${JSON.stringify(searchString)}`,
        jsonSchema: { pattern: `.*${searchString}.*` },
        ...options
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
  <A extends string>(options?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => a === a.toLowerCase(), {
        typeId: LowercasedTypeId,
        description: "a lowercase string",
        ...options
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
  <A extends string>(options?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => a === a.toUpperCase(), {
        typeId: UppercasedTypeId,
        description: "an uppercase string",
        ...options
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
export const LengthTypeId: unique symbol = filters.LengthTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a.length === length, {
      typeId: LengthTypeId,
      description: length === 1 ? `a single character` : `a string ${length} character(s) long`,
      jsonSchema: { minLength: length, maxLength: length },
      ...options
    })
  )

/**
 * A schema representing a single character.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const Char = string.pipe(length(1), identifier("Char"))

/**
 * @category string filters
 * @since 1.0.0
 */
export const nonEmpty = <A extends string>(
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> =>
  minLength(1, {
    description: "a non empty string",
    ...options
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
).pipe(identifier("Lowercase"))

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
).pipe(identifier("Uppercase"))

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
).pipe(identifier("Trim"))

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

const JsonString = string.pipe(annotations({
  [AST.IdentifierAnnotationId]: "JsonString",
  [AST.TitleAnnotationId]: "JsonString",
  [AST.DescriptionAnnotationId]: "a JSON string"
}))

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
    return compose(parseJson(o), schema) as any
  }
  const options: ParseJsonOptions | undefined = schema as any
  return transformOrFail(
    JsonString,
    unknown,
    (s, _, ast) =>
      ParseResult.try({
        try: () => JSON.parse(s, options?.reviver),
        catch: (e: any) => ParseResult.type(ast, s, e.message)
      }),
    (u, _, ast) =>
      ParseResult.try({
        try: () => JSON.stringify(u, options?.replacer, options?.space),
        catch: (e: any) => ParseResult.type(ast, u, e.message)
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
 * Represents a Universally Unique Identifier (UUID).
 *
 * This schema ensures that the provided string adheres to the standard UUID format.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const UUID: Schema<string> = string.pipe(
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
 * Represents a Universally Unique Lexicographically Sortable Identifier (ULID).
 *
 * ULIDs are designed to be compact, URL-safe, and ordered, making them suitable for use as identifiers.
 * This schema ensures that the provided string adheres to the standard ULID format.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const ULID: Schema<string> = string.pipe(
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
  <A extends number>(options?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => Number.isFinite(a), {
        typeId: FiniteTypeId,
        description: "a finite number",
        ...options
      })
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanTypeId: unique symbol = filters.GreaterThanTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a > min, {
      typeId: GreaterThanTypeId,
      description: min === 0 ? "a positive number" : `a number greater than ${min}`,
      jsonSchema: { exclusiveMinimum: min },
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToTypeId: unique symbol = filters.GreaterThanOrEqualToTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min, {
      typeId: GreaterThanOrEqualToTypeId,
      description: min === 0 ? "a non-negative number" : `a number greater than or equal to ${min}`,
      jsonSchema: { minimum: min },
      ...options
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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => N.remainder(a, divisor) === 0, {
      typeId: MultipleOfTypeId,
      description: `a number divisible by ${divisor}`,
      jsonSchema: { multipleOf: Math.abs(divisor) }, // spec requires positive divisor
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const IntTypeId: unique symbol = filters.IntTypeId

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
  <A extends number>(options?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => Number.isSafeInteger(a), {
        typeId: IntTypeId,
        title: "integer",
        description: "an integer",
        jsonSchema: { type: "integer" },
        ...options
      })
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanTypeId: unique symbol = filters.LessThanTypeId

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
  <A extends number>(max: number, options?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => a < max, {
        typeId: LessThanTypeId,
        description: max === 0 ? "a negative number" : `a number less than ${max}`,
        jsonSchema: { exclusiveMaximum: max },
        ...options
      })
    )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToTypeId: unique symbol = filters.LessThanOrEqualToTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a <= max, {
      typeId: LessThanOrEqualToTypeId,
      description: max === 0 ? "a non-positive number" : `a number less than or equal to ${max}`,
      jsonSchema: { maximum: max },
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const BetweenTypeId: unique symbol = filters.BetweenTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min && a <= max, {
      typeId: BetweenTypeId,
      description: `a number between ${min} and ${max}`,
      jsonSchema: { maximum: max, minimum: min },
      ...options
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
  <A extends number>(options?: FilterAnnotations<A>) => <I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
    self.pipe(
      filter((a): a is A => !Number.isNaN(a), {
        typeId: NonNaNTypeId,
        description: "a number excluding NaN",
        ...options
      })
    )

/**
 * @category number filters
 * @since 1.0.0
 */
export const positive = <A extends number>(
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThan(0, options)

/**
 * @category number filters
 * @since 1.0.0
 */
export const negative = <A extends number>(
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThan(0, options)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonPositive = <A extends number>(
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThanOrEqualTo(0, options)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonNegative = <A extends number>(
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThanOrEqualTo(0, options)

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
      self.pipe(to, between(minimum, maximum)),
      (self) => N.clamp(self, { minimum, maximum }),
      identity,
      { strict: false }
    )

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
export const NumberFromString: Schema<number, string> = transformOrFail(
  string,
  number,
  (s, _, ast) => {
    if (s === "NaN") {
      return ParseResult.succeed(NaN)
    }
    if (s === "Infinity") {
      return ParseResult.succeed(Infinity)
    }
    if (s === "-Infinity") {
      return ParseResult.succeed(-Infinity)
    }
    if (s.trim() === "") {
      return ParseResult.fail(ParseResult.type(ast, s))
    }
    const n = Number(s)
    return Number.isNaN(n)
      ? ParseResult.fail(ParseResult.type(ast, s))
      : ParseResult.succeed(n)
  },
  (n) => ParseResult.succeed(String(n))
).pipe(identifier("NumberFromString"))

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
 * This schema transforms a `string` into a `symbol`.
 *
 * @category symbol transformations
 * @since 1.0.0
 */
export const symbol: Schema<symbol, string> = transform(
  string,
  symbolFromSelf,
  (s) => Symbol.for(s),
  (sym) => sym.description,
  { strict: false }
).pipe(identifier("symbol"))

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanBigintTypeId: unique symbol = filters.GreaterThanBigintTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a > min, {
      typeId: { id: GreaterThanBigintTypeId, annotation: { min } },
      description: min === 0n ? "a positive bigint" : `a bigint greater than ${min}n`,
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToBigintTypeId: unique symbol = filters.GreaterThanOrEqualToBigintTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min, {
      typeId: { id: GreaterThanOrEqualToBigintTypeId, annotation: { min } },
      description: min === 0n
        ? "a non-negative bigint"
        : `a bigint greater than or equal to ${min}n`,
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanBigintTypeId: unique symbol = filters.LessThanBigintTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a < max, {
      typeId: { id: LessThanBigintTypeId, annotation: { max } },
      description: max === 0n ? "a negative bigint" : `a bigint less than ${max}n`,
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToBigintTypeId: unique symbol = filters.LessThanOrEqualToBigintTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a <= max, {
      typeId: { id: LessThanOrEqualToBigintTypeId, annotation: { max } },
      description: max === 0n ? "a non-positive bigint" : `a bigint less than or equal to ${max}n`,
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const BetweenBigintTypeId: unique symbol = filters.BetweenBigintTypeId

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
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a >= min && a <= max, {
      typeId: { id: BetweenBigintTypeId, annotation: { max, min } },
      description: `a bigint between ${min}n and ${max}n`,
      ...options
    })
  )

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const positiveBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThanBigint(0n, options)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const negativeBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThanBigint(0n, options)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonNegativeBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => greaterThanOrEqualToBigint(0n, options)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonPositiveBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <I, R>(self: Schema<A, I, R>) => Schema<A, I, R> => lessThanOrEqualToBigint(0n, options)

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
      self.pipe(to, betweenBigint(minimum, maximum)),
      (self) => BigInt_.clamp(self, { minimum, maximum }),
      identity,
      { strict: false }
    )

/**
 * This schema transforms a `string` into a `bigint` by parsing the string using the `BigInt` function.
 *
 * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const bigint: Schema<bigint, string> = transformOrFail(
  string,
  bigintFromSelf,
  (s, _, ast) => {
    if (s.trim() === "") {
      return ParseResult.fail(ParseResult.type(ast, s))
    }

    return ParseResult.try({
      try: () => BigInt(s),
      catch: () => ParseResult.type(ast, s)
    })
  },
  (n) => ParseResult.succeed(String(n))
).pipe(identifier("bigint"))

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
 * This schema transforms a `number` into a `bigint` by parsing the number using the `BigInt` function.
 *
 * It returns an error if the value can't be safely encoded as a `number` due to being out of range.
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const BigintFromNumber: Schema<bigint, number> = transformOrFail(
  number,
  bigintFromSelf,
  (n, _, ast) =>
    ParseResult.try({
      try: () => BigInt(n),
      catch: () => ParseResult.type(ast, n)
    }),
  (b, _, ast) => {
    if (b > InternalBigInt.maxSafeInteger || b < InternalBigInt.minSafeInteger) {
      return ParseResult.fail(ParseResult.type(ast, b))
    }
    return ParseResult.succeed(Number(b))
  }
).pipe(identifier("BigintFromNumber"))

/**
 * @category Secret constructors
 * @since 1.0.0
 */
export const SecretFromSelf: Schema<Secret.Secret> = declare(
  Secret.isSecret,
  {
    identifier: "SecretFromSelf",
    pretty: (): Pretty.Pretty<Secret.Secret> => (secret) => String(secret),
    arbitrary: (): Arbitrary<Secret.Secret> => (fc) => fc.string().map((_) => Secret.fromString(_))
  }
)

const _Secret: Schema<Secret.Secret, string> = transform(
  string,
  SecretFromSelf,
  (str) => Secret.fromString(str),
  (secret) => Secret.value(secret),
  { strict: false }
).pipe(identifier("Secret"))

export {
  /**
   * A schema that transforms a `string` into a `Secret`.
   *
   * @category Secret transformations
   * @since 1.0.0
   */
  _Secret as Secret
}

/**
 * @category Duration constructors
 * @since 1.0.0
 */
export const DurationFromSelf: Schema<Duration.Duration> = declare(
  Duration.isDuration,
  {
    identifier: "DurationFromSelf",
    pretty: (): Pretty.Pretty<Duration.Duration> => String,
    arbitrary: (): Arbitrary<Duration.Duration> => (fc) =>
      fc.oneof(
        fc.constant(Duration.infinity),
        fc.bigUint().map((_) => Duration.nanos(_)),
        fc.bigUint().map((_) => Duration.micros(_)),
        fc.maxSafeNat().map((_) => Duration.millis(_)),
        fc.maxSafeNat().map((_) => Duration.seconds(_)),
        fc.maxSafeNat().map((_) => Duration.minutes(_)),
        fc.maxSafeNat().map((_) => Duration.hours(_)),
        fc.maxSafeNat().map((_) => Duration.days(_)),
        fc.maxSafeNat().map((_) => Duration.weeks(_))
      ),
    equivalence: (): Equivalence.Equivalence<Duration.Duration> => Duration.Equivalence
  }
)

/**
 * A schema that transforms a `bigint` tuple into a `Duration`.
 * Treats the value as the number of nanoseconds.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const DurationFromNanos: Schema<Duration.Duration, bigint> = transformOrFail(
  bigintFromSelf,
  DurationFromSelf,
  (nanos) => ParseResult.succeed(Duration.nanos(nanos)),
  (duration, _, ast) =>
    Option.match(Duration.toNanos(duration), {
      onNone: () => ParseResult.fail(ParseResult.type(ast, duration)),
      onSome: (val) => ParseResult.succeed(val)
    })
).pipe(identifier("DurationFromNanos"))

/**
 * A schema that transforms a `number` tuple into a `Duration`.
 * Treats the value as the number of milliseconds.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const DurationFromMillis: Schema<Duration.Duration, number> = transform(
  number,
  DurationFromSelf,
  (ms) => Duration.millis(ms),
  (n) => Duration.toMillis(n)
).pipe(identifier("DurationFromMillis"))

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

const _Duration: Schema<Duration.Duration, readonly [seconds: number, nanos: number]> = transform(
  hrTime,
  DurationFromSelf,
  ([seconds, nanos]) => Duration.nanos(BigInt(seconds) * BigInt(1e9) + BigInt(nanos)),
  (duration) => Duration.toHrTime(duration)
).pipe(identifier("Duration"))

export {
  /**
   * A schema that transforms a `[number, number]` tuple into a `Duration`.
   *
   * @category Duration transformations
   * @since 1.0.0
   */
  _Duration as Duration
}

/**
 * Clamps a `Duration` between a minimum and a maximum value.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const clampDuration =
  (minimum: Duration.DurationInput, maximum: Duration.DurationInput) =>
  <R, I, A extends Duration.Duration>(self: Schema<A, I, R>): Schema<A, I, R> =>
    transform(
      self,
      self.pipe(to, betweenDuration(minimum, maximum)),
      (self) => Duration.clamp(self, { minimum, maximum }),
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
export const lessThanDuration = <A extends Duration.Duration>(
  max: Duration.DurationInput,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => Duration.lessThan(a, max), {
      typeId: { id: LessThanDurationTypeId, annotation: { max } },
      description: `a Duration less than ${Duration.decode(max)}`,
      ...options
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
export const lessThanOrEqualToDuration = <A extends Duration.Duration>(
  max: Duration.DurationInput,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => Duration.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanDurationTypeId, annotation: { max } },
      description: `a Duration less than or equal to ${Duration.decode(max)}`,
      ...options
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
export const greaterThanDuration = <A extends Duration.Duration>(
  min: Duration.DurationInput,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => Duration.greaterThan(a, min), {
      typeId: { id: GreaterThanDurationTypeId, annotation: { min } },
      description: `a Duration greater than ${Duration.decode(min)}`,
      ...options
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
export const greaterThanOrEqualToDuration = <A extends Duration.Duration>(
  min: Duration.DurationInput,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => Duration.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToDurationTypeId, annotation: { min } },
      description: `a Duration greater than or equal to ${Duration.decode(min)}`,
      ...options
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
export const betweenDuration = <A extends Duration.Duration>(
  minimum: Duration.DurationInput,
  maximum: Duration.DurationInput,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => Duration.between(a, { minimum, maximum }), {
      typeId: { id: BetweenDurationTypeId, annotation: { maximum, minimum } },
      description: `a Duration between ${Duration.decode(minimum)} and ${Duration.decode(maximum)}`,
      ...options
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
    equivalence: (): Equivalence.Equivalence<Uint8Array> => ReadonlyArray.getEquivalence(Equivalence.strict()) as any
  }
)

const _Uint8Array: Schema<Uint8Array, ReadonlyArray<number>> = transform(
  array(number.pipe(
    between(0, 255, {
      title: "8-bit unsigned integer",
      description: "a 8-bit unsigned integer"
    })
  )).pipe(description("an array of 8-bit unsigned integers")),
  Uint8ArrayFromSelf,
  (a) => Uint8Array.from(a),
  (arr) => Array.from(arr)
).pipe(identifier("Uint8Array"))

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
  decode: (s: string) => Either.Either<Encoding.DecodeException, Uint8Array>,
  encode: (u: Uint8Array) => string
): Schema<Uint8Array, string> =>
  transformOrFail(
    string,
    Uint8ArrayFromSelf,
    (s, _, ast) =>
      Either.mapLeft(
        decode(s),
        (decodeException) => ParseResult.type(ast, s, decodeException.message)
      ),
    (u) => ParseResult.succeed(encode(u)),
    { strict: false }
  ).pipe(identifier(id))

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
export const MinItemsTypeId: unique symbol = filters.MinItemsTypeId

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
  options?: FilterAnnotations<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): Schema<ReadonlyArray<A>, I, R> =>
  self.pipe(
    filter((a): a is ReadonlyArray<A> => a.length >= n, {
      typeId: MinItemsTypeId,
      description: `an array of at least ${n} items`,
      jsonSchema: { minItems: n },
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const MaxItemsTypeId: unique symbol = filters.MaxItemsTypeId

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
  options?: FilterAnnotations<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): Schema<ReadonlyArray<A>, I, R> =>
  self.pipe(
    filter((a): a is ReadonlyArray<A> => a.length <= n, {
      typeId: MaxItemsTypeId,
      description: `an array of at most ${n} items`,
      jsonSchema: { maxItems: n },
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const ItemsCountTypeId: unique symbol = filters.ItemsCountTypeId

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
  options?: FilterAnnotations<ReadonlyArray<A>>
) =>
<I, R>(self: Schema<ReadonlyArray<A>, I, R>): Schema<ReadonlyArray<A>, I, R> =>
  self.pipe(
    filter((a): a is ReadonlyArray<A> => a.length === n, {
      typeId: ItemsCountTypeId,
      description: `an array of exactly ${n} items`,
      jsonSchema: { minItems: n, maxItems: n },
      ...options
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
    optionFromSelf(getNumberIndexedAccess(to(self))),
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
      getNumberIndexedAccess(to(self)),
      (as, _, ast) =>
        as.length > 0
          ? ParseResult.succeed(as[0])
          : fallback
          ? ParseResult.succeed(fallback())
          : ParseResult.fail(ParseResult.type(ast, as)),
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
export const validDate = (options?: FilterAnnotations<Date>) => <I, R>(self: Schema<Date, I, R>): Schema<Date, I, R> =>
  self.pipe(
    filter((a) => !Number.isNaN(a.getTime()), {
      typeId: ValidDateTypeId,
      description: "a valid Date",
      ...options
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
).pipe(identifier("DateFromString"))

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
export type OptionFrom<I> =
  | {
    readonly _tag: "None"
  }
  | {
    readonly _tag: "Some"
    readonly value: I
  }

const OptionNoneFrom = struct({
  _tag: literal("None")
})

const optionSomeFrom = <A, I, R>(value: Schema<A, I, R>) =>
  struct({
    _tag: literal("Some"),
    value
  })

const optionFrom = <A, I, R>(value: Schema<A, I, R>): Schema<OptionFrom<A>, OptionFrom<I>, R> =>
  union(
    OptionNoneFrom,
    optionSomeFrom(value)
  )

const optionDecode = <A>(input: OptionFrom<A>): Option.Option<A> =>
  input._tag === "None" ? Option.none() : Option.some(input.value)

const optionArbitrary = <A>(value: Arbitrary<A>): Arbitrary<Option.Option<A>> => {
  const arb = arbitrary.make(optionFrom(schemaFromArbitrary(value)))
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
      : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromSelf = <A, I, R>(
  value: Schema<A, I, R>
): Schema<Option.Option<A>, Option.Option<I>, R> => {
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

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const option = <A, I, R>(
  value: Schema<A, I, R>
): Schema<Option.Option<A>, OptionFrom<I>, R> =>
  transform(
    optionFrom(value),
    optionFromSelf(to(value)),
    optionDecode,
    Option.match({
      onNone: () => ({ _tag: "None" }) as const,
      onSome: (value) => ({ _tag: "Some", value }) as const
    })
  )

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromNullable = <A, I, R>(
  value: Schema<A, I, R>
): Schema<Option.Option<A>, I | null, R> =>
  transform(nullable(value), optionFromSelf(to(value)), Option.fromNullable, Option.getOrNull)

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromNullish = <A, I, R>(
  value: Schema<A, I, R>,
  onNoneEncoding: null | undefined
): Schema<Option.Option<A>, I | null | undefined, R> =>
  transform(
    nullish(value),
    optionFromSelf(to(value)),
    Option.fromNullable,
    onNoneEncoding === null ? Option.getOrNull : Option.getOrUndefined
  )

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromOrUndefined = <A, I, R>(
  value: Schema<A, I, R>
): Schema<Option.Option<A>, I | undefined, R> =>
  transform(orUndefined(value), optionFromSelf(to(value)), Option.fromNullable, Option.getOrUndefined)

/**
 * @category Either utils
 * @since 1.0.0
 */
export type RightFrom<IA> = {
  readonly _tag: "Right"
  readonly right: IA
}

/**
 * @category Either utils
 * @since 1.0.0
 */
export type LeftFrom<IE> = {
  readonly _tag: "Left"
  readonly left: IE
}

/**
 * @category Either utils
 * @since 1.0.0
 */
export type EitherFrom<IE, IA> = LeftFrom<IE> | RightFrom<IA>

const rightFrom = <A, IA, R>(right: Schema<A, IA, R>): Schema<RightFrom<A>, RightFrom<IA>, R> =>
  struct({
    _tag: literal("Right"),
    right
  }).pipe(description(`RightFrom<${format(right)}>`))

const leftFrom = <E, IE, R>(left: Schema<E, IE, R>): Schema<LeftFrom<E>, LeftFrom<IE>, R> =>
  struct({
    _tag: literal("Left"),
    left
  }).pipe(description(`LeftFrom<${format(left)}>`))

const eitherFrom = <E, IE, R1, A, IA, R2>(
  left: Schema<E, IE, R1>,
  right: Schema<A, IA, R2>
): Schema<EitherFrom<E, A>, EitherFrom<IE, IA>, R1 | R2> =>
  union(rightFrom(right), leftFrom(left)).pipe(
    description(`EitherFrom<${format(left)}, ${format(right)}>`)
  )

const eitherDecode = <E, A>(input: EitherFrom<E, A>): Either.Either<E, A> =>
  input._tag === "Left" ? Either.left(input.left) : Either.right(input.right)

const eitherArbitrary = <E, A>(
  left: Arbitrary<E>,
  right: Arbitrary<A>
): Arbitrary<Either.Either<E, A>> => {
  const arb = arbitrary.make(eitherFrom(schemaFromArbitrary(left), schemaFromArbitrary(right)))
  return (fc) => arb(fc).map(eitherDecode)
}

const eitherPretty = <E, A>(
  left: Pretty.Pretty<E>,
  right: Pretty.Pretty<A>
): Pretty.Pretty<Either.Either<E, A>> =>
  Either.match({
    onLeft: (e) => `left(${left(e)})`,
    onRight: (a) => `right(${right(a)})`
  })

const eitherParse = <RE, E, RA, A>(
  decodeUnknownLeft: ParseResult.DecodeUnknown<E, RE>,
  parseright: ParseResult.DecodeUnknown<A, RA>
): ParseResult.DeclarationDecodeUnknown<Either.Either<E, A>, RE | RA> =>
(u, options, ast) =>
  Either.isEither(u) ?
    Either.match(u, {
      onLeft: (left) => ParseResult.map(decodeUnknownLeft(left, options), Either.left),
      onRight: (right) => ParseResult.map(parseright(right, options), Either.right)
    })
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category Either transformations
 * @since 1.0.0
 */
export const eitherFromSelf = <E, IE, RE, A, IA, RA>({ left, right }: {
  readonly left: Schema<E, IE, RE>
  readonly right: Schema<A, IA, RA>
}): Schema<Either.Either<E, A>, Either.Either<IE, IA>, RE | RA> => {
  return declare(
    [left, right],
    (left, right) => eitherParse(ParseResult.decodeUnknown(left), ParseResult.decodeUnknown(right)),
    (left, right) => eitherParse(ParseResult.encodeUnknown(left), ParseResult.encodeUnknown(right)),
    {
      description: `Either<${format(left)}, ${format(right)}>`,
      pretty: eitherPretty,
      arbitrary: eitherArbitrary,
      equivalence: Either.getEquivalence
    }
  )
}

const makeLeftFrom = <E>(left: E) => ({ _tag: "Left", left }) as const
const makeRightFrom = <A>(right: A) => ({ _tag: "Right", right }) as const

/**
 * @category Either transformations
 * @since 1.0.0
 */
export const either = <E, IE, R1, A, IA, R2>({ left, right }: {
  readonly left: Schema<E, IE, R1>
  readonly right: Schema<A, IA, R2>
}): Schema<Either.Either<E, A>, EitherFrom<IE, IA>, R1 | R2> =>
  transform(
    eitherFrom(left, right),
    eitherFromSelf({ left: to(left), right: to(right) }),
    eitherDecode,
    Either.match({ onLeft: makeLeftFrom, onRight: makeRightFrom })
  )

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
export const eitherFromUnion = <EA, EI, R1, AA, AI, R2>({ left, right }: {
  readonly left: Schema<EA, EI, R1>
  readonly right: Schema<AA, AI, R2>
}): Schema<Either.Either<EA, AA>, EI | AI, R1 | R2> => {
  const toleft = to(left)
  const toright = to(right)
  const fromLeft = transform(left, leftFrom(toleft), makeLeftFrom, (l) => l.left)
  const fromRight = transform(right, rightFrom(toright), makeRightFrom, (r) => r.right)
  return transform(
    union(fromRight, fromLeft),
    eitherFromSelf({ left: toleft, right: toright }),
    (from) => from._tag === "Left" ? Either.left(from.left) : Either.right(from.right),
    Either.match({ onLeft: makeLeftFrom, onRight: makeRightFrom })
  )
}

const isMap = (u: unknown): u is Map<unknown, unknown> => u instanceof Map

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
  isMap(u) ?
    ParseResult.map(decodeUnknown(Array.from(u.entries()), options), (as): ReadonlyMap<K, V> => new Map(as))
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category ReadonlyMap transformations
 * @since 1.0.0
 */
export const readonlyMapFromSelf = <K, IK, RK, V, IV, RV>({ key, value }: {
  readonly key: Schema<K, IK, RK>
  readonly value: Schema<V, IV, RV>
}): Schema<ReadonlyMap<K, V>, ReadonlyMap<IK, IV>, RK | RV> => {
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
 * @category ReadonlyMap transformations
 * @since 1.0.0
 */
export const readonlyMap = <K, IK, RK, V, IV, RV>({ key, value }: {
  readonly key: Schema<K, IK, RK>
  readonly value: Schema<V, IV, RV>
}): Schema<ReadonlyMap<K, V>, ReadonlyArray<readonly [IK, IV]>, RK | RV> =>
  transform(
    array(tuple(key, value)),
    readonlyMapFromSelf({ key: to(key), value: to(value) }),
    (as) => new Map(as),
    (map) => Array.from(map.entries())
  )

const isSet = (u: unknown): u is Set<unknown> => u instanceof Set

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
  isSet(u) ?
    ParseResult.map(decodeUnknown(Array.from(u.values()), options), (as): ReadonlySet<A> => new Set(as))
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category ReadonlySet transformations
 * @since 1.0.0
 */
export const readonlySetFromSelf = <A, I, R>(
  item: Schema<A, I, R>
): Schema<ReadonlySet<A>, ReadonlySet<I>, R> => {
  return declare(
    [item],
    (item) => readonlySetParse(ParseResult.decodeUnknown(array(item))),
    (item) => readonlySetParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `ReadonlySet<${format(item)}>`,
      pretty: readonlySetPretty,
      arbitrary: readonlySetArbitrary,
      equivalence: readonlySetEquivalence
    }
  )
}

/**
 * @category ReadonlySet transformations
 * @since 1.0.0
 */
export const readonlySet = <A, I, R>(item: Schema<A, I, R>): Schema<ReadonlySet<A>, ReadonlyArray<I>, R> =>
  transform(
    array(item),
    readonlySetFromSelf(to(item)),
    (as) => new Set(as),
    (set) => Array.from(set)
  )

const bigDecimalPretty = (): Pretty.Pretty<BigDecimal.BigDecimal> => (val) =>
  `BigDecimal(${BigDecimal.format(BigDecimal.normalize(val))})`

const bigDecimalArbitrary = (): Arbitrary<BigDecimal.BigDecimal> => (fc) =>
  fc.tuple(fc.bigInt(), fc.integer()).map(([value, scale]) => BigDecimal.make(value, scale))

/**
 * @category BigDecimal constructors
 * @since 1.0.0
 */
export const BigDecimalFromSelf: Schema<BigDecimal.BigDecimal> = declare(
  BigDecimal.isBigDecimal,
  {
    identifier: "BigDecimalFromSelf",
    pretty: bigDecimalPretty,
    arbitrary: bigDecimalArbitrary,
    equivalence: () => BigDecimal.Equivalence
  }
)

const _BigDecimal: Schema<BigDecimal.BigDecimal, string> = transformOrFail(
  string,
  BigDecimalFromSelf,
  (num, _, ast) =>
    BigDecimal.fromString(num).pipe(Option.match({
      onNone: () => ParseResult.fail(ParseResult.type(ast, num)),
      onSome: (val) => ParseResult.succeed(BigDecimal.normalize(val))
    })),
  (val) => ParseResult.succeed(BigDecimal.format(BigDecimal.normalize(val)))
).pipe(identifier("BigDecimal"))

export {
  /**
   * @category BigDecimal transformations
   * @since 1.0.0
   */
  _BigDecimal as BigDecimal
}

/**
 * A schema that transforms a `number` into a `BigDecimal`.
 * When encoding, this Schema will produce incorrect results if the BigDecimal exceeds the 64-bit range of a number.
 *
 * @category BigDecimal transformations
 * @since 1.0.0
 */
export const BigDecimalFromNumber: Schema<BigDecimal.BigDecimal, number> = transformOrFail(
  number,
  BigDecimalFromSelf,
  (num) => ParseResult.succeed(BigDecimal.fromNumber(num)),
  (val) => ParseResult.succeed(BigDecimal.unsafeToNumber(val))
).pipe(identifier("BigDecimalFromNumber"))

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanBigDecimalTypeId = Symbol.for("@effect/schema/TypeId/GreaterThanBigDecimal")

/**
 * @category BigDecimal filters
 * @since 1.0.0
 */
export const greaterThanBigDecimal = <A extends BigDecimal.BigDecimal>(
  min: BigDecimal.BigDecimal,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => BigDecimal.greaterThan(a, min), {
      typeId: { id: GreaterThanBigDecimalTypeId, annotation: { min } },
      description: `a BigDecimal greater than ${BigDecimal.format(min)}`,
      ...options
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
export const greaterThanOrEqualToBigDecimal = <A extends BigDecimal.BigDecimal>(
  min: BigDecimal.BigDecimal,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => BigDecimal.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToBigDecimalTypeId, annotation: { min } },
      description: `a BigDecimal greater than or equal to ${BigDecimal.format(min)}`,
      ...options
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
export const lessThanBigDecimal = <A extends BigDecimal.BigDecimal>(
  max: BigDecimal.BigDecimal,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => BigDecimal.lessThan(a, max), {
      typeId: { id: LessThanBigDecimalTypeId, annotation: { max } },
      description: `a BigDecimal less than ${BigDecimal.format(max)}`,
      ...options
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
export const lessThanOrEqualToBigDecimal = <A extends BigDecimal.BigDecimal>(
  max: BigDecimal.BigDecimal,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => BigDecimal.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanOrEqualToBigDecimalTypeId, annotation: { max } },
      description: `a BigDecimal less than or equal to ${BigDecimal.format(max)}`,
      ...options
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
export const positiveBigDecimal = <A extends BigDecimal.BigDecimal>(
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => BigDecimal.isPositive(a), {
      typeId: { id: PositiveBigDecimalTypeId, annotation: {} },
      description: `a positive BigDecimal`,
      ...options
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
export const nonNegativeBigDecimal = <A extends BigDecimal.BigDecimal>(
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a.value >= 0n, {
      typeId: { id: NonNegativeBigDecimalTypeId, annotation: {} },
      description: `a non-negative BigDecimal`,
      ...options
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
export const negativeBigDecimal = <A extends BigDecimal.BigDecimal>(
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => BigDecimal.isNegative(a), {
      typeId: { id: NegativeBigDecimalTypeId, annotation: {} },
      description: `a negative BigDecimal`,
      ...options
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
export const nonPositiveBigDecimal = <A extends BigDecimal.BigDecimal>(
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => a.value <= 0n, {
      typeId: { id: NonPositiveBigDecimalTypeId, annotation: {} },
      description: `a non-positive BigDecimal`,
      ...options
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
export const betweenBigDecimal = <A extends BigDecimal.BigDecimal>(
  minimum: BigDecimal.BigDecimal,
  maximum: BigDecimal.BigDecimal,
  options?: FilterAnnotations<A>
) =>
<I, R>(self: Schema<A, I, R>): Schema<A, I, R> =>
  self.pipe(
    filter((a): a is A => BigDecimal.between(a, { minimum, maximum }), {
      typeId: { id: BetweenBigDecimalTypeId, annotation: { maximum, minimum } },
      description: `a BigDecimal between ${BigDecimal.format(minimum)} and ${BigDecimal.format(maximum)}`,
      ...options
    })
  )

/**
 * Clamps a `BigDecimal` between a minimum and a maximum value.
 *
 * @category BigDecimal transformations
 * @since 1.0.0
 */
export const clampBigDecimal =
  (minimum: BigDecimal.BigDecimal, maximum: BigDecimal.BigDecimal) =>
  <R, I, A extends BigDecimal.BigDecimal>(self: Schema<A, I, R>): Schema<A, I, R> =>
    transform(
      self,
      self.pipe(to, betweenBigDecimal(minimum, maximum)),
      (self) => BigDecimal.clamp(self, { minimum, maximum }),
      identity,
      { strict: false }
    )

/**
 * Negates a `BigDecimal`.
 *
 * @category BigDecimal transformations
 * @since 1.0.0
 */
export const negateBigDecimal = <R, I, A extends BigDecimal.BigDecimal>(
  self: Schema<A, I, R>
): Schema<A, I, R> =>
  transform(
    self,
    to(self),
    (self) => BigDecimal.negate(self),
    (self) => BigDecimal.negate(self),
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
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category Chunk transformations
 * @since 1.0.0
 */
export const chunkFromSelf = <A, I, R>(item: Schema<A, I, R>): Schema<Chunk.Chunk<A>, Chunk.Chunk<I>, R> => {
  return declare(
    [item],
    (item) => chunkParse(ParseResult.decodeUnknown(array(item))),
    (item) => chunkParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `Chunk<${format(item)}>`,
      pretty: chunkPretty,
      arbitrary: chunkArbitrary,
      equivalence: Chunk.getEquivalence
    }
  )
}

/**
 * @category Chunk transformations
 * @since 1.0.0
 */
export const chunk = <A, I, R>(item: Schema<A, I, R>): Schema<Chunk.Chunk<A>, ReadonlyArray<I>, R> =>
  transform(
    array(item),
    chunkFromSelf(to(item)),
    (as) => as.length === 0 ? Chunk.empty() : Chunk.fromIterable(as),
    Chunk.toReadonlyArray
  )

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
    : ParseResult.fail(ParseResult.type(ast, u))

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
      arbitrary: dataArbitrary,
      equivalence: () => Equal.equals
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
    dataFromSelf(to(item)),
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
export interface Class<A, I, R, C, Self, Inherited = {}, Proto = {}> extends Schema<Self, I, R> {
  new(
    ...args: [R] extends [never] ? [
        props: Equals<C, {}> extends true ? void | {} : C,
        disableValidation?: boolean | undefined
      ] :
      [
        props: Equals<C, {}> extends true ? void | {} : C,
        disableValidation: true
      ]
  ): A & Omit<Inherited, keyof A> & Proto

  readonly struct: Schema<A, I, R>

  readonly extend: <Extended>() => <FieldsB extends StructFields>(
    fields: FieldsB
  ) => [unknown] extends [Extended] ? MissingSelfGeneric<"Base.extend">
    : Class<
      Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      Simplify<Omit<I, keyof FieldsB> & FromStruct<FieldsB>>,
      R | Schema.Context<FieldsB[keyof FieldsB]>,
      Simplify<Omit<C, keyof FieldsB> & ToStruct<FieldsB>>,
      Extended,
      Self,
      Proto
    >

  readonly transformOrFail: <Transformed>() => <
    FieldsB extends StructFields,
    R2,
    R3
  >(
    fields: FieldsB,
    decode: (
      input: A,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<Omit<A, keyof FieldsB> & ToStruct<FieldsB>, ParseResult.ParseIssue, R2>,
    encode: (
      input: Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<A, ParseResult.ParseIssue, R3>
  ) => [unknown] extends [Transformed] ? MissingSelfGeneric<"Base.transform">
    : Class<
      Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      I,
      R | Schema.Context<FieldsB[keyof FieldsB]> | R2 | R3,
      Simplify<Omit<C, keyof FieldsB> & ToStruct<FieldsB>>,
      Transformed,
      Self,
      Proto
    >

  readonly transformOrFailFrom: <Transformed>() => <
    FieldsB extends StructFields,
    R2,
    R3
  >(
    fields: FieldsB,
    decode: (
      input: I,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<Omit<I, keyof FieldsB> & FromStruct<FieldsB>, ParseResult.ParseIssue, R2>,
    encode: (
      input: Simplify<Omit<I, keyof FieldsB> & FromStruct<FieldsB>>,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<I, ParseResult.ParseIssue, R3>
  ) => [unknown] extends [Transformed] ? MissingSelfGeneric<"Base.transformFrom">
    : Class<
      Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      I,
      R | Schema.Context<FieldsB[keyof FieldsB]> | R2 | R3,
      Simplify<Omit<C, keyof FieldsB> & ToStruct<FieldsB>>,
      Transformed,
      Self,
      Proto
    >
}

/**
 * @category classes
 * @since 1.0.0
 */
export const Class = <Self>() =>
<Fields extends StructFields>(
  fields: Fields
): [unknown] extends [Self] ? MissingSelfGeneric<"Class">
  : Class<
    Simplify<ToStruct<Fields>>,
    Simplify<FromStruct<Fields>>,
    Schema.Context<Fields[keyof Fields]>,
    Simplify<ToStruct<Fields>>,
    Self
  > => makeClass(struct(fields), fields, Data.Class)

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedClass = <Self>() =>
<Tag extends string, Fields extends StructFields>(
  tag: Tag,
  fields: Fields
): [unknown] extends [Self] ? MissingSelfGeneric<"TaggedClass", `"Tag", `>
  : Class<
    Simplify<{ readonly _tag: Tag } & ToStruct<Fields>>,
    Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
    Schema.Context<Fields[keyof Fields]>,
    Simplify<ToStruct<Fields>>,
    Self
  > =>
{
  const fieldsWithTag: StructFields = { ...fields, _tag: literal(tag) }
  return makeClass(struct(fieldsWithTag), fieldsWithTag, Data.Class, { _tag: tag })
}

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedError = <Self>() =>
<Tag extends string, Fields extends StructFields>(
  tag: Tag,
  fields: Fields
): [unknown] extends [Self] ? MissingSelfGeneric<"TaggedError", `"Tag", `>
  : Class<
    Simplify<{ readonly _tag: Tag } & ToStruct<Fields>>,
    Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
    Schema.Context<Fields[keyof Fields]>,
    Simplify<ToStruct<Fields>>,
    Self,
    {},
    Cause.YieldableError
  > =>
{
  const fieldsWithTag: StructFields = { ...fields, _tag: literal(tag) }
  return makeClass(
    struct(fieldsWithTag),
    fieldsWithTag,
    Data.Error,
    { _tag: tag }
  )
}

/**
 * @category classes
 * @since 1.0.0
 */
export interface TaggedRequest<Tag extends string, R, IS, S, RR, IE, E, IA, A>
  extends Request.Request<A, E>, Serializable.SerializableWithResult<R, IS, S, RR, IE, E, IA, A>
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
    | TaggedRequest<string, any, any, any, any, never, never, any, any>
}

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedRequest = <Self>() =>
<Tag extends string, Fields extends StructFields, EA, EI, ER, AA, AI, AR>(
  tag: Tag,
  Failure: Schema<EA, EI, ER>,
  Success: Schema<AA, AI, AR>,
  fields: Fields
): [unknown] extends [Self] ? MissingSelfGeneric<"TaggedRequest", `"Tag", SuccessSchema, FailureSchema, `>
  : Class<
    Simplify<{ readonly _tag: Tag } & ToStruct<Fields>>,
    Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
    Schema.Context<Fields[keyof Fields]>,
    Simplify<ToStruct<Fields>>,
    Self,
    TaggedRequest<
      Tag,
      Schema.Context<Fields[keyof Fields]>,
      Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
      Self,
      ER | AR,
      EI,
      EA,
      AI,
      AA
    >
  > =>
{
  class SerializableRequest extends Request.Class<any, any, { readonly _tag: string }> {
    get [InternalSerializable.symbol]() {
      return this.constructor
    }
    get [InternalSerializable.symbolResult]() {
      return { Failure, Success }
    }
  }
  const fieldsWithTag: StructFields = { ...fields, _tag: literal(tag) }
  return makeClass(
    struct(fieldsWithTag),
    fieldsWithTag,
    SerializableRequest,
    { _tag: tag }
  )
}

const makeClass = <A, I, R>(
  selfSchema: Schema<A, I, R>,
  selfFields: StructFields,
  Base: any,
  additionalProps?: any
): any => {
  const validator = Parser.validateSync(selfSchema as any)

  return class extends Base {
    constructor(props?: any, disableValidation = false) {
      if (additionalProps !== undefined) {
        props = { ...additionalProps, ...props }
      }
      if (disableValidation !== true) {
        props = validator(props)
      }
      super(props, true)
    }

    static [TypeId] = InternalSchema.variance

    toString() {
      return Pretty.make(this.constructor as any)(this)
    }

    static pipe() {
      return pipeArguments(this, arguments)
    }

    static get ast() {
      const toSchema = to(selfSchema)
      const pretty = Pretty.make(toSchema)
      const arb = arbitrary.make(toSchema)
      const declaration: Schema<any, any, never> = declare(
        (input): input is any => input instanceof this,
        {
          identifier: this.name,
          title: this.name,
          description: `an instance of ${this.name}`,
          pretty: () => (self: any) => `${self.constructor.name}(${pretty(self)})`,
          arbitrary: () => (fc: any) => arb(fc).map((props: any) => new this(props))
        }
      )
      const transformation = transform(
        selfSchema,
        declaration,
        (input) => new this(input, true),
        identity
      )
      return transformation.ast
    }

    static struct = selfSchema

    static extend() {
      return (fields: StructFields) => {
        const newFields: StructFields = { ...selfFields, ...fields }
        return makeClass(
          struct(newFields),
          newFields,
          this,
          additionalProps
        )
      }
    }

    static transformOrFail() {
      return (fields: any, decode: any, encode: any) => {
        const newFields = { ...selfFields, ...fields }
        return makeClass(
          transformOrFail(
            selfSchema,
            to(struct(newFields)),
            decode,
            encode
          ),
          newFields,
          this,
          additionalProps
        )
      }
    }

    static transformOrFailFrom() {
      return (fields: StructFields, decode: any, encode: any) => {
        const newFields: StructFields = { ...selfFields, ...fields }
        return makeClass(
          transformOrFail(
            from(selfSchema),
            struct(newFields),
            decode,
            encode
          ),
          newFields,
          this,
          additionalProps
        )
      }
    }
  }
}

/**
 * @category FiberId
 * @since 1.0.0
 */
export type FiberIdFrom =
  | {
    readonly _tag: "Composite"
    readonly left: FiberIdFrom
    readonly right: FiberIdFrom
  }
  | {
    readonly _tag: "None"
  }
  | {
    readonly _tag: "Runtime"
    readonly id: number
    readonly startTimeMillis: number
  }

const FiberIdCompositeFrom = struct({
  _tag: literal("Composite"),
  left: suspend(() => FiberIdFrom),
  right: suspend(() => FiberIdFrom)
}).pipe(identifier("FiberIdCompositeFrom"))

const FiberIdNoneFrom = struct({
  _tag: literal("None")
}).pipe(identifier("FiberIdNoneFrom"))

const FiberIdRuntimeFrom = struct({
  _tag: literal("Runtime"),
  id: Int.pipe(nonNegative({
    title: "id",
    description: "id"
  })),
  startTimeMillis: Int.pipe(nonNegative({
    title: "startTimeMillis",
    description: "startTimeMillis"
  }))
}).pipe(identifier("FiberIdRuntimeFrom"))

const FiberIdFrom: Schema<FiberIdFrom> = union(
  FiberIdCompositeFrom,
  FiberIdNoneFrom,
  FiberIdRuntimeFrom
).pipe(identifier("FiberIdFrom"))

const fiberIdFromArbitrary = arbitrary.make(FiberIdFrom)

const fiberIdArbitrary: Arbitrary<FiberId.FiberId> = (fc) => fiberIdFromArbitrary(fc).map(fiberIdDecode)

const fiberIdPretty: Pretty.Pretty<FiberId.FiberId> = (fiberId) => {
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
 * @since 1.0.0
 */
export const FiberIdFromSelf: Schema<FiberId.FiberId> = declare(
  FiberId.isFiberId,
  {
    identifier: "FiberIdFromSelf",
    pretty: () => fiberIdPretty,
    arbitrary: () => fiberIdArbitrary,
    equivalence: () => Equal.equals
  }
)

const fiberIdDecode = (input: FiberIdFrom): FiberId.FiberId => {
  switch (input._tag) {
    case "Composite":
      return FiberId.composite(fiberIdDecode(input.left), fiberIdDecode(input.right))
    case "None":
      return FiberId.none
    case "Runtime":
      return FiberId.runtime(input.id, input.startTimeMillis)
  }
}

const fiberIdEncode = (input: FiberId.FiberId): FiberIdFrom => {
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

const _FiberId: Schema<FiberId.FiberId, FiberIdFrom> = transform(
  FiberIdFrom,
  FiberIdFromSelf,
  fiberIdDecode,
  fiberIdEncode
).pipe(identifier("FiberId"))

export {
  /**
   * @category FiberId transformations
   * @since 1.0.0
   */
  _FiberId as FiberId
}

/**
 * @category Cause utils
 * @since 1.0.0
 */
export type CauseFrom<E> =
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
    readonly fiberId: FiberIdFrom
  }
  | {
    readonly _tag: "Parallel"
    readonly left: CauseFrom<E>
    readonly right: CauseFrom<E>
  }
  | {
    readonly _tag: "Sequential"
    readonly left: CauseFrom<E>
    readonly right: CauseFrom<E>
  }

const causeDieFrom = <R>(defect: Schema<unknown, unknown, R>) =>
  struct({
    _tag: literal("Die"),
    defect
  })

const CauseEmptyFrom = struct({
  _tag: literal("Empty")
})

const causeFailFrom = <E, EI, R>(error: Schema<E, EI, R>) =>
  struct({
    _tag: literal("Fail"),
    error
  })

const CauseInterruptFrom = struct({
  _tag: literal("Interrupt"),
  fiberId: FiberIdFrom
})

const causeParallelFrom = <E, EI, R>(causeFrom: Schema<CauseFrom<E>, CauseFrom<EI>, R>) =>
  struct({
    _tag: literal("Parallel"),
    left: causeFrom,
    right: causeFrom
  })

const causeSequentialFrom = <E, EI, R>(causeFrom: Schema<CauseFrom<E>, CauseFrom<EI>, R>) =>
  struct({
    _tag: literal("Sequential"),
    left: causeFrom,
    right: causeFrom
  })

const causeFrom = <E, EI, R1, R2>(
  error: Schema<E, EI, R1>,
  defect: Schema<unknown, unknown, R2>
): Schema<CauseFrom<E>, CauseFrom<EI>, R1 | R2> => {
  const recur = suspend(() => out)
  const out: Schema<CauseFrom<E>, CauseFrom<EI>, R1 | R2> = union(
    causeDieFrom(defect),
    CauseEmptyFrom,
    causeFailFrom(error),
    CauseInterruptFrom,
    causeParallelFrom(recur),
    causeSequentialFrom(recur)
  ).pipe(description(`CauseFrom<${format(error)}>`))
  return out
}

const causeArbitrary = <E>(
  error: Arbitrary<E>,
  defect: Arbitrary<unknown>
): Arbitrary<Cause.Cause<E>> => {
  const arb = arbitrary.make(causeFrom(schemaFromArbitrary(error), schemaFromArbitrary(defect)))
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
  decodeUnknown: ParseResult.DecodeUnknown<CauseFrom<A>, R>
): ParseResult.DeclarationDecodeUnknown<Cause.Cause<A>, R> =>
(u, options, ast) =>
  Cause.isCause(u) ?
    ParseResult.map(decodeUnknown(causeEncode(u), options), causeDecode)
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category Cause transformations
 * @since 1.0.0
 */
export const causeFromSelf = <A, I, R1, R2 = never>({ defect = unknown, error }: {
  readonly error: Schema<A, I, R1>
  readonly defect?: Schema<unknown, unknown, R2> | undefined
}): Schema<Cause.Cause<A>, Cause.Cause<I>, R1 | R2> => {
  return declare(
    [error, defect],
    (error, defect) => causeParse(ParseResult.decodeUnknown(causeFrom(error, defect))),
    (error, defect) => causeParse(ParseResult.encodeUnknown(causeFrom(error, defect))),
    {
      description: `Cause<${format(error)}>`,
      pretty: causePretty,
      arbitrary: causeArbitrary,
      equivalence: () => Equal.equals
    }
  )
}

function causeDecode<E>(cause: CauseFrom<E>): Cause.Cause<E> {
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

function causeEncode<E>(cause: Cause.Cause<E>): CauseFrom<E> {
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
 * @category Cause transformations
 * @since 1.0.0
 */
export const cause = <E, EI, R1, R2 = never>({ defect = causeDefectPretty, error }: {
  readonly error: Schema<E, EI, R1>
  readonly defect?: Schema<unknown, unknown, R2> | undefined
}): Schema<Cause.Cause<E>, CauseFrom<EI>, R1 | R2> =>
  transform(
    causeFrom(error, defect),
    causeFromSelf({ error: to(error), defect: to(defect) }),
    causeDecode,
    causeEncode
  )

/**
 * @category Exit utils
 * @since 1.0.0
 */
export type ExitFrom<A, E> =
  | {
    readonly _tag: "Failure"
    readonly cause: CauseFrom<E>
  }
  | {
    readonly _tag: "Success"
    readonly value: A
  }

const exitFailureFrom = <E, EI, R1, R2>(
  error: Schema<E, EI, R1>,
  defect: Schema<unknown, unknown, R2>
) =>
  struct({
    _tag: literal("Failure"),
    cause: causeFrom(error, defect)
  })

const exitSuccessFrom = <A, AI, R>(
  value: Schema<A, AI, R>
) =>
  struct({
    _tag: literal("Success"),
    value
  })

const exitFrom = <E, EI, R1, A, AI, R2, R3>(
  error: Schema<E, EI, R1>,
  value: Schema<A, AI, R2>,
  defect: Schema<unknown, unknown, R3>
): Schema<ExitFrom<A, E>, ExitFrom<AI, EI>, R1 | R2 | R3> =>
  union(
    exitFailureFrom(error, defect),
    exitSuccessFrom(value)
  )

const exitDecode = <A, E>(input: ExitFrom<A, E>): Exit.Exit<A, E> => {
  switch (input._tag) {
    case "Failure":
      return Exit.failCause(causeDecode(input.cause))
    case "Success":
      return Exit.succeed(input.value)
  }
}

const exitArbitrary = <E, A>(
  error: Arbitrary<E>,
  value: Arbitrary<A>,
  defect: Arbitrary<unknown>
): Arbitrary<Exit.Exit<A, E>> => {
  const arb = arbitrary.make(
    exitFrom(schemaFromArbitrary(error), schemaFromArbitrary(value), schemaFromArbitrary(defect))
  )
  return (fc) => arb(fc).map(exitDecode)
}

const exitPretty = <E, A>(error: Pretty.Pretty<E>, value: Pretty.Pretty<A>): Pretty.Pretty<Exit.Exit<A, E>> => (exit) =>
  exit._tag === "Failure"
    ? `Exit.failCause(${causePretty(error)(exit.cause)})`
    : `Exit.succeed(${value(exit.value)})`

const exitParse = <RE, E, RA, A>(
  decodeUnknownCause: ParseResult.DecodeUnknown<Cause.Cause<E>, RE>,
  decodeUnknownValue: ParseResult.DecodeUnknown<A, RA>
): ParseResult.DeclarationDecodeUnknown<Exit.Exit<A, E>, RE | RA> =>
(u, options, ast) =>
  Exit.isExit(u) ?
    Exit.match(u, {
      onFailure: (cause) => ParseResult.map(decodeUnknownCause(cause, options), Exit.failCause),
      onSuccess: (value) => ParseResult.map(decodeUnknownValue(value, options), Exit.succeed)
    })
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category Exit transformations
 * @since 1.0.0
 */
export const exitFromSelf = <E, IE, RE, A, IA, RA, RD = never>({ defect = unknown, failure, success }: {
  readonly failure: Schema<E, IE, RE>
  readonly success: Schema<A, IA, RA>
  readonly defect?: Schema<unknown, unknown, RD> | undefined
}): Schema<Exit.Exit<A, E>, Exit.Exit<IA, IE>, RE | RA | RD> =>
  declare(
    [failure, success, defect],
    (failure, success, defect) =>
      exitParse(
        ParseResult.decodeUnknown(causeFromSelf({ error: failure, defect })),
        ParseResult.decodeUnknown(success)
      ),
    (failure, success, defect) =>
      exitParse(
        ParseResult.encodeUnknown(causeFromSelf({ error: failure, defect })),
        ParseResult.encodeUnknown(success)
      ),
    {
      description: `Exit<${format(failure)}, ${format(success)}>`,
      pretty: exitPretty,
      arbitrary: exitArbitrary,
      equivalence: () => Equal.equals
    }
  )

/**
 * @category Exit transformations
 * @since 1.0.0
 */
export const exit = <E, IE, R1, A, IA, R2, R3 = never>({ defect = causeDefectPretty, failure, success }: {
  readonly failure: Schema<E, IE, R1>
  readonly success: Schema<A, IA, R2>
  readonly defect?: Schema<unknown, unknown, R3> | undefined
}): Schema<Exit.Exit<A, E>, ExitFrom<IA, IE>, R1 | R2 | R3> =>
  transform(
    exitFrom(failure, success, defect),
    exitFromSelf({ failure: to(failure), success: to(success), defect: to(defect) }),
    exitDecode,
    (exit) =>
      exit._tag === "Failure"
        ? { _tag: "Failure", cause: exit.cause } as const
        : { _tag: "Success", value: exit.value } as const
  )

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
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category HashSet transformations
 * @since 1.0.0
 */
export const hashSetFromSelf = <A, I, R>(
  item: Schema<A, I, R>
): Schema<HashSet.HashSet<A>, HashSet.HashSet<I>, R> => {
  return declare(
    [item],
    (item) => hashSetParse(ParseResult.decodeUnknown(array(item))),
    (item) => hashSetParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `HashSet<${format(item)}>`,
      pretty: hashSetPretty,
      arbitrary: hashSetArbitrary,
      equivalence: hashSetEquivalence
    }
  )
}

/**
 * @category HashSet transformations
 * @since 1.0.0
 */
export const hashSet = <A, I, R>(item: Schema<A, I, R>): Schema<HashSet.HashSet<A>, ReadonlyArray<I>, R> =>
  transform(
    array(item),
    hashSetFromSelf(to(item)),
    (as) => HashSet.fromIterable(as),
    (set) => Array.from(set)
  )

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
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category HashMap transformations
 * @since 1.0.0
 */
export const hashMapFromSelf = <K, IK, RK, V, IV, RV>({ key, value }: {
  readonly key: Schema<K, IK, RK>
  readonly value: Schema<V, IV, RV>
}): Schema<HashMap.HashMap<K, V>, HashMap.HashMap<IK, IV>, RK | RV> => {
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
 * @category HashMap transformations
 * @since 1.0.0
 */
export const hashMap = <K, IK, RK, V, IV, RV>({ key, value }: {
  readonly key: Schema<K, IK, RK>
  readonly value: Schema<V, IV, RV>
}): Schema<HashMap.HashMap<K, V>, ReadonlyArray<readonly [IK, IV]>, RK | RV> =>
  transform(
    array(tuple(key, value)),
    hashMapFromSelf({ key: to(key), value: to(value) }),
    (as) => HashMap.fromIterable(as),
    (map) => Array.from(map)
  )

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
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category List transformations
 * @since 1.0.0
 */
export const listFromSelf = <A, I, R>(
  item: Schema<A, I, R>
): Schema<List.List<A>, List.List<I>, R> => {
  return declare(
    [item],
    (item) => listParse(ParseResult.decodeUnknown(array(item))),
    (item) => listParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `List<${format(item)}>`,
      pretty: listPretty,
      arbitrary: listArbitrary,
      equivalence: listEquivalence
    }
  )
}

/**
 * @category List transformations
 * @since 1.0.0
 */
export const list = <A, I, R>(item: Schema<A, I, R>): Schema<List.List<A>, ReadonlyArray<I>, R> =>
  transform(
    array(item),
    listFromSelf(to(item)),
    (as) => List.fromIterable(as),
    (set) => Array.from(set)
  )

const schemaFromArbitrary = <A>(value: Arbitrary<A>): Schema<A> =>
  suspend<A, A, never>(() => any).pipe(annotations({
    [hooks.ArbitraryHookId]: () => value
  }))
