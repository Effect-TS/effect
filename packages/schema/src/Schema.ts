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
import type * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Encoding from "effect/Encoding"
import * as Equal from "effect/Equal"
import * as Equivalence from "effect/Equivalence"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import { dual, identity } from "effect/Function"
import * as N from "effect/Number"
import * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Request from "effect/Request"
import * as Secret from "effect/Secret"
import * as S from "effect/String"
import type { Equals, Mutable, Simplify } from "effect/Types"
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
export interface Schema<From, To = From> extends Schema.Variance<From, To>, Pipeable {
  readonly ast: AST.AST
}

/**
 * @since 1.0.0
 */
export declare module Schema {
  /**
   * @since 1.0.0
   */
  export interface Variance<From, To> {
    readonly [TypeId]: {
      readonly From: (_: From) => From
      readonly To: (_: To) => To
    }
  }

  /**
   * @since 1.0.0
   */
  export type From<S extends { readonly [TypeId]: { readonly From: (..._: any) => any } }> =
    Parameters<S[TypeId]["From"]>[0]

  /**
   * @since 1.0.0
   */
  export type To<S extends { readonly [TypeId]: { readonly To: (..._: any) => any } }> = Parameters<
    S[TypeId]["To"]
  >[0]

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
export const from = <I, A>(schema: Schema<I, A>): Schema<I> => make(AST.from(schema.ast))

/**
 * @since 1.0.0
 */
export const to = <I, A>(schema: Schema<I, A>): Schema<A> => make(AST.to(schema.ast))

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
  decode,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeEither,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeOption,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodePromise,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeSync,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encode,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeEither,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeOption,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodePromise,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeSync,
  /**
   * @category validation
   * @since 1.0.0
   */
  is,
  /**
   * @category parsing
   * @since 1.0.0
   */
  parse,
  /**
   * @category parsing
   * @since 1.0.0
   */
  parseEither,
  /**
   * @category parsing
   * @since 1.0.0
   */
  parseOption,
  /**
   * @category parsing
   * @since 1.0.0
   */
  parsePromise,
  /**
   * @category parsing
   * @since 1.0.0
   */
  parseSync,
  /**
   * @category validation
   * @since 1.0.0
   */
  validate,
  /**
   * @category validation
   * @since 1.0.0
   */
  validateEither,
  /**
   * @category validation
   * @since 1.0.0
   */
  validateOption,
  /**
   * @category validation
   * @since 1.0.0
   */
  validatePromise,
  /**
   * @category validation
   * @since 1.0.0
   */
  validateSync
} from "./Parser.js"
/* c8 ignore end */

/**
 * Tests if a value is a `Schema`.
 *
 * @category guards
 * @since 1.0.0
 */
export const isSchema = (u: unknown): u is Schema<unknown, unknown> =>
  Predicate.isObject(u) && TypeId in u && "ast" in u

const variance = {
  From: (_: any) => _,
  To: (_: any) => _
}

class SchemaImpl<From, To> implements Schema<From, To> {
  readonly [TypeId] = variance
  constructor(readonly ast: AST.AST) {}
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <I, A>(ast: AST.AST): Schema<I, A> => new SchemaImpl(ast)

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
export const templateLiteral = <T extends [Schema<any>, ...Array<Schema<any>>]>(
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
      throw new Error(`templateLiteral: unsupported template literal span ${ast._tag}`)
  }
}

/**
  @category constructors
  @since 1.0.0
*/
export const declare = (
  typeParameters: ReadonlyArray<Schema<any>>,
  type: Schema<any>,
  decode: (
    isDecoding: boolean,
    ...typeParameters: ReadonlyArray<Schema<any>>
  ) => (input: any, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<any>,
  annotations?: AST.Annotations
): Schema<any> =>
  make(AST.createDeclaration(
    typeParameters.map((tp) => tp.ast),
    type.ast,
    (isDecoding, ...typeParameters) => decode(isDecoding, ...typeParameters.map(make)),
    annotations
  ))

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
<I, A extends Brand.Brand.Unbranded<C>>(self: Schema<I, A>): Schema<I, A & C> => {
  return make(AST.createRefinement(
    self.ast,
    (a: A, _: ParseOptions, ast: AST.AST): Option.Option<ParseResult.ParseError> => {
      const e = constructor.either(a)
      return Either.isLeft(e) ?
        Option.some(
          ParseResult.parseError([
            ParseResult.type(ast, a, e.left.map((v) => v.message).join(", "))
          ])
        ) :
        Option.none()
    },
    toAnnotations({ typeId: { id: BrandTypeId, params: { constructor } }, ...options })
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
  options?: FilterAnnotations<InstanceType<A>>
): Schema<InstanceType<A>, InstanceType<A>> => {
  return declare(
    [],
    unknown,
    () => (u, _, ast) =>
      u instanceof constructor ?
        ParseResult.succeed(u)
        : ParseResult.fail(ParseResult.type(ast, u)),
    {
      [AST.TypeAnnotationId]: InstanceOfTypeId,
      [InstanceOfTypeId]: { constructor },
      [AST.DescriptionAnnotationId]: `an instance of ${constructor.name}`,
      ...toAnnotations(options)
    }
  )
}

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
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Schema<Schema.From<Members[number]>, Schema.To<Members[number]>> =>
  make(AST.createUnion(members.map((m) => m.ast)))

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullable = <From, To>(self: Schema<From, To>): Schema<From | null, To | null> =>
  union(_null, self)

/**
 * @category combinators
 * @since 1.0.0
 */
export const orUndefined = <From, To>(
  self: Schema<From, To>
): Schema<From | undefined, To | undefined> => union(_undefined, self)

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullish = <From, To>(
  self: Schema<From, To>
): Schema<From | null | undefined, To | null | undefined> => union(_null, _undefined, self)

/**
 * @category combinators
 * @since 1.0.0
 */
export const keyof = <I, A>(schema: Schema<I, A>): Schema<keyof A> => make(AST.keyof(schema.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const tuple = <Elements extends ReadonlyArray<Schema<any>>>(
  ...elements: Elements
): Schema<
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
  <IR, R>(rest: Schema<IR, R>) =>
  <I extends ReadonlyArray<any>, A extends ReadonlyArray<any>>(
    self: Schema<I, A>
  ): Schema<readonly [...I, ...Array<IR>], readonly [...A, ...Array<R>]> => {
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
  <IE, E>(element: Schema<IE, E>) =>
  <I extends ReadonlyArray<any>, A extends ReadonlyArray<any>>(
    self: Schema<I, A>
  ): Schema<readonly [...I, IE], readonly [...A, E]> => {
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
  <IE, E>(element: Schema<IE, E>) =>
  <I extends ReadonlyArray<any>, A extends ReadonlyArray<any>>(
    self: Schema<I, A>
  ): Schema<readonly [...I, IE?], readonly [...A, E?]> => {
    if (AST.isTuple(self.ast)) {
      return make(AST.appendElement(self.ast, AST.createElement(element.ast, true)))
    }
    throw new Error("`optionalElement` is not supported on this schema")
  }

/**
 * @category combinators
 * @since 1.0.0
 */
export const array = <I, A>(item: Schema<I, A>): Schema<ReadonlyArray<I>, ReadonlyArray<A>> =>
  make(AST.createTuple([], Option.some([item.ast]), true))

/**
 * @category combinators
 * @since 1.0.0
 */
export const nonEmptyArray = <I, A>(
  item: Schema<I, A>
): Schema<readonly [I, ...Array<I>], readonly [A, ...Array<A>]> => tuple(item).pipe(rest(item))

/**
 * @since 1.0.0
 */
export interface PropertySignature<From, FromIsOptional, To, ToIsOptional>
  extends Schema.Variance<From, To>, Pipeable
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
export class PropertySignatureImpl<From, FromIsOptional, To, ToIsOptional> {
  readonly [TypeId]: {
    readonly From: (_: From) => From
    readonly To: (_: To) => To
  } = variance
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
export const propertySignatureAnnotations =
  (annotations: DocAnnotations) =>
  <S extends StructFields[PropertyKey]>(
    self: S
  ): S extends Schema<infer I, infer A> ? PropertySignature<I, false, A, false> : S => {
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
export const optionalToRequired = <I, A, B>(
  from: Schema<I, A>,
  to: Schema<B>,
  decode: (o: Option.Option<A>) => B, // `none` here means: the value is missing in the input
  encode: (b: B) => Option.Option<A>, // `none` here means: the value will be missing in the output
  options?: DocAnnotations
): PropertySignature<I, true, B, false> =>
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
  <I, A>(
    schema: Schema<I, A>,
    options: { readonly exact: true; readonly default: () => A; readonly nullable: true }
  ): PropertySignature<I | null, true, A, false>
  <I, A>(
    schema: Schema<I, A>,
    options: { readonly exact: true; readonly default: () => A }
  ): PropertySignature<I, true, A, false>
  <I, A>(
    schema: Schema<I, A>,
    options: { readonly exact: true; readonly nullable: true; readonly as: "Option" }
  ): PropertySignature<I | null, true, Option.Option<A>, false>
  <I, A>(
    schema: Schema<I, A>,
    options: { readonly exact: true; readonly as: "Option" }
  ): PropertySignature<I, true, Option.Option<A>, false>
  <I, A>(
    schema: Schema<I, A>,
    options: { readonly exact: true }
  ): PropertySignature<I, true, A, true>
  <I, A>(
    schema: Schema<I, A>,
    options: { readonly default: () => A; readonly nullable: true }
  ): PropertySignature<I | null | undefined, true, A, false>
  <I, A>(
    schema: Schema<I, A>,
    options: { readonly default: () => A }
  ): PropertySignature<I | undefined, true, A, false>
  <I, A>(
    schema: Schema<I, A>,
    options: { readonly nullable: true; readonly as: "Option" }
  ): PropertySignature<I | undefined | null, true, Option.Option<A>, false>
  <I, A>(
    schema: Schema<I, A>,
    options: { readonly as: "Option" }
  ): PropertySignature<I | undefined, true, Option.Option<A>, false>
  <I, A>(schema: Schema<I, A>): PropertySignature<I | undefined, true, A | undefined, true>
} = <I, A>(
  schema: Schema<I, A>,
  options?: {
    readonly exact?: true
    readonly default?: () => A
    readonly nullable?: true
    readonly as?: "Option"
  }
): PropertySignature<any, any, any, any> => {
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
    | PropertySignature<any, true, any, boolean>
    | PropertySignature<never, true, never, boolean> ? K
    : never
}[keyof Fields]

/**
 * @since 1.0.0
 */
export type ToOptionalKeys<Fields> = {
  [K in keyof Fields]: Fields[K] extends
    | PropertySignature<any, boolean, any, true>
    | PropertySignature<never, boolean, never, true> ? K
    : never
}[keyof Fields]

/**
 * @since 1.0.0
 */
export type StructFields = Record<
  PropertyKey,
  | Schema<any, any>
  | Schema<never, never>
  | PropertySignature<any, boolean, any, boolean>
  | PropertySignature<never, boolean, never, boolean>
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
): Schema<Simplify<FromStruct<Fields>>, Simplify<ToStruct<Fields>>> => {
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
 * @category combinators
 * @since 1.0.0
 */
export const pick =
  <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  <I extends { [K in keyof A]?: any }>(
    self: Schema<I, A>
  ): Schema<Simplify<Pick<I, Keys[number]>>, Simplify<Pick<A, Keys[number]>>> => {
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
 * @category combinators
 * @since 1.0.0
 */
export const omit =
  <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  <I extends { [K in keyof A]?: any }>(
    self: Schema<I, A>
  ): Schema<Simplify<Omit<I, Keys[number]>>, Simplify<Omit<A, Keys[number]>>> => {
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
 * @category model
 * @since 1.0.0
 */
export interface BrandSchema<From, To extends Brand.Brand<any>>
  extends Schema<From, To>, Brand.Brand.Constructor<To>
{}

const appendBrandAnnotation = <B extends string | symbol>(
  ast: AST.AST,
  brand: B,
  options?: DocAnnotations
): AST.AST => {
  if (AST.isTransform(ast)) {
    return AST.createTransform(
      ast.from,
      appendBrandAnnotation(ast.to, brand, options),
      ast.transformation,
      ast.annotations
    )
  }
  const annotations = toAnnotations(options)
  annotations[AST.BrandAnnotationId] = [...getBrands(ast), brand]
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
export const brand = <B extends string | symbol, A>(
  brand: B,
  options?: DocAnnotations
) =>
<I>(self: Schema<I, A>): BrandSchema<I, A & Brand.Brand<B>> => {
  const ast = appendBrandAnnotation(self.ast, brand, options)
  const schema = make(ast)
  const validateSync = Parser.validateSync(schema)
  const validateOption = Parser.validateOption(schema)
  const validateEither = Parser.validateEither(schema)
  const is = Parser.is(schema)
  const out: any = Object.assign((input: unknown) => validateSync(input), {
    [Brand.RefinedConstructorsTypeId]: Brand.RefinedConstructorsTypeId,
    [TypeId]: variance,
    ast,
    option: (input: unknown) => validateOption(input),
    either: (input: unknown) =>
      Either.mapLeft(
        validateEither(input),
        (e) =>
          ArrayFormatter.formatErrors(e.errors).map((err) => ({
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

const getBrands = (ast: AST.AST): Array<string> =>
  (ast.annotations[AST.BrandAnnotationId] as Array<string> | undefined) || []

/**
 * @category combinators
 * @since 1.0.0
 */
export const partial = <I, A>(
  self: Schema<I, A>
): Schema<Simplify<Partial<I>>, Simplify<Partial<A>>> => make(AST.partial(self.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const required = <I, A>(
  self: Schema<I, A>
): Schema<Simplify<Required<I>>, Simplify<Required<A>>> => make(AST.required(self.ast))

/**
 * Creates a new schema with shallow mutability applied to its properties.
 *
 * @param schema - The original schema to make properties mutable (shallowly).
 *
 * @category combinators
 * @since 1.0.0
 */
export const mutable = <I, A>(
  schema: Schema<I, A>
): Schema<Simplify<Mutable<I>>, Simplify<Mutable<A>>> => {
  const ast = AST.mutable(schema.ast)
  return ast === schema.ast ? schema as any : make(ast)
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const record = <IK extends string | symbol, AK extends IK, IV, AV>(
  key: Schema<IK, AK>,
  value: Schema<IV, AV>
): Schema<{ readonly [k in IK]: IV }, { readonly [k in AK]: AV }> =>
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
  <IB, B>(
    that: Schema<IB, B>
  ): <I, A>(self: Schema<I, A>) => Schema<Simplify<I & IB>, Simplify<A & B>>
  <I, A, IB, B>(self: Schema<I, A>, that: Schema<IB, B>): Schema<Simplify<I & IB>, Simplify<A & B>>
} = dual(
  2,
  <I, A, IB, B>(
    self: Schema<I, A>,
    that: Schema<IB, B>
  ): Schema<Simplify<I & IB>, Simplify<A & B>> =>
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
  <C, D>(bc: Schema<C, D>): <A, B>(ab: Schema<A, B>) => Schema<A, D>
  <A, B, C, D>(ab: Schema<A, B>, cd: Schema<C, D>): Schema<A, D>
} = dual(
  2,
  <A, B, C, D>(ab: Schema<A, B>, cd: Schema<C, D>): Schema<A, D> =>
    make(AST.compose(ab.ast, cd.ast))
)

/**
 * @category combinators
 * @since 1.0.0
 */
export const suspend = <I, A = I>(
  f: () => Schema<I, A>,
  annotations?: AST.Annotations
): Schema<I, A> => make(AST.createSuspend(() => f().ast, annotations))

/**
 * @category combinators
 * @since 1.0.0
 */
export function filter<A>(
  f: (a: A, options: ParseOptions, self: AST.AST) => Option.Option<ParseResult.ParseError>,
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A>
export function filter<C extends A, B extends A, A = C>(
  refinement: Predicate.Refinement<A, B>,
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, C>) => Schema<I, C & B>
export function filter<B extends A, A = B>(
  predicate: Predicate.Predicate<A>,
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, B>) => Schema<I, B>
export function filter<A>(
  predicate:
    | Predicate.Predicate<A>
    | ((a: A, options: ParseOptions, self: AST.AST) => Option.Option<ParseResult.ParseError>),
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> {
  return (self) =>
    make(AST.createRefinement(
      self.ast,
      (a: A, options, ast: AST.AST) => {
        const out = predicate(a, options, ast)
        if (Predicate.isBoolean(out)) {
          return out
            ? Option.none()
            : Option.some(ParseResult.parseError([ParseResult.type(ast, a)]))
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
  <C, D, B>(
    to: Schema<C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<C>,
    encode: (c: C, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<B>
  ): <A>(self: Schema<A, B>) => Schema<A, D>
  <C, D, B>(
    to: Schema<C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<unknown>,
    encode: (c: C, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<unknown>,
    options: { strict: false }
  ): <A>(self: Schema<A, B>) => Schema<A, D>
  <A, B, C, D>(
    from: Schema<A, B>,
    to: Schema<C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<C>,
    encode: (c: C, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<B>
  ): Schema<A, D>
  <A, B, C, D>(
    from: Schema<A, B>,
    to: Schema<C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<unknown>,
    encode: (c: C, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<unknown>,
    options: { strict: false }
  ): Schema<A, D>
} = dual((args) => isSchema(args[0]) && isSchema(args[1]), <A, B, C, D>(
  from: Schema<A, B>,
  to: Schema<C, D>,
  decode: (b: B, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<unknown>,
  encode: (c: C, options: ParseOptions, ast: AST.AST) => ParseResult.ParseResult<unknown>
): Schema<A, D> =>
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
  <C, D, B>(
    to: Schema<C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.AST) => C,
    encode: (c: C, options: ParseOptions, ast: AST.AST) => B
  ): <A>(self: Schema<A, B>) => Schema<A, D>
  <C, D, B>(
    to: Schema<C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.AST) => unknown,
    encode: (c: C, options: ParseOptions, ast: AST.AST) => unknown,
    options: { strict: false }
  ): <A>(self: Schema<A, B>) => Schema<A, D>
  <A, B, C, D>(
    from: Schema<A, B>,
    to: Schema<C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.AST) => C,
    encode: (c: C, options: ParseOptions, ast: AST.AST) => B
  ): Schema<A, D>
  <A, B, C, D>(
    from: Schema<A, B>,
    to: Schema<C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.AST) => unknown,
    encode: (c: C, options: ParseOptions, ast: AST.AST) => unknown,
    options: { strict: false }
  ): Schema<A, D>
} = dual(
  (args) => isSchema(args[0]) && isSchema(args[1]),
  <A, B, C, D>(
    from: Schema<A, B>,
    to: Schema<C, D>,
    decode: (b: B, options: ParseOptions, ast: AST.AST) => C,
    encode: (c: C, options: ParseOptions, ast: AST.AST) => B
  ): Schema<A, D> =>
    transformOrFail(
      from,
      to,
      (a, options, ast) => Either.right(decode(a, options, ast)),
      (b, options, ast) => Either.right(encode(b, options, ast))
    )
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
): Schema<From, To> => transform(literal(from), literal(to), () => to, () => from)

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
): Schema<A[number][0], A[number][1]> =>
  union(...pairs.map(([from, to]) => transformLiteral(from, to)))

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
    value: V
  ): <I, A extends object>(
    schema: Schema<I, A>
  ) => Schema<I, Simplify<A & { readonly [k in K]: V }>>
  <I, A, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
    schema: Schema<I, A>,
    key: K,
    value: V
  ): Schema<I, Simplify<A & { readonly [k in K]: V }>>
} = dual(3, <I, A, K extends PropertyKey, V extends AST.LiteralValue | symbol>(
  schema: Schema<I, A>,
  key: K,
  value: V
): Schema<I, Simplify<A & { readonly [k in K]: V }>> =>
  make(AST.createTransform(
    schema.ast,
    extend(
      to(schema),
      struct({ [key]: Predicate.isSymbol(value) ? uniqueSymbol(value) : literal(value) })
    ).ast,
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
  )))

const toAnnotations = <A>(
  options?: FilterAnnotations<A>
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
      out[typeId.id] = typeId.params
    } else {
      out[AST.TypeAnnotationId] = typeId
    }
  }
  const move = (from: keyof FilterAnnotations<A>, to: symbol) => {
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
export interface FilterAnnotations<A> extends DocAnnotations {
  readonly message?: AST.MessageAnnotation<A>
  readonly typeId?: AST.TypeAnnotation | { id: AST.TypeAnnotation; params: unknown }
  /**
   * Attaches a JSON Schema annotation to this refinement.
   *
   * If the schema is composed of more than one refinement, the corresponding annotations will be merged.
   */
  readonly jsonSchema?: AST.JSONSchemaAnnotation
  readonly arbitrary?: (...args: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
  readonly pretty?: (...args: ReadonlyArray<Pretty.Pretty<any>>) => Pretty.Pretty<any>
  readonly equivalence?: () => Equivalence.Equivalence<A>
}

/**
 * @category annotations
 * @since 1.0.0
 */
export const annotations =
  (annotations: AST.Annotations) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.mergeAnnotations(self.ast, annotations))

/**
 * @category annotations
 * @since 1.0.0
 */
export const message =
  (message: AST.MessageAnnotation<unknown>) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.MessageAnnotationId, message))

/**
 * @category annotations
 * @since 1.0.0
 */
export const identifier =
  (identifier: AST.IdentifierAnnotation) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.IdentifierAnnotationId, identifier))

/**
 * @category annotations
 * @since 1.0.0
 */
export const title = (title: AST.TitleAnnotation) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
  make(AST.setAnnotation(self.ast, AST.TitleAnnotationId, title))

/**
 * @category annotations
 * @since 1.0.0
 */
export const description =
  (description: AST.DescriptionAnnotation) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.DescriptionAnnotationId, description))

/**
 * @category annotations
 * @since 1.0.0
 */
export const examples =
  (examples: AST.ExamplesAnnotation) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.ExamplesAnnotationId, examples))

const _default = <A>(value: A) => <I>(self: Schema<I, A>): Schema<I, A> =>
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
  (documentation: AST.DocumentationAnnotation) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.DocumentationAnnotationId, documentation))

/**
 * Attaches a JSON Schema annotation to a schema that represents a refinement.
 *
 * If the schema is composed of more than one refinement, the corresponding annotations will be merged.
 *
 * @category annotations
 * @since 1.0.0
 */
export const jsonSchema =
  (jsonSchema: AST.JSONSchemaAnnotation) => <I, A>(self: Schema<I, A>): Schema<I, A> => {
    if (AST.isRefinement(self.ast)) {
      return make(AST.setAnnotation(self.ast, AST.JSONSchemaAnnotationId, jsonSchema))
    }
    throw new Error("JSON Schema annotations can be applied exclusively to refinements")
  }

/**
 * @category annotations
 * @since 1.0.0
 */
export const equivalence =
  <A>(equivalence: Equivalence.Equivalence<A>) => <I>(self: Schema<I, A>): Schema<I, A> =>
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
  ): <I>(self: Schema<I, A>) => Schema<I, Simplify<Rename<A, M>>>
  <
    I,
    A,
    const M extends
      & { readonly [K in keyof A]?: PropertyKey }
      & { readonly [K in Exclude<keyof M, keyof A>]: never }
  >(
    self: Schema<I, A>,
    mapping: M
  ): Schema<I, Simplify<Rename<A, M>>>
} = dual(
  2,
  <
    I,
    A,
    const M extends
      & { readonly [K in keyof A]?: PropertyKey }
      & { readonly [K in Exclude<keyof M, keyof A>]: never }
  >(
    self: Schema<I, A>,
    mapping: M
  ): Schema<I, Simplify<Rename<A, M>>> => {
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
  <A extends string>(options?: FilterAnnotations<A>) => <I>(self: Schema<I, A>): Schema<I, A> =>
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
<I>(self: Schema<I, A>): Schema<I, A> =>
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
<I>(self: Schema<I, A>): Schema<I, A> =>
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
<I>(self: Schema<I, A>): Schema<I, A> => {
  const pattern = regex.source
  return self.pipe(
    filter(
      (a): a is A => {
        // The following line ensures that `lastIndex` is reset to `0` in case the user has specified the `g` flag
        regex.lastIndex = 0
        return regex.test(a)
      },
      {
        typeId: { id: PatternTypeId, params: { regex } },
        description: `a string matching the pattern ${pattern}`,
        jsonSchema: { pattern },
        arbitrary: (): Arbitrary<string> => (fc) => fc.stringMatching(regex),
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter(
      (a): a is A => a.startsWith(startsWith),
      {
        typeId: { id: StartsWithTypeId, params: { startsWith } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter(
      (a): a is A => a.endsWith(endsWith),
      {
        typeId: { id: EndsWithTypeId, params: { endsWith } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter(
      (a): a is A => a.includes(searchString),
      {
        typeId: { id: IncludesTypeId, params: { includes: searchString } },
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
  <A extends string>(options?: FilterAnnotations<A>) => <I>(self: Schema<I, A>): Schema<I, A> =>
    self.pipe(
      filter((a): a is A => a === a.toLowerCase(), {
        typeId: LowercasedTypeId,
        description: "a lowercase string",
        ...options
      })
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
  <A extends string>(options?: FilterAnnotations<A>) => <I>(self: Schema<I, A>): Schema<I, A> =>
    self.pipe(
      filter((a): a is A => a === a.toUpperCase(), {
        typeId: UppercasedTypeId,
        description: "an uppercase string",
        ...options
      })
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => a.length === length, {
      typeId: LengthTypeId,
      description: length === 1 ? `a character` : `a string ${length} character(s) long`,
      jsonSchema: { minLength: length, maxLength: length },
      ...options
    })
  )

/**
 * @category string filters
 * @since 1.0.0
 */
export const nonEmpty = <A extends string>(
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> =>
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
  string.pipe(lowercased()),
  (s) => s.toLowerCase(),
  identity
)

/**
 * This schema converts a string to uppercase.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Uppercase: Schema<string> = transform(
  string,
  string.pipe(uppercased()),
  (s) => s.toUpperCase(),
  identity
)

/**
 * This schema allows removing whitespaces from the beginning and end of a string.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Trim: Schema<string> = transform(
  string,
  string.pipe(trimmed()),
  (s) => s.trim(),
  identity
)

/**
 * Returns a achema that allows splitting a string into an array of strings.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const split = (separator: string): Schema<string, ReadonlyArray<string>> =>
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

/**
 * The `parseJson` combinator provides a method to convert JSON strings into the `unknown` type using the underlying
 * functionality of `JSON.parse`. It also utilizes `JSON.stringify` for encoding.
 *
 * You can optionally provide a `ParseJsonOptions` to configure both `JSON.parse` and `JSON.stringify` executions.
 *
 * Optionally, you can pass a schema `Schema<I, A>` to obtain an `A` type instead of `unknown`.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 *
 * assert.deepStrictEqual(S.parseSync(S.parseJson())(`{"a":"1"}`), { a: "1" })
 * assert.deepStrictEqual(S.parseSync(S.parseJson(S.struct({ a: S.NumberFromString })))(`{"a":"1"}`), { a: 1 })
 *
 * @category string transformations
 * @since 1.0.0
 */
export const parseJson: {
  <I, A>(schema: Schema<I, A>, options?: ParseJsonOptions): Schema<string, A>
  (options?: ParseJsonOptions): Schema<string, unknown>
} = <I, A>(schema?: Schema<I, A> | ParseJsonOptions, o?: ParseJsonOptions) => {
  if (isSchema(schema)) {
    return compose(parseJson(o), schema)
  }
  const options: ParseJsonOptions | undefined = schema as any
  return transformOrFail(
    string,
    unknown,
    (s, _, ast) =>
      ParseResult.try({
        try: () => JSON.parse(s, options?.reviver),
        catch: (e: any) => ParseResult.parseError([ParseResult.type(ast, s, e.message)])
      }),
    (u, _, ast) =>
      ParseResult.try({
        try: () => JSON.stringify(u, options?.replacer, options?.space),
        catch: (e: any) => ParseResult.parseError([ParseResult.type(ast, u, e.message)])
      })
  )
}

/**
 * @category string constructors
 * @since 1.0.0
 */
export const NonEmpty: Schema<string> = string.pipe(nonEmpty())

/**
 * @category string constructors
 * @since 1.0.0
 */
export const Trimmed: Schema<string> = string.pipe(trimmed())

/**
 * @category type id
 * @since 1.0.0
 */
export const UUIDTypeId = Symbol.for("@effect/schema/TypeId/UUID")

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

/**
 * @category string constructors
 * @since 1.0.0
 */
export const UUID: Schema<string> = string.pipe(
  pattern(uuidRegex, {
    typeId: UUIDTypeId,
    title: "UUID",
    description: "a UUID",
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
 * @category string constructors
 * @since 1.0.0
 */
export const ULID: Schema<string> = string.pipe(
  pattern(ulidRegex, {
    typeId: ULIDTypeId,
    title: "ULID",
    description: "a ULID",
    arbitrary: (): Arbitrary<string> => (fc) => fc.ulid()
  })
)

/**
 * @category type id
 * @since 1.0.0
 */
export const FiniteTypeId = Symbol.for("@effect/schema/TypeId/Finite")

/**
 * @category number filters
 * @since 1.0.0
 */
export const finite =
  <A extends number>(options?: FilterAnnotations<A>) => <I>(self: Schema<I, A>): Schema<I, A> =>
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
 * @category number filters
 * @since 1.0.0
 */
export const greaterThan = <A extends number>(
  min: number,
  options?: FilterAnnotations<A>
) =>
<I>(self: Schema<I, A>): Schema<I, A> =>
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
 * @category number filters
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = <A extends number>(
  min: number,
  options?: FilterAnnotations<A>
) =>
<I>(self: Schema<I, A>): Schema<I, A> =>
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
<I>(self: Schema<I, A>): Schema<I, A> =>
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
  <A extends number>(options?: FilterAnnotations<A>) => <I>(self: Schema<I, A>): Schema<I, A> =>
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
 * @category number filters
 * @since 1.0.0
 */
export const lessThan =
  <A extends number>(max: number, options?: FilterAnnotations<A>) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
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
 * @category number filters
 * @since 1.0.0
 */
export const lessThanOrEqualTo = <A extends number>(
  max: number,
  options?: FilterAnnotations<A>
) =>
<I>(self: Schema<I, A>): Schema<I, A> =>
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
 * @category number filters
 * @since 1.0.0
 */
export const between = <A extends number>(
  min: number,
  max: number,
  options?: FilterAnnotations<A>
) =>
<I>(self: Schema<I, A>): Schema<I, A> =>
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
  <A extends number>(options?: FilterAnnotations<A>) => <I>(self: Schema<I, A>): Schema<I, A> =>
    self.pipe(
      filter((a): a is A => !Number.isNaN(a), {
        typeId: NonNaNTypeId,
        description: "a number NaN excluded",
        ...options
      })
    )

/**
 * @category number filters
 * @since 1.0.0
 */
export const positive = <A extends number>(
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> => greaterThan(0, options)

/**
 * @category number filters
 * @since 1.0.0
 */
export const negative = <A extends number>(
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> => lessThan(0, options)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonPositive = <A extends number>(
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> => lessThanOrEqualTo(0, options)

/**
 * @category number filters
 * @since 1.0.0
 */
export const nonNegative = <A extends number>(
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> => greaterThanOrEqualTo(0, options)

/**
 * Clamps a number between a minimum and a maximum value.
 *
 * @category number transformations
 * @since 1.0.0
 */
export const clamp =
  (minimum: number, maximum: number) => <I, A extends number>(self: Schema<I, A>): Schema<I, A> =>
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
export const NumberFromString: Schema<string, number> = transformOrFail(
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
)

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Finite: Schema<number> = number.pipe(finite())

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Int: Schema<number> = number.pipe(int())

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonNaN: Schema<number> = number.pipe(nonNaN())

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Positive: Schema<number> = number.pipe(positive())

/**
 * @category number constructors
 * @since 1.0.0
 */
export const Negative: Schema<number> = number.pipe(negative())

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonPositive: Schema<number> = number.pipe(nonPositive())

/**
 * @category number constructors
 * @since 1.0.0
 */
export const NonNegative: Schema<number> = number.pipe(nonNegative())

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
    title: "JsonNumber",
    description: "a JSON number",
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
export const symbol: Schema<string, symbol> = transform(
  string,
  symbolFromSelf,
  (s) => Symbol.for(s),
  (sym) => sym.description,
  { strict: false }
)

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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => a > min, {
      typeId: { id: GreaterThanBigintTypeId, params: { min } },
      description: min === 0n ? "a positive bigint" : `a bigint greater than ${min}n`,
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToBigintTypeId: unique symbol =
  filters.GreaterThanOrEqualToBigintTypeId

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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => a >= min, {
      typeId: { id: GreaterThanOrEqualToBigintTypeId, params: { min } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => a < max, {
      typeId: { id: LessThanBigintTypeId, params: { max } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => a <= max, {
      typeId: { id: LessThanOrEqualToBigintTypeId, params: { max } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => a >= min && a <= max, {
      typeId: { id: BetweenBigintTypeId, params: { max, min } },
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
): <I>(self: Schema<I, A>) => Schema<I, A> => greaterThanBigint(0n, options)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const negativeBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> => lessThanBigint(0n, options)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonNegativeBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> => greaterThanOrEqualToBigint(0n, options)

/**
 * @category bigint filters
 * @since 1.0.0
 */
export const nonPositiveBigint = <A extends bigint>(
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> => lessThanOrEqualToBigint(0n, options)

/**
 * Clamps a bigint between a minimum and a maximum value.
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const clampBigint =
  (minimum: bigint, maximum: bigint) => <I, A extends bigint>(self: Schema<I, A>): Schema<I, A> =>
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
export const bigint: Schema<string, bigint> = transformOrFail(
  string,
  bigintFromSelf,
  (s, _, ast) => {
    if (s.trim() === "") {
      return ParseResult.fail(ParseResult.type(ast, s))
    }

    return ParseResult.try({
      try: () => BigInt(s),
      catch: () => ParseResult.parseError([ParseResult.type(ast, s)])
    })
  },
  (n) => ParseResult.succeed(String(n))
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const PositiveBigintFromSelf: Schema<bigint> = bigintFromSelf.pipe(positiveBigint())

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const PositiveBigint: Schema<string, bigint> = bigint.pipe(positiveBigint())

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NegativeBigintFromSelf: Schema<bigint> = bigintFromSelf.pipe(negativeBigint())

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NegativeBigint: Schema<string, bigint> = bigint.pipe(negativeBigint())

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonPositiveBigintFromSelf: Schema<bigint> = bigintFromSelf.pipe(
  nonPositiveBigint()
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonPositiveBigint: Schema<string, bigint> = bigint.pipe(
  nonPositiveBigint()
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonNegativeBigintFromSelf: Schema<bigint> = bigintFromSelf.pipe(
  nonNegativeBigint()
)

/**
 * @category bigint constructors
 * @since 1.0.0
 */
export const NonNegativeBigint: Schema<string, bigint> = bigint.pipe(
  nonNegativeBigint()
)

/**
 * This schema transforms a `number` into a `bigint` by parsing the number using the `BigInt` function.
 *
 * It returns an error if the value can't be safely encoded as a `number` due to being out of range.
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const BigintFromNumber: Schema<number, bigint> = transformOrFail(
  number,
  bigintFromSelf,
  (n, _, ast) =>
    ParseResult.try({
      try: () => BigInt(n),
      catch: () => ParseResult.parseError([ParseResult.type(ast, n)])
    }),
  (b, _, ast) => {
    if (b > InternalBigInt.maxSafeInteger || b < InternalBigInt.minSafeInteger) {
      return ParseResult.fail(ParseResult.type(ast, b))
    }

    return ParseResult.succeed(Number(b))
  }
)

/**
 * @category Secret constructors
 * @since 1.0.0
 */
export const SecretFromSelf: Schema<Secret.Secret> = declare(
  [],
  string,
  () => (u, _, ast) =>
    Secret.isSecret(u) ?
      ParseResult.succeed(u)
      : ParseResult.fail(ParseResult.type(ast, u)),
  {
    [AST.IdentifierAnnotationId]: "Secret",
    [hooks.PrettyHookId]: (): Pretty.Pretty<Secret.Secret> => (secret) => String(secret),
    [hooks.ArbitraryHookId]: (): Arbitrary<Secret.Secret> => (fc) =>
      fc.string().map((_) => Secret.fromString(_))
  }
)

const _Secret: Schema<string, Secret.Secret> = transform(
  string,
  SecretFromSelf,
  (str) => Secret.fromString(str),
  (secret) => Secret.value(secret),
  { strict: false }
)

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
  [],
  struct({
    value: union(
      struct({
        _tag: literal("Millis"),
        millis: number
      }),
      struct({
        _tag: literal("Nanos"),
        nanos: bigintFromSelf
      }),
      struct({
        _tag: literal("Infinity")
      })
    )
  }),
  () => (u, _, ast) =>
    Duration.isDuration(u) ?
      ParseResult.succeed(u)
      : ParseResult.fail(ParseResult.type(ast, u)),
  {
    [AST.IdentifierAnnotationId]: "Duration",
    [hooks.PrettyHookId]: (): Pretty.Pretty<Duration.Duration> => (duration) => String(duration),
    [hooks.ArbitraryHookId]: (): Arbitrary<Duration.Duration> => (fc) =>
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
    [hooks.EquivalenceHookId]: () => Duration.Equivalence
  }
)

/**
 * A schema that transforms a `bigint` tuple into a `Duration`.
 * Treats the value as the number of nanoseconds.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const DurationFromNanos: Schema<
  bigint,
  Duration.Duration
> = transformOrFail(
  bigintFromSelf,
  DurationFromSelf,
  (nanos) => ParseResult.succeed(Duration.nanos(nanos)),
  (duration, _, ast) =>
    Option.match(Duration.toNanos(duration), {
      onNone: () => ParseResult.fail(ParseResult.type(ast, duration)),
      onSome: (val) => ParseResult.succeed(val)
    })
)

/**
 * A schema that transforms a `number` tuple into a `Duration`.
 * Treats the value as the number of milliseconds.
 *
 * @category Duration transformations
 * @since 1.0.0
 */
export const DurationFromMillis: Schema<
  number,
  Duration.Duration
> = transform(
  number,
  DurationFromSelf,
  (ms) => Duration.millis(ms),
  (n) => Duration.toMillis(n)
)

const hrTime: Schema<readonly [seconds: number, nanos: number]> = tuple(
  NonNegative.pipe(
    annotations({
      [AST.TitleAnnotationId]: "seconds",
      [AST.DescriptionAnnotationId]: "seconds"
    }),
    finite()
  ),
  NonNegative.pipe(
    annotations({
      [AST.TitleAnnotationId]: "nanos",
      [AST.DescriptionAnnotationId]: "nanos"
    }),
    finite()
  )
).pipe(annotations({
  [AST.TitleAnnotationId]: "a high resolution time tuple",
  [AST.DescriptionAnnotationId]: "a high resolution time tuple"
}))

const _Duration: Schema<readonly [seconds: number, nanos: number], Duration.Duration> = transform(
  hrTime,
  DurationFromSelf,
  ([seconds, nanos]) => Duration.nanos(BigInt(seconds) * BigInt(1e9) + BigInt(nanos)),
  (duration) => Duration.toHrTime(duration)
)

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
  <I, A extends Duration.Duration>(self: Schema<I, A>): Schema<I, A> =>
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => Duration.lessThan(a, max), {
      typeId: { id: LessThanDurationTypeId, params: { max } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => Duration.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanDurationTypeId, params: { max } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => Duration.greaterThan(a, min), {
      typeId: { id: GreaterThanDurationTypeId, params: { min } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => Duration.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToDurationTypeId, params: { min } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => Duration.between(a, { minimum, maximum }), {
      typeId: { id: BetweenDurationTypeId, params: { maximum, minimum } },
      description: `a Duration between ${Duration.decode(minimum)} and ${Duration.decode(maximum)}`,
      ...options
    })
  )

/**
 * @category Uint8Array constructors
 * @since 1.0.0
 */
export const Uint8ArrayFromSelf: Schema<Uint8Array> = declare(
  [],
  array(number),
  () => (u, _, ast) =>
    Predicate.isUint8Array(u) ?
      ParseResult.succeed(u)
      : ParseResult.fail(ParseResult.type(ast, u)),
  {
    [AST.IdentifierAnnotationId]: "Uint8Array",
    [hooks.PrettyHookId]: (): Pretty.Pretty<Uint8Array> => (u8arr) =>
      `new Uint8Array(${JSON.stringify(Array.from(u8arr))})`,
    [hooks.ArbitraryHookId]: (): Arbitrary<Uint8Array> => (fc) => fc.uint8Array(),
    [hooks.EquivalenceHookId]: () => ReadonlyArray.getEquivalence(Equivalence.strict())
  }
)

const _Uint8Array: Schema<ReadonlyArray<number>, Uint8Array> = transform(
  array(number.pipe(
    between(0, 255, {
      title: "8-bit unsigned integer",
      description: "a 8-bit unsigned integer"
    })
  )),
  Uint8ArrayFromSelf,
  (a) => Uint8Array.from(a),
  (arr) => Array.from(arr)
)

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
  encode: (u: Uint8Array) => string,
  arbitrary: Arbitrary<Uint8Array>
): Schema<string, Uint8Array> =>
  transformOrFail(
    string,
    Uint8ArrayFromSelf,
    (s, _, ast) =>
      Either.mapLeft(
        decode(s),
        (decodeException) =>
          ParseResult.parseError([ParseResult.type(ast, s, decodeException.message)])
      ),
    (u) => ParseResult.succeed(encode(u)),
    { strict: false }
  ).pipe(annotations({
    [AST.IdentifierAnnotationId]: id,
    [hooks.PrettyHookId]: (): Pretty.Pretty<Uint8Array> => (u) => `${id}(${encode(u)})`,
    [hooks.ArbitraryHookId]: () => arbitrary
  }))

/**
 * @category Encoding transformations
 * @since 1.0.0
 */
export const Base64: Schema<string, Uint8Array> = makeEncodingTransformation(
  "Base64",
  Encoding.decodeBase64,
  Encoding.encodeBase64,
  (fc) => fc.base64String().map((s) => Either.getOrThrow(Encoding.decodeBase64(s)))
)

/**
 * @category Encoding transformations
 * @since 1.0.0
 */
export const Base64Url: Schema<string, Uint8Array> = makeEncodingTransformation(
  "Base64Url",
  Encoding.decodeBase64Url,
  Encoding.encodeBase64Url,
  (fc) => fc.base64String().map((s) => Either.getOrThrow(Encoding.decodeBase64Url(s)))
)

/**
 * @category Encoding transformations
 * @since 1.0.0
 */
export const Hex: Schema<string, Uint8Array> = makeEncodingTransformation(
  "Hex",
  Encoding.decodeHex,
  Encoding.encodeHex,
  (fc) => fc.hexaString().map((s) => Either.getOrThrow(Encoding.decodeHex(s)))
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
<I>(self: Schema<I, ReadonlyArray<A>>): Schema<I, ReadonlyArray<A>> =>
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
<I>(self: Schema<I, ReadonlyArray<A>>): Schema<I, ReadonlyArray<A>> =>
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
<I>(self: Schema<I, ReadonlyArray<A>>): Schema<I, ReadonlyArray<A>> =>
  self.pipe(
    filter((a): a is ReadonlyArray<A> => a.length === n, {
      typeId: ItemsCountTypeId,
      description: `an array of exactly ${n} items`,
      jsonSchema: { minItems: n, maxItems: n },
      ...options
    })
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
  (options?: FilterAnnotations<Date>) => <I>(self: Schema<I, Date>): Schema<I, Date> =>
    self.pipe(
      filter((a) => !Number.isNaN(a.getTime()), {
        typeId: ValidDateTypeId,
        description: "a valid Date",
        ...options
      })
    )

const dateArbitrary = (): Arbitrary<Date> => (fc) => fc.date({ noInvalidDate: false })

const datePretty = (): Pretty.Pretty<Date> => (date) => `new Date(${JSON.stringify(date)})`

/**
 * Represents a schema for handling potentially **invalid** `Date` instances (e.g., `new Date("Invalid Date")` is not rejected).
 *
 * @category Date constructors
 * @since 1.0.0
 */
export const DateFromSelf: Schema<Date> = declare(
  [],
  struct({
    valueOf: number
  }),
  () => (u, _, ast) =>
    Predicate.isDate(u) ?
      ParseResult.succeed(u)
      : ParseResult.fail(ParseResult.type(ast, u)),
  {
    [AST.IdentifierAnnotationId]: "Date",
    [hooks.PrettyHookId]: datePretty,
    [hooks.ArbitraryHookId]: dateArbitrary,
    [hooks.EquivalenceHookId]: () => Equivalence.Date
  }
)

/**
 * Represents a schema for handling only **valid** dates. For example, `new Date("Invalid Date")` is rejected, even though it is an instance of `Date`.
 *
 * @category Date constructors
 * @since 1.0.0
 */
export const ValidDateFromSelf: Schema<Date> = DateFromSelf.pipe(validDate())

/**
 * Represents a schema that converts a `string` into a (potentially invalid) `Date` (e.g., `new Date("Invalid Date")` is not rejected).
 *
 * @category Date transformations
 * @since 1.0.0
 */
export const DateFromString: Schema<string, Date> = transform(
  string,
  DateFromSelf,
  (s) => new Date(s),
  (n) => n.toISOString()
)

const _Date: Schema<string, Date> = DateFromString.pipe(validDate())

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

const optionFrom = <I, A>(value: Schema<I, A>): Schema<OptionFrom<I>, OptionFrom<A>> =>
  union(
    struct({
      _tag: literal("None")
    }),
    struct({
      _tag: literal("Some"),
      value
    })
  )

const optionDecode = <A>(input: OptionFrom<A>): Option.Option<A> =>
  input._tag === "None" ? Option.none() : Option.some(input.value)

const optionArbitrary = <A>(value: Arbitrary<A>): Arbitrary<Option.Option<A>> => {
  const arb = arbitrary.unsafe(optionFrom(schemaFromArbitrary(value)))
  return (fc) => arb(fc).map(optionDecode)
}

const optionPretty = <A>(value: Pretty.Pretty<A>): Pretty.Pretty<Option.Option<A>> =>
  Option.match({
    onNone: () => "none()",
    onSome: (a) => `some(${value(a)})`
  })

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromSelf = <I, A>(
  value: Schema<I, A>
): Schema<Option.Option<I>, Option.Option<A>> => {
  return declare(
    [value],
    optionFrom(value),
    (isDecoding, value) => {
      const parse = isDecoding ? Parser.parse(value) : Parser.encode(value)
      return (u, options, ast) =>
        Option.isOption(u) ?
          Option.isNone(u) ?
            ParseResult.succeed(Option.none())
            : ParseResult.map(parse(u.value, options), Option.some)
          : ParseResult.fail(ParseResult.type(ast, u))
    },
    {
      [AST.IdentifierAnnotationId]: "Option",
      [hooks.PrettyHookId]: optionPretty,
      [hooks.ArbitraryHookId]: optionArbitrary,
      [hooks.EquivalenceHookId]: Option.getEquivalence
    }
  )
}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const option = <I, A>(
  value: Schema<I, A>
): Schema<OptionFrom<I>, Option.Option<A>> =>
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
export const optionFromNullable = <I, A>(
  value: Schema<I, A>
): Schema<I | null, Option.Option<A>> =>
  transform(nullable(value), optionFromSelf(to(value)), Option.fromNullable, Option.getOrNull)

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromNullish = <I, A>(
  value: Schema<I, A>,
  onNoneEncoding: null | undefined
): Schema<I | null | undefined, Option.Option<A>> =>
  transform(
    nullish(value),
    optionFromSelf(to(value)),
    Option.fromNullable,
    onNoneEncoding === null ? Option.getOrNull : Option.getOrUndefined
  )

/**
 * @category Either utils
 * @since 1.0.0
 */
export type EitherFrom<IE, IA> =
  | {
    readonly _tag: "Left"
    readonly left: IE
  }
  | {
    readonly _tag: "Right"
    readonly right: IA
  }

const eitherFrom = <IE, E, IA, A>(
  left: Schema<IE, E>,
  right: Schema<IA, A>
): Schema<EitherFrom<IE, IA>, EitherFrom<E, A>> =>
  union(
    struct({
      _tag: literal("Left"),
      left
    }),
    struct({
      _tag: literal("Right"),
      right
    })
  )

const eitherDecode = <E, A>(input: EitherFrom<E, A>): Either.Either<E, A> =>
  input._tag === "Left" ? Either.left(input.left) : Either.right(input.right)

const eitherArbitrary = <E, A>(
  left: Arbitrary<E>,
  right: Arbitrary<A>
): Arbitrary<Either.Either<E, A>> => {
  const arb = arbitrary.unsafe(eitherFrom(schemaFromArbitrary(left), schemaFromArbitrary(right)))
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

/**
 * @category Either transformations
 * @since 1.0.0
 */
export const eitherFromSelf = <IE, E, IA, A>(
  left: Schema<IE, E>,
  right: Schema<IA, A>
): Schema<Either.Either<IE, IA>, Either.Either<E, A>> => {
  return declare(
    [left, right],
    eitherFrom(left, right),
    (isDecoding, left, right) => {
      const parseLeft = isDecoding ? Parser.parse(left) : Parser.encode(left)
      const parseRight = isDecoding ? Parser.parse(right) : Parser.encode(right)
      return (u, options, ast) =>
        Either.isEither(u) ?
          Either.isLeft(u) ?
            ParseResult.map(parseLeft(u.left, options), Either.left)
            : ParseResult.map(parseRight(u.right, options), Either.right)
          : ParseResult.fail(ParseResult.type(ast, u))
    },
    {
      [AST.IdentifierAnnotationId]: "Either",
      [hooks.PrettyHookId]: eitherPretty,
      [hooks.ArbitraryHookId]: eitherArbitrary,
      [hooks.EquivalenceHookId]: Either.getEquivalence
    }
  )
}

/**
 * @category Either transformations
 * @since 1.0.0
 */
export const either = <IE, E, IA, A>(
  left: Schema<IE, E>,
  right: Schema<IA, A>
): Schema<EitherFrom<IE, IA>, Either.Either<E, A>> =>
  transform(
    eitherFrom(left, right),
    eitherFromSelf(to(left), to(right)),
    eitherDecode,
    Either.match({
      onLeft: (left) => ({ _tag: "Left", left }) as const,
      onRight: (right) => ({ _tag: "Right", right }) as const
    })
  )

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
  return Equivalence.make((a, b) =>
    arrayEquivalence(Array.from(a.entries()), Array.from(b.entries()))
  )
}

/**
 * @category ReadonlyMap transformations
 * @since 1.0.0
 */
export const readonlyMapFromSelf = <IK, K, IV, V>(
  key: Schema<IK, K>,
  value: Schema<IV, V>
): Schema<ReadonlyMap<IK, IV>, ReadonlyMap<K, V>> => {
  return declare(
    [key, value],
    struct({
      size: number,
      entries: array(tuple(key, value))
    }),
    (isDecoding, key, value) => {
      const items = array(tuple(key, value))
      const parse = isDecoding ? Parser.parse(items) : Parser.encode(items)
      return (u, options, ast) =>
        isMap(u) ?
          ParseResult.map(parse(Array.from(u.entries()), options), (as) => new Map(as))
          : ParseResult.fail(ParseResult.type(ast, u))
    },
    {
      [AST.IdentifierAnnotationId]: "ReadonlyMap",
      [hooks.PrettyHookId]: readonlyMapPretty,
      [hooks.ArbitraryHookId]: readonlyMapArbitrary,
      [hooks.EquivalenceHookId]: readonlyMapEquivalence
    }
  )
}

/**
 * @category ReadonlyMap transformations
 * @since 1.0.0
 */
export const readonlyMap = <IK, K, IV, V>(
  key: Schema<IK, K>,
  value: Schema<IV, V>
): Schema<ReadonlyArray<readonly [IK, IV]>, ReadonlyMap<K, V>> =>
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
  return Equivalence.make((a, b) =>
    arrayEquivalence(Array.from(a.values()), Array.from(b.values()))
  )
}

/**
 * @category ReadonlySet transformations
 * @since 1.0.0
 */
export const readonlySetFromSelf = <I, A>(
  item: Schema<I, A>
): Schema<ReadonlySet<I>, ReadonlySet<A>> => {
  return declare(
    [item],
    struct({
      size: number,
      values: array(item)
    }),
    (isDecoding, item) => {
      const items = array(item)
      const parse = isDecoding ? Parser.parse(items) : Parser.encode(items)
      return (u, options, ast) =>
        isSet(u) ?
          ParseResult.map(parse(Array.from(u.values()), options), (as) => new Set(as))
          : ParseResult.fail(ParseResult.type(ast, u))
    },
    {
      [AST.IdentifierAnnotationId]: "ReadonlySet",
      [hooks.PrettyHookId]: readonlySetPretty,
      [hooks.ArbitraryHookId]: readonlySetArbitrary,
      [hooks.EquivalenceHookId]: readonlySetEquivalence
    }
  )
}

/**
 * @category ReadonlySet transformations
 * @since 1.0.0
 */
export const readonlySet = <I, A>(item: Schema<I, A>): Schema<ReadonlyArray<I>, ReadonlySet<A>> =>
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
  [],
  struct({
    value: bigintFromSelf,
    scale: number
  }),
  () => (u, _, ast) =>
    BigDecimal.isBigDecimal(u) ?
      ParseResult.succeed(u)
      : ParseResult.fail(ParseResult.type(ast, u)),
  {
    [AST.IdentifierAnnotationId]: "BigDecimal",
    [hooks.PrettyHookId]: bigDecimalPretty,
    [hooks.ArbitraryHookId]: bigDecimalArbitrary,
    [hooks.EquivalenceHookId]: () => BigDecimal.Equivalence
  }
)

const _BigDecimal: Schema<string, BigDecimal.BigDecimal> = transformOrFail(
  string,
  BigDecimalFromSelf,
  (num, _, ast) =>
    BigDecimal.fromString(num).pipe(Option.match({
      onNone: () => ParseResult.fail(ParseResult.type(ast, num)),
      onSome: (val) => ParseResult.succeed(BigDecimal.normalize(val))
    })),
  (val) => ParseResult.succeed(BigDecimal.format(BigDecimal.normalize(val)))
)

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
export const BigDecimalFromNumber: Schema<number, BigDecimal.BigDecimal> = transformOrFail(
  number,
  BigDecimalFromSelf,
  (num) => ParseResult.succeed(BigDecimal.fromNumber(num)),
  (val) => ParseResult.succeed(BigDecimal.unsafeToNumber(val))
)

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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => BigDecimal.greaterThan(a, min), {
      typeId: { id: GreaterThanBigDecimalTypeId, params: { min } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => BigDecimal.greaterThanOrEqualTo(a, min), {
      typeId: { id: GreaterThanOrEqualToBigDecimalTypeId, params: { min } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => BigDecimal.lessThan(a, max), {
      typeId: { id: LessThanBigDecimalTypeId, params: { max } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => BigDecimal.lessThanOrEqualTo(a, max), {
      typeId: { id: LessThanOrEqualToBigDecimalTypeId, params: { max } },
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => BigDecimal.isPositive(a), {
      typeId: { id: PositiveBigDecimalTypeId, params: {} },
      description: `a positive BigDecimal`,
      ...options
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => a.value >= 0n, {
      typeId: { id: NonNegativeBigDecimalTypeId, params: {} },
      description: `a non-negative BigDecimal`,
      ...options
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => BigDecimal.isNegative(a), {
      typeId: { id: NegativeBigDecimalTypeId, params: {} },
      description: `a negative BigDecimal`,
      ...options
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => a.value <= 0n, {
      typeId: { id: NonPositiveBigDecimalTypeId, params: {} },
      description: `a non-positive BigDecimal`,
      ...options
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
<I>(self: Schema<I, A>): Schema<I, A> =>
  self.pipe(
    filter((a): a is A => BigDecimal.between(a, { minimum, maximum }), {
      typeId: { id: BetweenBigDecimalTypeId, params: { maximum, minimum } },
      description: `a BigDecimal between ${BigDecimal.format(minimum)} and ${
        BigDecimal.format(maximum)
      }`,
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
  <I, A extends BigDecimal.BigDecimal>(self: Schema<I, A>): Schema<I, A> =>
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
export const negateBigDecimal = <I, A extends BigDecimal.BigDecimal>(
  self: Schema<I, A>
): Schema<I, A> =>
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

/**
 * @category Chunk transformations
 * @since 1.0.0
 */
export const chunkFromSelf = <I, A>(item: Schema<I, A>): Schema<Chunk.Chunk<I>, Chunk.Chunk<A>> => {
  return declare(
    [item],
    struct({
      length: number,
      values: array(item)
    }),
    (isDecoding, item) => {
      const items = array(item)
      const parse = isDecoding ? Parser.parse(items) : Parser.encode(items)
      return (u, options, ast) => {
        return Chunk.isChunk(u) ?
          Chunk.isEmpty(u) ?
            ParseResult.succeed(u)
            : ParseResult.map(parse(Chunk.toReadonlyArray(u), options), Chunk.fromIterable)
          : ParseResult.fail(ParseResult.type(ast, u))
      }
    },
    {
      [AST.IdentifierAnnotationId]: "Chunk",
      [hooks.PrettyHookId]: chunkPretty,
      [hooks.ArbitraryHookId]: chunkArbitrary,
      [hooks.EquivalenceHookId]: Chunk.getEquivalence
    }
  )
}

/**
 * @category Chunk transformations
 * @since 1.0.0
 */
export const chunk = <I, A>(item: Schema<I, A>): Schema<ReadonlyArray<I>, Chunk.Chunk<A>> =>
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

/**
 * @category Data transformations
 * @since 1.0.0
 */
export const dataFromSelf = <
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<I, A>
): Schema<Data.Data<I>, Data.Data<A>> => {
  return declare(
    [item],
    item,
    (isDecoding, item) => {
      const parse = isDecoding ? Parser.parse(item) : Parser.encode(item)
      return (u, options, ast) =>
        Equal.isEqual(u) ?
          ParseResult.map(parse(u, options), toData)
          : ParseResult.fail(ParseResult.type(ast, u))
    },
    {
      [AST.IdentifierAnnotationId]: "Data",
      [hooks.PrettyHookId]: dataPretty,
      [hooks.ArbitraryHookId]: dataArbitrary,
      [hooks.EquivalenceHookId]: () => Equal.equals
    }
  )
}

/**
 * @category Data transformations
 * @since 1.0.0
 */
export const data = <
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<I, A>
): Schema<I, Data.Data<A>> =>
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
export interface Class<I, A, C, Self, Inherited = Data.Case> extends Schema<I, Self> {
  new(
    props: Equals<C, {}> extends true ? void | {} : C,
    disableValidation?: boolean
  ): A & Omit<Inherited, keyof A>

  readonly struct: Schema<I, A>

  readonly extend: <Extended>() => <FieldsB extends StructFields>(
    fields: FieldsB
  ) => [unknown] extends [Extended] ? MissingSelfGeneric<"Base.extend">
    : Class<
      Simplify<Omit<I, keyof FieldsB> & FromStruct<FieldsB>>,
      Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      Simplify<Omit<C, keyof FieldsB> & ToStruct<FieldsB>>,
      Extended,
      Self
    >

  readonly transform: <Transformed>() => <
    FieldsB extends StructFields
  >(
    fields: FieldsB,
    decode: (
      input: A
    ) => ParseResult.ParseResult<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
    encode: (
      input: Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>
    ) => ParseResult.ParseResult<A>
  ) => [unknown] extends [Transformed] ? MissingSelfGeneric<"Base.transform">
    : Class<
      I,
      Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
      Simplify<Omit<C, keyof FieldsB> & ToStruct<FieldsB>>,
      Transformed,
      Self
    >

  readonly transformFrom: <Transformed>() => <
    FieldsB extends StructFields
  >(
    fields: FieldsB,
    decode: (
      input: I
    ) => ParseResult.ParseResult<Omit<I, keyof FieldsB> & FromStruct<FieldsB>>,
    encode: (
      input: Simplify<Omit<I, keyof FieldsB> & FromStruct<FieldsB>>
    ) => ParseResult.ParseResult<I>
  ) => [unknown] extends [Transformed] ? MissingSelfGeneric<"Base.transformFrom">
    : Class<
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
    Simplify<FromStruct<Fields>>,
    Simplify<ToStruct<Fields>>,
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
    Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
    Simplify<{ readonly _tag: Tag } & ToStruct<Fields>>,
    Simplify<ToStruct<Fields>>,
    Self
  > =>
{
  const fieldsWithTag = { ...fields, _tag: literal(tag) }
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
    Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
    Simplify<{ readonly _tag: Tag } & ToStruct<Fields>>,
    Simplify<ToStruct<Fields>>,
    Self,
    Effect.Effect<never, Self, never> & globalThis.Error
  > =>
{
  const fieldsWithTag = { ...fields, _tag: literal(tag) }
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
export interface TaggedRequest<Tag extends string, IS, S, IE, E, IA, A>
  extends Request.Request<E, A>, Serializable.SerializableWithResult<IS, S, IE, E, IA, A>
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
    | TaggedRequest<string, any, any, any, any, any, any>
    | TaggedRequest<string, any, any, never, never, any, any>
}

/**
 * @category classes
 * @since 1.0.0
 */
export const TaggedRequest =
  <Self>() =>
  <Tag extends string, Fields extends StructFields, EI, EA, AI, AA>(
    tag: Tag,
    Failure: Schema<EI, EA>,
    Success: Schema<AI, AA>,
    fields: Fields
  ): [unknown] extends [Self] ?
    MissingSelfGeneric<"TaggedRequest", `"Tag", SuccessSchema, FailureSchema, `>
    : Class<
      Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
      Simplify<{ readonly _tag: Tag } & ToStruct<Fields>>,
      Simplify<ToStruct<Fields>>,
      Self,
      TaggedRequest<
        Tag,
        Simplify<{ readonly _tag: Tag } & FromStruct<Fields>>,
        Self,
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
    const fieldsWithTag = { ...fields, _tag: literal(tag) }
    return makeClass(
      struct(fieldsWithTag),
      fieldsWithTag,
      SerializableRequest,
      { _tag: tag }
    )
  }

const makeClass = <I, A>(
  selfSchema: Schema<I, A>,
  selfFields: StructFields,
  Base: any,
  additionalProps?: any
): any => {
  const validator = Parser.validateSync(selfSchema)

  return class extends Base {
    constructor(props: any = {}, disableValidation = false) {
      if (disableValidation !== true) {
        props = validator(additionalProps ? { ...props, ...additionalProps } : props)
      }
      super(props, true)
    }

    static [TypeId] = variance

    toString() {
      return Pretty.to(this.constructor as any)(this)
    }

    static pipe() {
      return pipeArguments(this, arguments)
    }

    static get ast() {
      const toSchema = to(selfSchema)
      return transform(
        selfSchema,
        declare([toSchema], toSchema, () => (input, _, ast) =>
          input instanceof this ?
            ParseResult.succeed(input)
            : ParseResult.fail(ParseResult.type(ast, input)), {
          [AST.DescriptionAnnotationId]: `an instance of ${this.name}`,
          [hooks.PrettyHookId]: (struct: any) => (self: any) =>
            `${self.constructor.name}(${struct(self)})`,
          [hooks.ArbitraryHookId]: (struct: any) => (fc: any) =>
            struct(fc).map((props: any) => new this(props))
        }),
        (input) => new this(input, true),
        (input) => ({ ...input })
      ).ast
    }

    static struct = selfSchema

    static extend() {
      return (fields: any) => {
        const newFields = { ...selfFields, ...fields }
        return makeClass(
          struct(newFields),
          newFields,
          this,
          additionalProps
        )
      }
    }

    static transform() {
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

    static transformFrom() {
      return (fields: any, decode: any, encode: any) => {
        const newFields = { ...selfFields, ...fields }
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

const FiberIdFrom: Schema<FiberIdFrom, FiberIdFrom> = union(
  struct({
    _tag: literal("Composite"),
    left: suspend(() => FiberIdFrom),
    right: suspend(() => FiberIdFrom)
  }),
  struct({
    _tag: literal("None")
  }),
  struct({
    _tag: literal("Runtime"),
    id: Int.pipe(nonNegative({
      title: "id",
      description: "id"
    })),
    startTimeMillis: Int.pipe(nonNegative({
      title: "startTimeMillis",
      description: "startTimeMillis"
    }))
  })
)

const fiberIdFromArbitrary = arbitrary.unsafe(FiberIdFrom)

const fiberIdArbitrary: Arbitrary<FiberId.FiberId> = (fc) =>
  fiberIdFromArbitrary(fc).map(fiberIdDecode)

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
export const FiberIdFromSelf: Schema<FiberId.FiberId, FiberId.FiberId> = declare(
  [],
  FiberIdFrom,
  () => (input, _, ast) =>
    FiberId.isFiberId(input) ?
      ParseResult.succeed(input)
      : ParseResult.fail(ParseResult.type(ast, input)),
  {
    [AST.IdentifierAnnotationId]: "FiberId",
    [hooks.PrettyHookId]: () => fiberIdPretty,
    [hooks.ArbitraryHookId]: () => fiberIdArbitrary,
    [hooks.EquivalenceHookId]: () => Equal.equals
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

const _FiberId: Schema<FiberIdFrom, FiberId.FiberId> = transform(
  FiberIdFrom,
  FiberIdFromSelf,
  fiberIdDecode,
  fiberIdEncode
)

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

const causeFrom = <EI, E>(
  error: Schema<EI, E>,
  defect: Schema<unknown, unknown>
): Schema<CauseFrom<EI>, CauseFrom<E>> => {
  const out: Schema<CauseFrom<EI>, CauseFrom<E>> = union(
    struct({
      _tag: literal("Die"),
      defect
    }),
    struct({
      _tag: literal("Empty")
    }),
    struct({
      _tag: literal("Fail"),
      error
    }),
    struct({
      _tag: literal("Interrupt"),
      fiberId: FiberIdFrom
    }),
    struct({
      _tag: literal("Parallel"),
      left: suspend(() => out),
      right: suspend(() => out)
    }),
    struct({
      _tag: literal("Sequential"),
      left: suspend(() => out),
      right: suspend(() => out)
    })
  )
  return out
}

const causeArbitrary = <E>(
  error: Arbitrary<E>,
  defect: Arbitrary<unknown>
): Arbitrary<Cause.Cause<E>> => {
  const arb = arbitrary.unsafe(causeFrom(schemaFromArbitrary(error), schemaFromArbitrary(defect)))
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

/**
 * @category Cause transformations
 * @since 1.0.0
 */
export const causeFromSelf = <IE, E>(
  error: Schema<IE, E>,
  defect: Schema<unknown, unknown> = unknown
): Schema<Cause.Cause<IE>, Cause.Cause<E>> => {
  return declare(
    [error, defect],
    causeFrom(error, defect),
    (isDecoding, error) => {
      const cause = causeFrom(error, defect)
      const parse = isDecoding ? Parser.parse(cause) : Parser.encode(cause)
      return (u, options, ast) => {
        return Cause.isCause(u) ?
          ParseResult.map(parse(causeEncode(u), options), causeDecode)
          : ParseResult.fail(ParseResult.type(ast, u))
      }
    },
    {
      [AST.IdentifierAnnotationId]: "Cause",
      [hooks.PrettyHookId]: causePretty,
      [hooks.ArbitraryHookId]: causeArbitrary,
      [hooks.EquivalenceHookId]: () => Equal.equals
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

const causeDefectPretty: Schema<unknown, unknown> = transform(
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
export const cause = <EI, E>(
  error: Schema<EI, E>,
  defect: Schema<unknown, unknown> = causeDefectPretty
): Schema<CauseFrom<EI>, Cause.Cause<E>> =>
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

const exitFrom = <EI, E, AI, A>(
  error: Schema<EI, E>,
  value: Schema<AI, A>,
  defect: Schema<unknown, unknown>
): Schema<ExitFrom<EI, AI>, ExitFrom<E, A>> =>
  union(
    struct({
      _tag: literal("Failure"),
      cause: causeFrom(error, defect)
    }),
    struct({
      _tag: literal("Success"),
      value
    })
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
  const arb = arbitrary.unsafe(
    exitFrom(schemaFromArbitrary(error), schemaFromArbitrary(value), schemaFromArbitrary(defect))
  )
  return (fc) => arb(fc).map(exitDecode)
}

const exitPretty =
  <E, A>(error: Pretty.Pretty<E>, value: Pretty.Pretty<A>): Pretty.Pretty<Exit.Exit<E, A>> =>
  (exit) =>
    exit._tag === "Failure"
      ? `Exit.failCause(${causePretty(error)(exit.cause)})`
      : `Exit.succeed(${value(exit.value)})`

/**
 * @category Exit transformations
 * @since 1.0.0
 */
export const exitFromSelf = <IE, E, IA, A>(
  error: Schema<IE, E>,
  value: Schema<IA, A>,
  defect: Schema<unknown, unknown> = unknown
): Schema<Exit.Exit<IE, IA>, Exit.Exit<E, A>> =>
  declare(
    [error, value, defect],
    exitFrom(error, value, defect),
    (isDecoding, error, value) => {
      const cause = causeFromSelf(error, defect)
      const parseCause = isDecoding ? Parser.parse(cause) : Parser.encode(cause)
      const parseValue = isDecoding ? Parser.parse(value) : Parser.encode(value)
      return (u, options, ast) =>
        Exit.isExit(u) ?
          Exit.isFailure(u) ?
            ParseResult.map(parseCause(u.cause, options), Exit.failCause)
            : ParseResult.map(parseValue(u.value, options), Exit.succeed)
          : ParseResult.fail(ParseResult.type(ast, u))
    },
    {
      [AST.IdentifierAnnotationId]: "Exit",
      [hooks.PrettyHookId]: exitPretty,
      [hooks.ArbitraryHookId]: exitArbitrary,
      [hooks.EquivalenceHookId]: () => Equal.equals
    }
  )

/**
 * @category Exit transformations
 * @since 1.0.0
 */
export const exit = <IE, E, IA, A>(
  error: Schema<IE, E>,
  value: Schema<IA, A>,
  defect: Schema<unknown, unknown> = causeDefectPretty
): Schema<ExitFrom<IE, IA>, Exit.Exit<E, A>> =>
  transform(
    exitFrom(error, value, defect),
    exitFromSelf(to(error), to(value), to(defect)),
    exitDecode,
    (exit) =>
      exit._tag === "Failure"
        ? { _tag: "Failure", cause: exit.cause } as const
        : { _tag: "Success", value: exit.value } as const
  )

const schemaFromArbitrary = <A>(value: Arbitrary<A>): Schema<A> =>
  suspend<A>(() => any).pipe(annotations({
    [hooks.ArbitraryHookId]: () => value
  }))
