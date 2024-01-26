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
import * as Format from "./Format.js"
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
export interface Schema<out R, in out From, in out To = From> extends Schema.Variance<R, From, To>, Pipeable {
  readonly ast: AST.AST
}

/**
 * @since 1.0.0
 */
export const hash = <R, I, A>(schema: Schema<R, I, A>): number => AST.hash(schema.ast)

/**
 * @since 1.0.0
 */
export declare module Schema {
  /**
   * @since 1.0.0
   */
  export interface Variance<R, From, To> {
    readonly [TypeId]: {
      readonly R: Covariant<R>
      readonly From: Invariant<From>
      readonly To: Invariant<To>
    }
  }

  /**
   * @since 1.0.0
   */
  export type Context<S> = S extends Schema.Variance<infer R, any, any> ? R : never

  /**
   * @since 1.0.0
   */
  export type From<S> = S extends Schema.Variance<any, infer From, any> ? From : never

  /**
   * @since 1.0.0
   */
  export type To<S> = S extends Schema.Variance<any, any, infer To> ? To : never

  /**
   * @since 1.0.0
   */
  export type ToAsserts<S extends Schema<never, any>> = (
    input: unknown,
    options?: AST.ParseOptions
  ) => asserts input is Schema.To<S>
}

/**
 * @since 1.0.0
 */
export const from = <R, I, A>(schema: Schema<R, I, A>): Schema<never, I> => make(AST.from(schema.ast))

/**
 * @since 1.0.0
 */
export const to = <R, I, A>(schema: Schema<R, I, A>): Schema<never, A> => make(AST.to(schema.ast))

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
export const encodeUnknown = <R, I, A>(
  schema: Schema<R, I, A>,
  options?: ParseOptions
) => {
  const encodeUnknown = Parser.encodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Effect.Effect<R, ParseResult.ParseError, I> =>
    ParseResult.mapError(encodeUnknown(u, overrideOptions), ParseResult.parseError)
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknownEither = <I, A>(
  schema: Schema<never, I, A>,
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
export const encodeUnknownPromise = <I, A>(
  schema: Schema<never, I, A>,
  options?: ParseOptions
) => {
  const parser = encodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Promise<I> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const encode: <R, I, A>(
  schema: Schema<R, I, A>,
  options?: ParseOptions
) => (a: A, overrideOptions?: ParseOptions) => Effect.Effect<R, ParseResult.ParseError, I> = encodeUnknown

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeEither: <I, A>(
  schema: Schema<never, I, A>,
  options?: ParseOptions
) => (a: A, overrideOptions?: ParseOptions) => Either.Either<ParseResult.ParseError, I> = encodeUnknownEither

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodePromise: <I, A>(
  schema: Schema<never, I, A>,
  options?: ParseOptions
) => (a: A, overrideOptions?: ParseOptions) => Promise<I> = encodeUnknownPromise

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknown = <R, I, A>(
  schema: Schema<R, I, A>,
  options?: ParseOptions
) => {
  const decodeUnknown = ParseResult.decodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Effect.Effect<R, ParseResult.ParseError, A> =>
    ParseResult.mapError(decodeUnknown(u, overrideOptions), ParseResult.parseError)
}

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknownEither = <I, A>(
  schema: Schema<never, I, A>,
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
export const decodeUnknownPromise = <I, A>(
  schema: Schema<never, I, A>,
  options?: ParseOptions
) => {
  const parser = decodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Promise<A> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category decoding
 * @since 1.0.0
 */
export const decode: <R, I, A>(
  schema: Schema<R, I, A>,
  options?: ParseOptions
) => (i: I, overrideOptions?: ParseOptions) => Effect.Effect<R, ParseResult.ParseError, A> = decodeUnknown

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeEither: <I, A>(
  schema: Schema<never, I, A>,
  options?: ParseOptions
) => (i: I, overrideOptions?: ParseOptions) => Either.Either<ParseResult.ParseError, A> = decodeUnknownEither

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodePromise: <I, A>(
  schema: Schema<never, I, A>,
  options?: ParseOptions
) => (i: I, overrideOptions?: ParseOptions) => Promise<A> = decodeUnknownPromise

/**
 * @category validation
 * @since 1.0.0
 */
export const validate = <R, I, A>(
  schema: Schema<R, I, A>,
  options?: ParseOptions
) => {
  const validate = Parser.validate(schema, options)
  return (u: unknown, overrideOptions?: ParseOptions): Effect.Effect<R, ParseResult.ParseError, A> =>
    ParseResult.mapError(validate(u, overrideOptions), ParseResult.parseError)
}

/**
 * @category validation
 * @since 1.0.0
 */
export const validateEither = <I, A>(
  schema: Schema<never, I, A>,
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
export const validatePromise = <I, A>(
  schema: Schema<never, I, A>,
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
export const isSchema = (u: unknown): u is Schema<unknown, unknown> =>
  Predicate.isObject(u) && TypeId in u && "ast" in u

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <R, I, A>(ast: AST.AST) => Schema<R, I, A> = InternalSchema.make

const makeLiteral = <Literal extends AST.LiteralValue>(value: Literal): Schema<never, Literal> =>
  make(AST.createLiteral(value))

/**
 * @category constructors
 * @since 1.0.0
 */
export const literal = <Literals extends ReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
): Schema<never, Literals[number]> => union(...literals.map((literal) => makeLiteral(literal)))

/**
 * @category constructors
 * @since 1.0.0
 */
export const uniqueSymbol = <S extends symbol>(
  symbol: S,
  annotations?: AST.Annotations
): Schema<never, S> => make(AST.createUniqueSymbol(symbol, annotations))

/**
 * @category constructors
 * @since 1.0.0
 */
export const enums = <A extends { [x: string]: string | number }>(
  enums: A
): Schema<never, A[keyof A]> =>
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
export const templateLiteral = <T extends [Schema<never, any>, ...Array<Schema<never, any>>]>(
  ...[head, ...tail]: T
): Schema<never, Join<{ [K in keyof T]: Schema.To<T[K]> }>> => {
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
      throw new Error(`templateLiteral: unsupported template literal span ${ast._tag}`)
  }
}

const declareConstructor = <const P extends ReadonlyArray<Schema<any, any>>, R extends Schema.Context<P[number]>, I, A>(
  typeParameters: P,
  decodeUnknown: (
    ...typeParameters: P
  ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<R, ParseResult.ParseIssue, A>,
  encodeUnknown: (
    ...typeParameters: P
  ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<R, ParseResult.ParseIssue, I>,
  annotations?: DeclareAnnotations<P, A>
): Schema<Schema.Context<P[number]>, I, A> =>
  make(AST.createDeclaration(
    typeParameters.map((tp) => tp.ast),
    (...typeParameters) => decodeUnknown(...typeParameters.map((ast) => make(ast)) as any),
    (...typeParameters) => encodeUnknown(...typeParameters.map((ast) => make(ast)) as any),
    toAnnotations(annotations)
  ))

const declarePrimitive = <A>(
  is: (input: unknown) => input is A,
  annotations?: DeclareAnnotations<[], A>
): Schema<never, A> => {
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
  ): Schema<never, A>
  <const P extends ReadonlyArray<Schema<any, any>>, R extends Schema.Context<P[number]>, I, A>(
    typeParameters: P,
    decodeUnknown: (
      ...typeParameters: P
    ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<R, ParseResult.ParseIssue, A>,
    encodeUnknown: (
      ...typeParameters: P
    ) => (input: unknown, options: ParseOptions, ast: AST.Declaration) => Effect.Effect<R, ParseResult.ParseIssue, I>,
    annotations?: DeclareAnnotations<{ readonly [K in keyof P]: Schema.To<P[K]> }, A>
  ): Schema<Schema.Context<P[number]>, I, A>
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
<R, I, A extends Brand.Brand.Unbranded<C>>(self: Schema<R, I, A>): Schema<R, I, A & C> => {
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
): Schema<never, InstanceType<A>> =>
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

const _undefined: Schema<never, undefined> = make(AST.undefinedKeyword)

const _void: Schema<never, void> = make(AST.voidKeyword)

const _null: Schema<never, null> = make(AST._null)

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
export const never: Schema<never, never> = make(AST.neverKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const unknown: Schema<never, unknown> = make(AST.unknownKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const any: Schema<never, any> = make(AST.anyKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const string: Schema<never, string> = make(AST.stringKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const number: Schema<never, number> = make(AST.numberKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const boolean: Schema<never, boolean> = make(AST.booleanKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const bigintFromSelf: Schema<never, bigint> = make(AST.bigIntKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const symbolFromSelf: Schema<never, symbol> = make(AST.symbolKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const object: Schema<never, object> = make(AST.objectKeyword)

/**
 * @category combinators
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any, any>>>(
  ...members: Members
): Schema<Schema.Context<Members[number]>, Schema.From<Members[number]>, Schema.To<Members[number]>> =>
  make(AST.createUnion(members.map((m) => m.ast)))

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullable = <R, I, A>(self: Schema<R, I, A>): Schema<R, I | null, A | null> => union(_null, self)

/**
 * @category combinators
 * @since 1.0.0
 */
export const orUndefined = <R, I, A>(
  self: Schema<R, I, A>
): Schema<R, I | undefined, A | undefined> => union(_undefined, self)

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullish = <R, I, A>(
  self: Schema<R, I, A>
): Schema<R, I | null | undefined, A | null | undefined> => union(_null, _undefined, self)

/**
 * @category combinators
 * @since 1.0.0
 */
export const keyof = <R, I, A>(schema: Schema<R, I, A>): Schema<never, keyof A> => make(AST.keyof(schema.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const tuple = <Elements extends ReadonlyArray<Schema<any, any>>>(
  ...elements: Elements
): Schema<
  Schema.Context<Elements[number]>,
  { readonly [K in keyof Elements]: Schema.From<Elements[K]> },
  { readonly [K in keyof Elements]: Schema.To<Elements[K]> }
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
  <R2, IB, B>(rest: Schema<R2, IB, B>) =>
  <R1, I extends ReadonlyArray<any>, A extends ReadonlyArray<any>>(
    self: Schema<R1, I, A>
  ): Schema<R1 | R2, readonly [...I, ...Array<IB>], readonly [...A, ...Array<B>]> => {
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
  <R2, IB, B>(element: Schema<R2, IB, B>) =>
  <R1, I extends ReadonlyArray<any>, A extends ReadonlyArray<any>>(
    self: Schema<R1, I, A>
  ): Schema<R1 | R2, readonly [...I, IB], readonly [...A, B]> => {
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
  <R2, IB, B>(element: Schema<R2, IB, B>) =>
  <R1, I extends ReadonlyArray<any>, A extends ReadonlyArray<any>>(
    self: Schema<R1, I, A>
  ): Schema<R1 | R2, readonly [...I, IB?], readonly [...A, B?]> => {
    if (AST.isTuple(self.ast)) {
      return make(AST.appendElement(self.ast, AST.createElement(element.ast, true)))
    }
    throw new Error("`optionalElement` is not supported on this schema")
  }

/**
 * @category combinators
 * @since 1.0.0
 */
export const array = <R, I, A>(item: Schema<R, I, A>): Schema<R, ReadonlyArray<I>, ReadonlyArray<A>> =>
  make(AST.createTuple([], Option.some([item.ast]), true))

/**
 * @category combinators
 * @since 1.0.0
 */
export const nonEmptyArray = <R, I, A>(
  item: Schema<R, I, A>
): Schema<R, readonly [I, ...Array<I>], readonly [A, ...Array<A>]> => tuple(item).pipe(rest(item))

/**
 * @since 1.0.0
 */
export interface PropertySignature<R, From, FromIsOptional, To, ToIsOptional>
  extends Schema.Variance<R, From, To>, Pipeable
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
  readonly [TypeId]: Schema.Variance<R, From, To>[TypeId] = InternalSchema.variance
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
): S extends Schema<infer R, infer I, infer A> ? PropertySignature<R, I, false, A, false> : S => {
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
export const optionalToRequired = <R, I, A, B>(
  from: Schema<R, I, A>,
  to: Schema<never, B>,
  decode: (o: Option.Option<A>) => B, // `none` here means: the value is missing in the input
  encode: (b: B) => Option.Option<A>, // `none` here means: the value will be missing in the output
  options?: DocAnnotations
): PropertySignature<R, I, true, B, false> =>
  new PropertySignatureImpl({
    _tag: "OptionalToRequired",
    from: from.ast,
    to: to.ast,
    decode: (o) => Option.some(decode(o)),
    encode: Option.flatMap(encode),
    annotations: toAnnotations(options)
  })

/**
 * @since 1.0.0
 */
export const optional: {
  <R, I, A>(
    schema: Schema<R, I, A>,
    options: { readonly exact: true; readonly default: () => A; readonly nullable: true }
  ): PropertySignature<R, I | null, true, A, false>
  <R, I, A>(
    schema: Schema<R, I, A>,
    options: { readonly exact: true; readonly default: () => A }
  ): PropertySignature<R, I, true, A, false>
  <R, I, A>(
    schema: Schema<R, I, A>,
    options: { readonly exact: true; readonly nullable: true; readonly as: "Option" }
  ): PropertySignature<R, I | null, true, Option.Option<A>, false>
  <R, I, A>(
    schema: Schema<R, I, A>,
    options: { readonly exact: true; readonly as: "Option" }
  ): PropertySignature<R, I, true, Option.Option<A>, false>
  <R, I, A>(
    schema: Schema<R, I, A>,
    options: { readonly exact: true }
  ): PropertySignature<R, I, true, A, true>
  <R, I, A>(
    schema: Schema<R, I, A>,
    options: { readonly default: () => A; readonly nullable: true }
  ): PropertySignature<R, I | null | undefined, true, A, false>
  <R, I, A>(
    schema: Schema<R, I, A>,
    options: { readonly default: () => A }
  ): PropertySignature<R, I | undefined, true, A, false>
  <R, I, A>(
    schema: Schema<R, I, A>,
    options: { readonly nullable: true; readonly as: "Option" }
  ): PropertySignature<R, I | undefined | null, true, Option.Option<A>, false>
  <R, I, A>(
    schema: Schema<R, I, A>,
    options: { readonly as: "Option" }
  ): PropertySignature<R, I | undefined, true, Option.Option<A>, false>
  <R, I, A>(schema: Schema<R, I, A>): PropertySignature<R, I | undefined, true, A | undefined, true>
} = <R, I, A>(
  schema: Schema<R, I, A>,
  options?: {
    readonly exact?: true
    readonly default?: () => A
    readonly nullable?: true
    readonly as?: "Option"
  }
): PropertySignature<R, any, any, any, any> => {
  const isExact = options?.exact
  const value = options?.default
  const isNullable = options?.nullable
  const asOption = options?.as == "Option"

  if (isExact) {
    if (value) {
      if (isNullable) {
        return optionalToRequired(
          nullable(schema),
          to(schema),
          Option.match({ onNone: value, onSome: (a) => a === null ? value() : a }),
          Option.some
        )
      } else {
        return optionalToRequired(
          schema,
          to(schema),
          Option.match({ onNone: value, onSome: identity }),
          Option.some
        )
      }
    } else {
      if (asOption) {
        if (isNullable) {
          return optionalToRequired(
            nullable(schema),
            optionFromSelf(to(schema)),
            Option.filter(Predicate.isNotNull),
            identity
          )
        } else {
          return optionalToRequired(
            schema,
            optionFromSelf(to(schema)),
            identity,
            identity
          )
        }
      }
      return new PropertySignatureImpl({
        _tag: "Declaration",
        from: schema.ast,
        isOptional: true
      })
    }
  } else {
    if (value) {
      if (isNullable) {
        return optionalToRequired(
          nullish(schema),
          to(schema),
          Option.match({ onNone: value, onSome: (a) => (a == null ? value() : a) }),
          Option.some
        )
      } else {
        return optionalToRequired(
          orUndefined(schema),
          to(schema),
          Option.match({ onNone: value, onSome: (a) => (a === undefined ? value() : a) }),
          Option.some
        )
      }
    } else {
      if (asOption) {
        if (isNullable) {
          return optionalToRequired(
            nullish(schema),
            optionFromSelf(to(schema)),
            Option.filter((a: A | null | undefined): a is A => a != null),
            identity
          )
        } else {
          return optionalToRequired(
            orUndefined(schema),
            optionFromSelf(to(schema)),
            Option.filter(Predicate.isNotUndefined),
            identity
          )
        }
      }
      return new PropertySignatureImpl({
        _tag: "Declaration",
        from: orUndefined(schema).ast,
        isOptional: true
      })
    }
  }
}

/**
 * @since 1.0.0
 */
export type FromOptionalKeys<Fields> = {
  [K in keyof Fields]: Fields[K] extends
    | PropertySignature<any, any, true, any, boolean>
    | PropertySignature<any, never, true, never, boolean> ? K
    : never
}[keyof Fields]

/**
 * @since 1.0.0
 */
export type ToOptionalKeys<Fields> = {
  [K in keyof Fields]: Fields[K] extends
    | PropertySignature<any, any, boolean, any, true>
    | PropertySignature<any, never, boolean, never, true> ? K
    : never
}[keyof Fields]

/**
 * @since 1.0.0
 */
export type StructFields = Record<
  PropertyKey,
  | Schema<any, any, any>
  | Schema<any, never, never>
  | PropertySignature<any, any, boolean, any, boolean>
  | PropertySignature<any, never, boolean, never, boolean>
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
): Schema<Schema.Context<Fields[keyof Fields]>, Simplify<FromStruct<Fields>>, Simplify<ToStruct<Fields>>> => {
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
  self: Schema<R, I, A>
): Schema<R, Simplify<Pick<I, Keys[number]>>, Simplify<Pick<A, Keys[number]>>> => {
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
  self: Schema<R, I, A>
): Schema<R, Simplify<Omit<I, Keys[number]>>, Simplify<Omit<A, Keys[number]>>> => {
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
 * @category struct transformations
 * @since 1.0.0
 */
export const pluck: {
  <A, K extends keyof A>(key: K): <R, I>(schema: Schema<R, I, A>) => Schema<R, I, A[K]>
  <R, I, A, K extends keyof A>(schema: Schema<R, I, A>, key: K): Schema<R, I, A[K]>
} = dual(2, <R, I, A, K extends keyof A>(schema: Schema<R, I, A>, key: K): Schema<R, I, A[K]> => {
  const ps = AST.getPropertyKeyIndexedAccess(to(schema).ast, key)
  const value = make<R, A[K], A[K]>(ps.isOptional ? AST.createUnion([AST.undefinedKeyword, ps.type]) : ps.type)
  return transform(
    schema,
    value,
    (a) => a[key],
    (ak) => ps.isOptional && ak === undefined ? {} : { [key]: ak } as any
  )
})

/**
 * @category model
 * @since 1.0.0
 */
export interface BrandSchema<R, I, A extends Brand.Brand<any>> extends Schema<R, I, A>, Brand.Brand.Constructor<A> {}

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
  <I>(self: Schema<never, I, A>): BrandSchema<never, I, A & Brand.Brand<B>> => {
    const ast = appendBrandAnnotation(self.ast, brand, options)
    const schema = make<never, I, A>(ast)
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
export const partial = <R, I, A>(
  self: Schema<R, I, A>
): Schema<R, Simplify<Partial<I>>, Simplify<Partial<A>>> => make(AST.partial(self.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const required = <R, I, A>(
  self: Schema<R, I, A>
): Schema<R, Simplify<Required<I>>, Simplify<Required<A>>> => make(AST.required(self.ast))

/**
 * Creates a new schema with shallow mutability applied to its properties.
 *
 * @param schema - The original schema to make properties mutable (shallowly).
 *
 * @category combinators
 * @since 1.0.0
 */
export const mutable = <R, I, A>(
  schema: Schema<R, I, A>
): Schema<R, Simplify<Mutable<I>>, Simplify<Mutable<A>>> => {
  const ast = AST.mutable(schema.ast)
  return ast === schema.ast ? schema as any : make(ast)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const record = <R1, IK extends string | symbol, AK extends IK, R2, IV, AV>(
  key: Schema<R1, IK, AK>,
  value: Schema<R2, IV, AV>
): Schema<R1 | R2, { readonly [k in IK]: IV }, { readonly [k in AK]: AV }> =>
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
  <R2, IB, B>(
    that: Schema<R2, IB, B>
  ): <R1, I, A>(self: Schema<R1, I, A>) => Schema<R1 | R2, Simplify<I & IB>, Simplify<A & B>>
  <R1, I, A, R2, IB, B>(
    self: Schema<R1, I, A>,
    that: Schema<R2, IB, B>
  ): Schema<R1 | R2, Simplify<I & IB>, Simplify<A & B>>
} = dual(
  2,
  <R1, I, A, R2, IB, B>(
    self: Schema<R1, I, A>,
    that: Schema<R2, IB, B>
  ): Schema<R1 | R2, Simplify<I & IB>, Simplify<A & B>> =>
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
  <R2, B, C>(bc: Schema<R2, B, C>): <R1, A>(ab: Schema<R1, A, B>) => Schema<R1 | R2, A, C>
  <R2, C, D>(
    bc: Schema<R2, C, D>,
    options: { strict: false }
  ): <R1, A, B>(ab: Schema<R1, A, B>) => Schema<R1 | R2, A, D>
  <R1, A, B, R2, C>(ab: Schema<R1, A, B>, cd: Schema<R2, B, C>): Schema<R1 | R2, A, C>
  <R1, A, B, R2, C, D>(ab: Schema<R1, A, B>, cd: Schema<R2, C, D>, options: { strict: false }): Schema<R1 | R2, A, D>
} = dual(
  (args) => isSchema(args[1]),
  <R1, A, B, R2, C, D>(ab: Schema<R1, A, B>, cd: Schema<R2, C, D>): Schema<R1 | R2, A, D> =>
    make(AST.compose(ab.ast, cd.ast))
)

/**
 * @category combinators
 * @since 1.0.0
 */
export const suspend = <R, I, A = I>(
  f: () => Schema<R, I, A>,
  annotations?: AST.Annotations
): Schema<R, I, A> => make(AST.createSuspend(() => f().ast, annotations))

/**
 * @category combinators
 * @since 1.0.0
 */
export function filter<A>(
  f: (a: A, options: ParseOptions, self: AST.Refinement) => Option.Option<ParseResult.ParseIssue>,
  options?: FilterAnnotations<A>
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A>
export function filter<C extends A, B extends A, A = C>(
  refinement: Predicate.Refinement<A, B>,
  options?: FilterAnnotations<A>
): <R, I>(self: Schema<R, I, C>) => Schema<R, I, C & B>
export function filter<A>(
  predicate: Predicate.Predicate<NoInfer<A>>,
  options?: FilterAnnotations<NoInfer<A>>
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A>
export function filter<A>(
  predicate: Predicate.Predicate<A> | AST.Refinement["filter"],
  options?: FilterAnnotations<A>
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> {
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
  <R2, C, D, B, R3, R4>(
    to: Schema<R2, C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R3, ParseResult.ParseIssue, C>,
    encode: (c: C, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R4, ParseResult.ParseIssue, B>
  ): <R1, A>(self: Schema<R1, A, B>) => Schema<R1 | R2 | R3 | R4, A, D>
  <R2, C, D, B, R3, R4>(
    to: Schema<R2, C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R3, ParseResult.ParseIssue, unknown>,
    encode: (c: C, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R4, ParseResult.ParseIssue, unknown>,
    options: { strict: false }
  ): <R1, A>(self: Schema<R1, A, B>) => Schema<R1 | R2 | R3 | R4, A, D>
  <R1, A, B, R2, C, D, R3, R4>(
    from: Schema<R1, A, B>,
    to: Schema<R2, C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R3, ParseResult.ParseIssue, C>,
    encode: (c: C, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R4, ParseResult.ParseIssue, B>
  ): Schema<R1 | R2 | R3 | R4, A, D>
  <R1, A, B, R2, C, D, R3, R4>(
    from: Schema<R1, A, B>,
    to: Schema<R2, C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R3, ParseResult.ParseIssue, unknown>,
    encode: (c: C, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R4, ParseResult.ParseIssue, unknown>,
    options: { strict: false }
  ): Schema<R1 | R2 | R3 | R4, A, D>
} = dual((args) => isSchema(args[0]) && isSchema(args[1]), <R1, A, B, R2, C, D, R3, R4>(
  from: Schema<R1, A, B>,
  to: Schema<R2, C, D>,
  decode: (b: B, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R3, ParseResult.ParseIssue, unknown>,
  encode: (c: C, options: ParseOptions, ast: AST.Transform) => Effect.Effect<R4, ParseResult.ParseIssue, unknown>
): Schema<R1 | R2 | R3 | R4, A, D> =>
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
  <R2, C, D, B>(
    to: Schema<R2, C, D>,
    decode: (b: B) => C,
    encode: (c: C) => B
  ): <R1, A>(self: Schema<R1, A, B>) => Schema<R1 | R2, A, D>
  <R2, C, D, B>(
    to: Schema<R2, C, D>,
    decode: (b: B) => unknown,
    encode: (c: C) => unknown,
    options: { strict: false }
  ): <R1, A>(self: Schema<R1, A, B>) => Schema<R1 | R2, A, D>
  <R1, A, B, R2, C, D>(
    from: Schema<R1, A, B>,
    to: Schema<R2, C, D>,
    decode: (b: B) => C,
    encode: (c: C) => B
  ): Schema<R1 | R2, A, D>
  <R1, A, B, R2, C, D>(
    from: Schema<R1, A, B>,
    to: Schema<R2, C, D>,
    decode: (b: B) => unknown,
    encode: (c: C) => unknown,
    options: { strict: false }
  ): Schema<R1 | R2, A, D>
} = dual(
  (args) => isSchema(args[0]) && isSchema(args[1]),
  <R1, A, B, R2, C, D>(
    from: Schema<R1, A, B>,
    to: Schema<R2, C, D>,
    decode: (b: B) => C,
    encode: (c: C) => B
  ): Schema<R1 | R2, A, D> =>
    transformOrFail(from, to, (a) => ParseResult.succeed(decode(a)), (b) => ParseResult.succeed(encode(b)))
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
): Schema<never, From, To> => transform(literal(from), literal(to), () => to, () => from)

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
): Schema<never, A[number][0], A[number][1]> => union(...pairs.map(([from, to]) => transformLiteral(from, to)))

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
  ): <R, I, A extends object>(
    schema: Schema<R, I, A>
  ) => Schema<R, I, Simplify<A & { readonly [k in K]: V }>>
  <R, I, A, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<R, I, A>,
    key: K,
    value: V,
    options?: DocAnnotations
  ): Schema<R, I, Simplify<A & { readonly [k in K]: V }>>
} = dual(
  (args) => isSchema(args[0]),
  <R, I, A, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<R, I, A>,
    key: K,
    value: V,
    options?: DocAnnotations
  ): Schema<R, I, Simplify<A & { readonly [k in K]: V }>> => {
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
export const annotations = (annotations: AST.Annotations) => <R, I, A>(self: Schema<R, I, A>): Schema<R, I, A> =>
  make(AST.mergeAnnotations(self.ast, annotations))

/**
 * @category annotations
 * @since 1.0.0
 */
export const message = (message: AST.MessageAnnotation<unknown>) => <R, I, A>(self: Schema<R, I, A>): Schema<R, I, A> =>
  make(AST.setAnnotation(self.ast, AST.MessageAnnotationId, message))

/**
 * @category annotations
 * @since 1.0.0
 */
export const identifier = (identifier: AST.IdentifierAnnotation) => <R, I, A>(self: Schema<R, I, A>): Schema<R, I, A> =>
  make(AST.setAnnotation(self.ast, AST.IdentifierAnnotationId, identifier))

/**
 * @category annotations
 * @since 1.0.0
 */
export const title = (title: AST.TitleAnnotation) => <R, I, A>(self: Schema<R, I, A>): Schema<R, I, A> =>
  make(AST.setAnnotation(self.ast, AST.TitleAnnotationId, title))

/**
 * @category annotations
 * @since 1.0.0
 */
export const description =
  (description: AST.DescriptionAnnotation) => <R, I, A>(self: Schema<R, I, A>): Schema<R, I, A> =>
    make(AST.setAnnotation(self.ast, AST.DescriptionAnnotationId, description))

/**
 * @category annotations
 * @since 1.0.0
 */
export const examples = (examples: AST.ExamplesAnnotation) => <R, I, A>(self: Schema<R, I, A>): Schema<R, I, A> =>
  make(AST.setAnnotation(self.ast, AST.ExamplesAnnotationId, examples))

const _default = <A>(value: A) => <R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
  (documentation: AST.DocumentationAnnotation) => <R, I, A>(self: Schema<R, I, A>): Schema<R, I, A> =>
    make(AST.setAnnotation(self.ast, AST.DocumentationAnnotationId, documentation))

/**
 * Attaches a JSON Schema annotation to a schema that represents a refinement.
 *
 * If the schema is composed of more than one refinement, the corresponding annotations will be merged.
 *
 * @category annotations
 * @since 1.0.0
 */
export const jsonSchema = (jsonSchema: AST.JSONSchemaAnnotation) => <R, I, A>(self: Schema<R, I, A>): Schema<R, I, A> =>
  make(AST.setAnnotation(self.ast, AST.JSONSchemaAnnotationId, jsonSchema))

/**
 * @category annotations
 * @since 1.0.0
 */
export const equivalence =
  <A>(equivalence: Equivalence.Equivalence<A>) => <R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
  ): <R, I>(self: Schema<R, I, A>) => Schema<R, I, Simplify<Rename<A, M>>>
  <
    R,
    I,
    A,
    const M extends
      & { readonly [K in keyof A]?: PropertyKey }
      & { readonly [K in Exclude<keyof M, keyof A>]: never }
  >(
    self: Schema<R, I, A>,
    mapping: M
  ): Schema<R, I, Simplify<Rename<A, M>>>
} = dual(
  2,
  <
    R,
    I,
    A,
    const M extends
      & { readonly [K in keyof A]?: PropertyKey }
      & { readonly [K in Exclude<keyof M, keyof A>]: never }
  >(
    self: Schema<R, I, A>,
    mapping: M
  ): Schema<R, I, Simplify<Rename<A, M>>> => {
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
  <A extends string>(options?: FilterAnnotations<A>) => <R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> => {
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
  <A extends string>(options?: FilterAnnotations<A>) => <R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
export const Lowercased: Schema<never, string> = string.pipe(
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
  <A extends string>(options?: FilterAnnotations<A>) => <R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
export const Uppercased: Schema<never, string> = string.pipe(
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> =>
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
export const Lowercase: Schema<never, string> = transform(
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
export const Uppercase: Schema<never, string> = transform(
  string,
  Uppercased,
  (s) => s.toUpperCase(),
  identity
).pipe(identifier("Uppercase"))

/**
 * @category string constructors
 * @since 1.0.0
 */
export const Trimmed: Schema<never, string> = string.pipe(
  trimmed({ identifier: "Trimmed", title: "Trimmed" })
)

/**
 * This schema allows removing whitespaces from the beginning and end of a string.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Trim: Schema<never, string> = transform(
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
export const split = (separator: string): Schema<never, string, ReadonlyArray<string>> =>
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
 * Optionally, you can pass a schema `Schema<R, I, A>` to obtain an `A` type instead of `unknown`.
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
  <R, I, A>(schema: Schema<R, I, A>, options?: ParseJsonOptions): Schema<R, string, A>
  (options?: ParseJsonOptions): Schema<never, string, unknown>
} = <R, I, A>(schema?: Schema<R, I, A> | ParseJsonOptions, o?: ParseJsonOptions) => {
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
export const NonEmpty: Schema<never, string> = string.pipe(
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
export const UUID: Schema<never, string> = string.pipe(
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
export const ULID: Schema<never, string> = string.pipe(
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
  <A extends number>(options?: FilterAnnotations<A>) => <R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
  <A extends number>(options?: FilterAnnotations<A>) => <R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
  <A extends number>(max: number, options?: FilterAnnotations<A>) => <R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
  <A extends number>(options?: FilterAnnotations<A>) => <R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> => greaterThan(0, options)

/**
 * @category number filters
 * @since 1.0.0
 */
export const negative = <A extends number>(
  options?: FilterAnnotations<A>
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> => lessThan(0, options)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonPositive = <A extends number>(
  options?: FilterAnnotations<A>
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> => lessThanOrEqualTo(0, options)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonNegative = <A extends number>(
  options?: FilterAnnotations<A>
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> => greaterThanOrEqualTo(0, options)

/**
 * Clamps a number between a minimum and a maximum value.
 *
 * @category number transformations
 * @since 1.0.0
 */
export const clamp =
  (minimum: number, maximum: number) => <R, I, A extends number>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
export const NumberFromString: Schema<never, string, number> = transformOrFail(
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
export const Finite: Schema<never, number> = number.pipe(finite({ identifier: "Finite", title: "Finite" }))

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Int: Schema<never, number> = number.pipe(int({ identifier: "Int", title: "Int" }))

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonNaN: Schema<never, number> = number.pipe(nonNaN({ identifier: "NonNaN", title: "NonNaN" }))

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Positive: Schema<never, number> = number.pipe(
  positive({ identifier: "Positive", title: "Positive" })
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Negative: Schema<never, number> = number.pipe(
  negative({ identifier: "Negative", title: "Negative" })
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonPositive: Schema<never, number> = number.pipe(
  nonPositive({ identifier: "NonPositive", title: "NonPositive" })
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonNegative: Schema<never, number> = number.pipe(
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
export const JsonNumber: Schema<never, number> = number.pipe(
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
export const Not: Schema<never, boolean> = transform(
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
export const symbol: Schema<never, string, symbol> = transform(
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> => greaterThanBigint(0n, options)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const negativeBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> => lessThanBigint(0n, options)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonNegativeBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> => greaterThanOrEqualToBigint(0n, options)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonPositiveBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <R, I>(self: Schema<R, I, A>) => Schema<R, I, A> => lessThanOrEqualToBigint(0n, options)

/**
 * Clamps a bigint between a minimum and a maximum value.
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const clampBigint =
  (minimum: bigint, maximum: bigint) => <R, I, A extends bigint>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
export const bigint: Schema<never, string, bigint> = transformOrFail(
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
export const PositiveBigintFromSelf: Schema<never, bigint> = bigintFromSelf.pipe(
  positiveBigint({ identifier: "PositiveBigintFromSelf", title: "PositiveBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const PositiveBigint: Schema<never, string, bigint> = bigint.pipe(
  positiveBigint({ identifier: "PositiveBigint", title: "PositiveBigint" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NegativeBigintFromSelf: Schema<never, bigint> = bigintFromSelf.pipe(
  negativeBigint({ identifier: "NegativeBigintFromSelf", title: "NegativeBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NegativeBigint: Schema<never, string, bigint> = bigint.pipe(
  negativeBigint({ identifier: "NegativeBigint", title: "NegativeBigint" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonPositiveBigintFromSelf: Schema<never, bigint> = bigintFromSelf.pipe(
  nonPositiveBigint({ identifier: "NonPositiveBigintFromSelf", title: "NonPositiveBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonPositiveBigint: Schema<never, string, bigint> = bigint.pipe(
  nonPositiveBigint({ identifier: "NonPositiveBigint", title: "NonPositiveBigint" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonNegativeBigintFromSelf: Schema<never, bigint> = bigintFromSelf.pipe(
  nonNegativeBigint({ identifier: "NonNegativeBigintFromSelf", title: "NonNegativeBigintFromSelf" })
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonNegativeBigint: Schema<never, string, bigint> = bigint.pipe(
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
export const BigintFromNumber: Schema<never, number, bigint> = transformOrFail(
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
export const SecretFromSelf: Schema<never, Secret.Secret> = declare(
  Secret.isSecret,
  {
    identifier: "SecretFromSelf",
    pretty: (): Pretty.Pretty<Secret.Secret> => (secret) => String(secret),
    arbitrary: (): Arbitrary<Secret.Secret> => (fc) => fc.string().map((_) => Secret.fromString(_))
  }
)

const _Secret: Schema<never, string, Secret.Secret> = transform(
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
export const DurationFromSelf: Schema<never, Duration.Duration> = declare(
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
export const DurationFromNanos: Schema<never, bigint, Duration.Duration> = transformOrFail(
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
export const DurationFromMillis: Schema<never, number, Duration.Duration> = transform(
  number,
  DurationFromSelf,
  (ms) => Duration.millis(ms),
  (n) => Duration.toMillis(n)
).pipe(identifier("DurationFromMillis"))

const hrTime: Schema<never, readonly [seconds: number, nanos: number]> = tuple(
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

const _Duration: Schema<never, readonly [seconds: number, nanos: number], Duration.Duration> = transform(
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
  <R, I, A extends Duration.Duration>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
export const Uint8ArrayFromSelf: Schema<never, Uint8Array> = declare(
  Predicate.isUint8Array,
  {
    identifier: "Uint8ArrayFromSelf",
    pretty: (): Pretty.Pretty<Uint8Array> => (u8arr) => `new Uint8Array(${JSON.stringify(Array.from(u8arr))})`,
    arbitrary: (): Arbitrary<Uint8Array> => (fc) => fc.uint8Array(),
    equivalence: (): Equivalence.Equivalence<Uint8Array> => ReadonlyArray.getEquivalence(Equivalence.strict()) as any
  }
)

const _Uint8Array: Schema<never, ReadonlyArray<number>, Uint8Array> = transform(
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
): Schema<never, string, Uint8Array> =>
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
export const Base64: Schema<never, string, Uint8Array> = makeEncodingTransformation(
  "Base64",
  Encoding.decodeBase64,
  Encoding.encodeBase64
)

/**
 * @category Encoding transformations
 * @since 1.0.0
 */
export const Base64Url: Schema<never, string, Uint8Array> = makeEncodingTransformation(
  "Base64Url",
  Encoding.decodeBase64Url,
  Encoding.encodeBase64Url
)

/**
 * @category Encoding transformations
 * @since 1.0.0
 */
export const Hex: Schema<never, string, Uint8Array> = makeEncodingTransformation(
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
<R, I>(self: Schema<R, I, ReadonlyArray<A>>): Schema<R, I, ReadonlyArray<A>> =>
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
<R, I>(self: Schema<R, I, ReadonlyArray<A>>): Schema<R, I, ReadonlyArray<A>> =>
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
<R, I>(self: Schema<R, I, ReadonlyArray<A>>): Schema<R, I, ReadonlyArray<A>> =>
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
export const getNumberIndexedAccess = <R, I extends ReadonlyArray<any>, A extends ReadonlyArray<any>>(
  self: Schema<R, I, A>
): Schema<R, I[number], A[number]> => make(AST.getNumberIndexedAccess(self.ast))

/**
 * Get the first element of a `ReadonlyArray`, or `None` if the array is empty.
 *
 * @category ReadonlyArray transformations
 * @since 1.0.0
 */
export const head = <R, I, A>(self: Schema<R, I, ReadonlyArray<A>>): Schema<R, I, Option.Option<A>> =>
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
export const headOr = <R, I, A>(self: Schema<R, I, ReadonlyArray<A>>, fallback?: LazyArg<A>): Schema<R, I, A> =>
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
export const validDate = (options?: FilterAnnotations<Date>) => <R, I>(self: Schema<R, I, Date>): Schema<R, I, Date> =>
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
export const DateFromSelf: Schema<never, Date> = declare(
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
export const ValidDateFromSelf: Schema<never, Date> = DateFromSelf.pipe(
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
export const DateFromString: Schema<never, string, Date> = transform(
  string,
  DateFromSelf,
  (s) => new Date(s),
  (n) => n.toISOString()
).pipe(identifier("DateFromString"))

const _Date: Schema<never, string, Date> = DateFromString.pipe(
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

const optionSomeFrom = <R, I, A>(value: Schema<R, I, A>) =>
  struct({
    _tag: literal("Some"),
    value
  })

const optionFrom = <R, I, A>(value: Schema<R, I, A>): Schema<R, OptionFrom<I>, OptionFrom<A>> =>
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
  <R, A>(decodeUnknown: ParseResult.DecodeUnknown<R, A>): ParseResult.DeclarationDecodeUnknown<R, Option.Option<A>> =>
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
export const optionFromSelf = <R, I, A>(
  value: Schema<R, I, A>
): Schema<R, Option.Option<I>, Option.Option<A>> => {
  return declare(
    [value],
    (value) => optionParse(ParseResult.decodeUnknown(value)),
    (value) => optionParse(ParseResult.encodeUnknown(value)),
    {
      description: `Option<${Format.format(value)}>`,
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
export const option = <R, I, A>(
  value: Schema<R, I, A>
): Schema<R, OptionFrom<I>, Option.Option<A>> =>
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
export const optionFromNullable = <R, I, A>(
  value: Schema<R, I, A>
): Schema<R, I | null, Option.Option<A>> =>
  transform(nullable(value), optionFromSelf(to(value)), Option.fromNullable, Option.getOrNull)

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromNullish = <R, I, A>(
  value: Schema<R, I, A>,
  onNoneEncoding: null | undefined
): Schema<R, I | null | undefined, Option.Option<A>> =>
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
export const optionFromOrUndefined = <R, I, A>(
  value: Schema<R, I, A>
): Schema<R, I | undefined, Option.Option<A>> =>
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

const rightFrom = <R, IA, A>(right: Schema<R, IA, A>): Schema<R, RightFrom<IA>, RightFrom<A>> =>
  struct({
    _tag: literal("Right"),
    right
  }).pipe(description(`RightFrom<${Format.format(right)}>`))

const leftFrom = <R, IE, E>(left: Schema<R, IE, E>): Schema<R, LeftFrom<IE>, LeftFrom<E>> =>
  struct({
    _tag: literal("Left"),
    left
  }).pipe(description(`LeftFrom<${Format.format(left)}>`))

const eitherFrom = <R1, IE, E, R2, IA, A>(
  left: Schema<R1, IE, E>,
  right: Schema<R2, IA, A>
): Schema<R1 | R2, EitherFrom<IE, IA>, EitherFrom<E, A>> =>
  union(rightFrom(right), leftFrom(left)).pipe(
    description(`EitherFrom<${Format.format(left)}, ${Format.format(right)}>`)
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
  decodeUnknownLeft: ParseResult.DecodeUnknown<RE, E>,
  parseright: ParseResult.DecodeUnknown<RA, A>
): ParseResult.DeclarationDecodeUnknown<RE | RA, Either.Either<E, A>> =>
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
export const eitherFromSelf = <RE, IE, E, RA, IA, A>(
  left: Schema<RE, IE, E>,
  right: Schema<RA, IA, A>
): Schema<RE | RA, Either.Either<IE, IA>, Either.Either<E, A>> => {
  return declare(
    [left, right],
    (left, right) => eitherParse(ParseResult.decodeUnknown(left), ParseResult.decodeUnknown(right)),
    (left, right) => eitherParse(ParseResult.encodeUnknown(left), ParseResult.encodeUnknown(right)),
    {
      description: `Either<${Format.format(left)}, ${Format.format(right)}>`,
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
export const either = <R1, IE, E, R2, IA, A>(
  left: Schema<R1, IE, E>,
  right: Schema<R2, IA, A>
): Schema<R1 | R2, EitherFrom<IE, IA>, Either.Either<E, A>> =>
  transform(
    eitherFrom(left, right),
    eitherFromSelf(to(left), to(right)),
    eitherDecode,
    Either.match({ onLeft: makeLeftFrom, onRight: makeRightFrom })
  )

/**
 * @example
 * import * as Schema from "@effect/schema/Schema"
 *
 * // Schema<string | number, Either<string, number>>
 * Schema.eitherFromUnion(Schema.string, Schema.number)
 *
 * @category Either transformations
 * @since 1.0.0
 */
export const eitherFromUnion = <R1, EI, EA, R2, AI, AA>(
  left: Schema<R1, EI, EA>,
  right: Schema<R2, AI, AA>
): Schema<R1 | R2, EI | AI, Either.Either<EA, AA>> => {
  const toleft = to(left)
  const toright = to(right)
  const fromLeft = transform(left, leftFrom(toleft), makeLeftFrom, (l) => l.left)
  const fromRight = transform(right, rightFrom(toright), makeRightFrom, (r) => r.right)
  return transform(
    union(fromRight, fromLeft),
    eitherFromSelf(toleft, toright),
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
  decodeUnknown: ParseResult.DecodeUnknown<R, ReadonlyArray<readonly [K, V]>>
): ParseResult.DeclarationDecodeUnknown<R, ReadonlyMap<K, V>> =>
(u, options, ast) =>
  isMap(u) ?
    ParseResult.map(decodeUnknown(Array.from(u.entries()), options), (as): ReadonlyMap<K, V> => new Map(as))
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category ReadonlyMap transformations
 * @since 1.0.0
 */
export const readonlyMapFromSelf = <RK, IK, K, RV, IV, V>(
  key: Schema<RK, IK, K>,
  value: Schema<RV, IV, V>
): Schema<RK | RV, ReadonlyMap<IK, IV>, ReadonlyMap<K, V>> => {
  return declare(
    [key, value],
    (key, value) => readonlyMapParse(ParseResult.decodeUnknown(array(tuple(key, value)))),
    (key, value) => readonlyMapParse(ParseResult.encodeUnknown(array(tuple(key, value)))),
    {
      description: `ReadonlyMap<${Format.format(key)}, ${Format.format(value)}>`,
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
export const readonlyMap = <R1, IK, K, R2, IV, V>(
  key: Schema<R1, IK, K>,
  value: Schema<R2, IV, V>
): Schema<R1 | R2, ReadonlyArray<readonly [IK, IV]>, ReadonlyMap<K, V>> =>
  transform(
    array(tuple(key, value)),
    readonlyMapFromSelf(to(key), to(value)),
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
  decodeUnknown: ParseResult.DecodeUnknown<R, ReadonlyArray<A>>
): ParseResult.DeclarationDecodeUnknown<R, ReadonlySet<A>> =>
(u, options, ast) =>
  isSet(u) ?
    ParseResult.map(decodeUnknown(Array.from(u.values()), options), (as): ReadonlySet<A> => new Set(as))
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category ReadonlySet transformations
 * @since 1.0.0
 */
export const readonlySetFromSelf = <R, I, A>(
  item: Schema<R, I, A>
): Schema<R, ReadonlySet<I>, ReadonlySet<A>> => {
  return declare(
    [item],
    (item) => readonlySetParse(ParseResult.decodeUnknown(array(item))),
    (item) => readonlySetParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `ReadonlySet<${Format.format(item)}>`,
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
export const readonlySet = <R, I, A>(item: Schema<R, I, A>): Schema<R, ReadonlyArray<I>, ReadonlySet<A>> =>
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
export const BigDecimalFromSelf: Schema<never, BigDecimal.BigDecimal> = declare(
  BigDecimal.isBigDecimal,
  {
    identifier: "BigDecimalFromSelf",
    pretty: bigDecimalPretty,
    arbitrary: bigDecimalArbitrary,
    equivalence: () => BigDecimal.Equivalence
  }
)

const _BigDecimal: Schema<never, string, BigDecimal.BigDecimal> = transformOrFail(
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
export const BigDecimalFromNumber: Schema<never, number, BigDecimal.BigDecimal> = transformOrFail(
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
<R, I>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
  <R, I, A extends BigDecimal.BigDecimal>(self: Schema<R, I, A>): Schema<R, I, A> =>
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
  self: Schema<R, I, A>
): Schema<R, I, A> =>
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
  decodeUnknown: ParseResult.DecodeUnknown<R, ReadonlyArray<A>>
): ParseResult.DeclarationDecodeUnknown<R, Chunk.Chunk<A>> =>
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
export const chunkFromSelf = <R, I, A>(item: Schema<R, I, A>): Schema<R, Chunk.Chunk<I>, Chunk.Chunk<A>> => {
  return declare(
    [item],
    (item) => chunkParse(ParseResult.decodeUnknown(array(item))),
    (item) => chunkParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `Chunk<${Format.format(item)}>`,
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
export const chunk = <R, I, A>(item: Schema<R, I, A>): Schema<R, ReadonlyArray<I>, Chunk.Chunk<A>> =>
  transform(
    array(item),
    chunkFromSelf(to(item)),
    (as) => as.length === 0 ? Chunk.empty() : Chunk.fromIterable(as),
    Chunk.toReadonlyArray
  )

const toData = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(a: A): Data.Data<A> =>
  Array.isArray(a) ? Data.array(a) : Data.struct(a)

const dataArbitrary = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Arbitrary<A>
): Arbitrary<Data.Data<A>> =>
(fc) => item(fc).map(toData)

const dataPretty = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Pretty.Pretty<A>
): Pretty.Pretty<Data.Data<A>> =>
(d) => `Data(${item(d)})`

const dataParse = <R, A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  decodeUnknown: ParseResult.DecodeUnknown<R, A>
): ParseResult.DeclarationDecodeUnknown<R, Data.Data<A>> =>
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
  item: Schema<R, I, A>
): Schema<R, Data.Data<I>, Data.Data<A>> => {
  return declare(
    [item],
    (item) => dataParse(ParseResult.decodeUnknown(item)),
    (item) => dataParse(ParseResult.encodeUnknown(item)),
    {
      description: `Data<${Format.format(item)}>`,
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
  item: Schema<R, I, A>
): Schema<R, I, Data.Data<A>> =>
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
export interface Class<R, I, A, C, Self, Inherited> extends Schema<R, I, Self> {
  new(
    ...args: [R] extends [never] ? [
        props: Equals<C, {}> extends true ? void | {} : C,
        disableValidation?: boolean | undefined
      ] :
      [
        props: Equals<C, {}> extends true ? void | {} : C,
        disableValidation: true
      ]
  ): A & Omit<Inherited, keyof A>

  readonly struct: Schema<R, I, A>

  readonly extend: <Extended>() => <FieldsB extends StructFields>(
    fields: FieldsB
  ) => [unknown] extends [Extended] ? MissingSelfGeneric<"Base.extend">
    : Class<
      R | Schema.Context<FieldsB[keyof FieldsB]>,
      Simplify<Omit<I, keyof FieldsB> & FromStruct<FieldsB>>,
      Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      Simplify<Omit<C, keyof FieldsB> & ToStruct<FieldsB>>,
      Extended,
      Self
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
    ) => Effect.Effect<R2, ParseResult.ParseIssue, Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
    encode: (
      input: Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<R3, ParseResult.ParseIssue, A>
  ) => [unknown] extends [Transformed] ? MissingSelfGeneric<"Base.transform">
    : Class<
      R | Schema.Context<FieldsB[keyof FieldsB]> | R2 | R3,
      I,
      Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      Simplify<Omit<C, keyof FieldsB> & ToStruct<FieldsB>>,
      Transformed,
      Self
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
    ) => Effect.Effect<R2, ParseResult.ParseIssue, Omit<I, keyof FieldsB> & FromStruct<FieldsB>>,
    encode: (
      input: Simplify<Omit<I, keyof FieldsB> & FromStruct<FieldsB>>,
      options: ParseOptions,
      ast: AST.Transform
    ) => Effect.Effect<R3, ParseResult.ParseIssue, I>
  ) => [unknown] extends [Transformed] ? MissingSelfGeneric<"Base.transformFrom">
    : Class<
      R | Schema.Context<FieldsB[keyof FieldsB]> | R2 | R3,
      I,
      Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      Simplify<Omit<C, keyof FieldsB> & ToStruct<FieldsB>>,
      Transformed,
      Self
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
    Schema.Context<Fields[keyof Fields]>,
    Simplify<FromStruct<Fields>>,
    Simplify<ToStruct<Fields>>,
    Simplify<ToStruct<Fields>>,
    Self,
    Data.Case
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
    Schema.Context<Fields[keyof Fields]>,
    Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
    Simplify<{ readonly _tag: Tag } & ToStruct<Fields>>,
    Simplify<ToStruct<Fields>>,
    Self,
    Data.Case
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
    Schema.Context<Fields[keyof Fields]>,
    Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
    Simplify<{ readonly _tag: Tag } & ToStruct<Fields>>,
    Simplify<ToStruct<Fields>>,
    Self,
    Effect.Effect<never, Self, never> & globalThis.Error
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
  extends Request.Request<E, A>, Serializable.SerializableWithResult<R, IS, S, RR, IE, E, IA, A>
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
<Tag extends string, Fields extends StructFields, ER, EI, EA, AR, AI, AA>(
  tag: Tag,
  Failure: Schema<ER, EI, EA>,
  Success: Schema<AR, AI, AA>,
  fields: Fields
): [unknown] extends [Self] ? MissingSelfGeneric<"TaggedRequest", `"Tag", SuccessSchema, FailureSchema, `>
  : Class<
    Schema.Context<Fields[keyof Fields]>,
    Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
    Simplify<{ readonly _tag: Tag } & ToStruct<Fields>>,
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

const makeClass = <R, I, A>(
  selfSchema: Schema<R, I, A>,
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
      const declaration: Schema<never, any, any> = declare((input): input is any => input instanceof this, {
        identifier: this.name,
        title: this.name,
        description: `an instance of ${this.name}`,
        pretty: () => (self: any) => `${self.constructor.name}(${pretty(self)})`,
        arbitrary: () => (fc: any) => arb(fc).map((props: any) => new this(props))
      })
      const transformation = transform(
        selfSchema,
        declaration,
        (input) => new this(input, true),
        (input) => ({ ...input })
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

const FiberIdFrom: Schema<never, FiberIdFrom, FiberIdFrom> = union(
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
export const FiberIdFromSelf: Schema<never, FiberId.FiberId, FiberId.FiberId> = declare(
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

const _FiberId: Schema<never, FiberIdFrom, FiberId.FiberId> = transform(
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

const causeDieFrom = <R>(defect: Schema<R, unknown, unknown>) =>
  struct({
    _tag: literal("Die"),
    defect
  })

const CauseEmptyFrom = struct({
  _tag: literal("Empty")
})

const causeFailFrom = <R, EI, E>(error: Schema<R, EI, E>) =>
  struct({
    _tag: literal("Fail"),
    error
  })

const CauseInterruptFrom = struct({
  _tag: literal("Interrupt"),
  fiberId: FiberIdFrom
})

const causeParallelFrom = <R, EI, E>(causeFrom: Schema<R, CauseFrom<EI>, CauseFrom<E>>) =>
  struct({
    _tag: literal("Parallel"),
    left: causeFrom,
    right: causeFrom
  })

const causeSequentialFrom = <R, EI, E>(causeFrom: Schema<R, CauseFrom<EI>, CauseFrom<E>>) =>
  struct({
    _tag: literal("Sequential"),
    left: causeFrom,
    right: causeFrom
  })

const causeFrom = <R1, EI, E, R2>(
  error: Schema<R1, EI, E>,
  defect: Schema<R2, unknown, unknown>
): Schema<R1 | R2, CauseFrom<EI>, CauseFrom<E>> => {
  const recur = suspend(() => out)
  const out: Schema<R1 | R2, CauseFrom<EI>, CauseFrom<E>> = union(
    causeDieFrom(defect),
    CauseEmptyFrom,
    causeFailFrom(error),
    CauseInterruptFrom,
    causeParallelFrom(recur),
    causeSequentialFrom(recur)
  ).pipe(description(`CauseFrom<${Format.format(error)}>`))
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
  decodeUnknown: ParseResult.DecodeUnknown<R, CauseFrom<A>>
): ParseResult.DeclarationDecodeUnknown<R, Cause.Cause<A>> =>
(u, options, ast) =>
  Cause.isCause(u) ?
    ParseResult.map(decodeUnknown(causeEncode(u), options), causeDecode)
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category Cause transformations
 * @since 1.0.0
 */
export const causeFromSelf = <R1, I, A, R2 = never>(
  error: Schema<R1, I, A>,
  defect: Schema<R2, unknown, unknown> = unknown
): Schema<R1 | R2, Cause.Cause<I>, Cause.Cause<A>> => {
  return declare(
    [error, defect],
    (error, defect) => causeParse(ParseResult.decodeUnknown(causeFrom(error, defect))),
    (error, defect) => causeParse(ParseResult.encodeUnknown(causeFrom(error, defect))),
    {
      description: `Cause<${Format.format(error)}>`,
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

const causeDefectPretty: Schema<never, unknown, unknown> = transform(
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
export const cause = <R1, EI, E, R2 = never>(
  error: Schema<R1, EI, E>,
  defect: Schema<R2, unknown, unknown> = causeDefectPretty
): Schema<R1 | R2, CauseFrom<EI>, Cause.Cause<E>> =>
  transform(
    causeFrom(error, defect),
    causeFromSelf(to(error), to(defect)),
    causeDecode,
    causeEncode
  )

/**
 * @category Exit utils
 * @since 1.0.0
 */
export type ExitFrom<E, A> =
  | {
    readonly _tag: "Failure"
    readonly cause: CauseFrom<E>
  }
  | {
    readonly _tag: "Success"
    readonly value: A
  }

const exitFailureFrom = <R1, EI, E, R2>(
  error: Schema<R1, EI, E>,
  defect: Schema<R2, unknown, unknown>
) =>
  struct({
    _tag: literal("Failure"),
    cause: causeFrom(error, defect)
  })

const exitSuccessFrom = <R, AI, A>(
  value: Schema<R, AI, A>
) =>
  struct({
    _tag: literal("Success"),
    value
  })

const exitFrom = <R1, EI, E, R2, AI, A, R3>(
  error: Schema<R1, EI, E>,
  value: Schema<R2, AI, A>,
  defect: Schema<R3, unknown, unknown>
): Schema<R1 | R2 | R3, ExitFrom<EI, AI>, ExitFrom<E, A>> =>
  union(
    exitFailureFrom(error, defect),
    exitSuccessFrom(value)
  )

const exitDecode = <E, A>(input: ExitFrom<E, A>): Exit.Exit<E, A> => {
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
): Arbitrary<Exit.Exit<E, A>> => {
  const arb = arbitrary.make(
    exitFrom(schemaFromArbitrary(error), schemaFromArbitrary(value), schemaFromArbitrary(defect))
  )
  return (fc) => arb(fc).map(exitDecode)
}

const exitPretty = <E, A>(error: Pretty.Pretty<E>, value: Pretty.Pretty<A>): Pretty.Pretty<Exit.Exit<E, A>> => (exit) =>
  exit._tag === "Failure"
    ? `Exit.failCause(${causePretty(error)(exit.cause)})`
    : `Exit.succeed(${value(exit.value)})`

const exitParse = <RE, E, RA, A>(
  decodeUnknownCause: ParseResult.DecodeUnknown<RE, Cause.Cause<E>>,
  decodeUnknownValue: ParseResult.DecodeUnknown<RA, A>
): ParseResult.DeclarationDecodeUnknown<RE | RA, Exit.Exit<E, A>> =>
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
export const exitFromSelf = <RE, IE, E, RA, IA, A>(
  error: Schema<RE, IE, E>,
  value: Schema<RA, IA, A>,
  defect: Schema<never, unknown, unknown> = unknown
): Schema<RE | RA, Exit.Exit<IE, IA>, Exit.Exit<E, A>> =>
  declare(
    [error, value, defect],
    (error, value, defect) =>
      exitParse(ParseResult.decodeUnknown(causeFromSelf(error, defect)), ParseResult.decodeUnknown(value)),
    (error, value, defect) =>
      exitParse(ParseResult.encodeUnknown(causeFromSelf(error, defect)), ParseResult.encodeUnknown(value)),
    {
      description: `Exit<${Format.format(error)}, ${Format.format(value)}>`,
      pretty: exitPretty,
      arbitrary: exitArbitrary,
      equivalence: () => Equal.equals
    }
  )

/**
 * @category Exit transformations
 * @since 1.0.0
 */
export const exit = <R1, IE, E, R2, IA, A, R3 = never>(
  error: Schema<R1, IE, E>,
  value: Schema<R2, IA, A>,
  defect: Schema<R3, unknown, unknown> = causeDefectPretty
): Schema<R1 | R2 | R3, ExitFrom<IE, IA>, Exit.Exit<E, A>> =>
  transform(
    exitFrom(error, value, defect),
    exitFromSelf(to(error), to(value), to(defect)),
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
  decodeUnknown: ParseResult.DecodeUnknown<R, ReadonlyArray<A>>
): ParseResult.DeclarationDecodeUnknown<R, HashSet.HashSet<A>> =>
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
export const hashSetFromSelf = <R, I, A>(
  item: Schema<R, I, A>
): Schema<R, HashSet.HashSet<I>, HashSet.HashSet<A>> => {
  return declare(
    [item],
    (item) => hashSetParse(ParseResult.decodeUnknown(array(item))),
    (item) => hashSetParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `HashSet<${Format.format(item)}>`,
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
export const hashSet = <R, I, A>(item: Schema<R, I, A>): Schema<R, ReadonlyArray<I>, HashSet.HashSet<A>> =>
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
  decodeUnknown: ParseResult.DecodeUnknown<R, ReadonlyArray<readonly [K, V]>>
): ParseResult.DeclarationDecodeUnknown<R, HashMap.HashMap<K, V>> =>
(u, options, ast) =>
  HashMap.isHashMap(u) ?
    ParseResult.map(decodeUnknown(Array.from(u), options), (as): HashMap.HashMap<K, V> => HashMap.fromIterable(as))
    : ParseResult.fail(ParseResult.type(ast, u))

/**
 * @category HashMap transformations
 * @since 1.0.0
 */
export const hashMapFromSelf = <RK, IK, K, RV, IV, V>(
  key: Schema<RK, IK, K>,
  value: Schema<RV, IV, V>
): Schema<RK | RV, HashMap.HashMap<IK, IV>, HashMap.HashMap<K, V>> => {
  return declare(
    [key, value],
    (key, value) => hashMapParse(ParseResult.decodeUnknown(array(tuple(key, value)))),
    (key, value) => hashMapParse(ParseResult.encodeUnknown(array(tuple(key, value)))),
    {
      description: `HashMap<${Format.format(key)}, ${Format.format(value)}>`,
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
export const hashMap = <R1, IK, K, R2, IV, V>(
  key: Schema<R1, IK, K>,
  value: Schema<R2, IV, V>
): Schema<R1 | R2, ReadonlyArray<readonly [IK, IV]>, HashMap.HashMap<K, V>> =>
  transform(
    array(tuple(key, value)),
    hashMapFromSelf(to(key), to(value)),
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
  decodeUnknown: ParseResult.DecodeUnknown<R, ReadonlyArray<A>>
): ParseResult.DeclarationDecodeUnknown<R, List.List<A>> =>
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
export const listFromSelf = <R, I, A>(
  item: Schema<R, I, A>
): Schema<R, List.List<I>, List.List<A>> => {
  return declare(
    [item],
    (item) => listParse(ParseResult.decodeUnknown(array(item))),
    (item) => listParse(ParseResult.encodeUnknown(array(item))),
    {
      description: `List<${Format.format(item)}>`,
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
export const list = <R, I, A>(item: Schema<R, I, A>): Schema<R, ReadonlyArray<I>, List.List<A>> =>
  transform(
    array(item),
    listFromSelf(to(item)),
    (as) => List.fromIterable(as),
    (set) => Array.from(set)
  )

const schemaFromArbitrary = <A>(value: Arbitrary<A>): Schema<never, A> =>
  suspend<never, A>(() => any).pipe(annotations({
    [hooks.ArbitraryHookId]: () => value
  }))
