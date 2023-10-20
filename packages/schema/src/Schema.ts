/**
 * @since 1.0.0
 */

import * as BigInt_ from "effect/BigInt"
import * as Brand from "effect/Brand"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Either from "effect/Either"
import * as Encoding from "effect/Encoding"
import * as Equal from "effect/Equal"
import type { LazyArg } from "effect/Function"
import { dual, identity } from "effect/Function"
import * as N from "effect/Number"
import * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as S from "effect/String"
import type { Simplify } from "effect/Types"
import type { Arbitrary } from "./Arbitrary"
import type { ParseOptions } from "./AST"
import * as AST from "./AST"
import * as Internal from "./internal/common"
import * as Parser from "./Parser"
import * as ParseResult from "./ParseResult"
import type { Pretty } from "./Pretty"
import * as TreeFormatter from "./TreeFormatter"

// ---------------------------------------------
// model
// ---------------------------------------------

const TypeId: unique symbol = Symbol.for("@effect/schema/Schema") as TypeId

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

// ---------------------------------------------
// decoding / encoding / parsing / validating / asserts / guards
// ---------------------------------------------

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
} from "./Parser"
/* c8 ignore end */

// ---------------------------------------------
// guards
// ---------------------------------------------

/**
 * Tests if a value is a `Schema`.
 *
 * @category guards
 * @since 1.0.0
 */
export const isSchema = (u: unknown): u is Schema<unknown, unknown> =>
  Predicate.isObject(u) && TypeId in u && "ast" in u && "pipe" in u

// ---------------------------------------------
// constructors
// ---------------------------------------------

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
  annotations?: AST.Annotated["annotations"]
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
  annotations?: AST.Annotated["annotations"]
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
  options?: FilterAnnotations<object>
): Schema<InstanceType<A>, InstanceType<A>> => {
  return declare(
    [],
    struct({}),
    () => (input, _, ast) =>
      input instanceof constructor
        ? ParseResult.success(input)
        : ParseResult.failure(ParseResult.type(ast, input)),
    {
      [AST.TypeAnnotationId]: InstanceOfTypeId,
      [InstanceOfTypeId]: { constructor },
      [AST.DescriptionAnnotationId]: `an instance of ${constructor.name}`,
      ...toAnnotations(options)
    }
  )
}

// ---------------------------------------------
// primitives
// ---------------------------------------------

const _undefined: Schema<undefined> = make(AST.undefinedKeyword)

const _void: Schema<void> = make(AST.voidKeyword)

const _null: Schema<null> = make(AST.createLiteral(null))

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

// ---------------------------------------------
// combinators
// ---------------------------------------------

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
  extends Schema.Variance<From, To>
{
  readonly FromIsOptional: FromIsOptional
  readonly ToIsOptional: ToIsOptional
}

/**
 * @since 1.0.0
 */
export interface OptionalPropertySignature<From, FromIsOptional, To, ToIsOptional>
  extends PropertySignature<From, FromIsOptional, To, ToIsOptional>
{
  readonly withDefault: (value: () => To) => PropertySignature<From, true, To, false>
  readonly toOption: () => PropertySignature<From, true, Option.Option<To>, false>
}

type PropertySignatureConfig =
  | {
    readonly _tag: "PropertySignature"
    readonly ast: AST.AST
    readonly annotations: AST.Annotated["annotations"]
  }
  | {
    readonly _tag: "Optional"
    readonly ast: AST.AST
    readonly annotations: AST.Annotated["annotations"] | undefined
  }
  | {
    readonly _tag: "Default"
    readonly ast: AST.AST
    readonly value: LazyArg<any>
    readonly annotations: AST.Annotated["annotations"] | undefined
  }
  | {
    readonly _tag: "Option"
    readonly ast: AST.AST
    readonly annotations: AST.Annotated["annotations"] | undefined
  }

/** @internal */
export class PropertySignatureImpl<From, FromIsOptional, To, ToIsOptional> {
  readonly [TypeId] = variance
  readonly FromIsOptional!: FromIsOptional
  readonly ToIsOptional!: ToIsOptional

  constructor(
    readonly config: PropertySignatureConfig
  ) {}

  withDefault(value: () => To): PropertySignature<From, true, To, false> {
    return new PropertySignatureImpl(
      {
        _tag: "Default",
        ast: this.config.ast,
        value,
        annotations: this.config.annotations
      }
    )
  }

  toOption(): PropertySignature<From, true, Option.Option<To>, false> {
    return new PropertySignatureImpl({
      _tag: "Option",
      ast: this.config.ast,
      annotations: this.config.annotations
    })
  }
}

/**
 * @since 1.0.0
 */
export const propertySignature = <I, A>(
  schema: Schema<I, A>,
  options: DocAnnotations<A>
): PropertySignature<I, false, A, false> =>
  new PropertySignatureImpl({
    _tag: "PropertySignature",
    ast: schema.ast,
    annotations: toAnnotations(options)
  })

/**
 * @since 1.0.0
 */
export const optional = <I, A>(
  schema: Schema<I, A>,
  options?: DocAnnotations<A>
): OptionalPropertySignature<I, true, A, true> =>
  new PropertySignatureImpl({
    _tag: "Optional",
    ast: schema.ast,
    annotations: toAnnotations(options)
  })

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
export const struct = <
  Fields extends StructFields
>(
  fields: Fields
): Schema<
  Simplify<FromStruct<Fields>>,
  Simplify<ToStruct<Fields>>
> => {
  const ownKeys = Internal.ownKeys(fields)
  const pss: Array<AST.PropertySignature> = []
  const froms: Array<AST.PropertySignature> = []
  const tos: Array<AST.PropertySignature> = []
  const propertySignatureTransformations: Array<AST.PropertySignatureTransform> = []
  for (let i = 0; i < ownKeys.length; i++) {
    const key = ownKeys[i]
    const field = fields[key] as any
    if ("config" in field) {
      const config: PropertySignatureConfig = field.config
      const from = config.ast
      const to = AST.to(from)
      const annotations = config.annotations
      switch (config._tag) {
        case "PropertySignature":
          pss.push(AST.createPropertySignature(key, from, false, true, annotations))
          froms.push(AST.createPropertySignature(key, from, false, true))
          tos.push(AST.createPropertySignature(key, to, false, true, annotations))
          break
        case "Optional":
          pss.push(AST.createPropertySignature(key, from, true, true, annotations))
          froms.push(AST.createPropertySignature(key, from, true, true))
          tos.push(AST.createPropertySignature(key, to, true, true, annotations))
          break
        case "Default":
          froms.push(AST.createPropertySignature(key, from, true, true))
          tos.push(AST.createPropertySignature(key, to, false, true, annotations))
          propertySignatureTransformations.push(
            AST.createPropertySignatureTransform(
              key,
              key,
              AST.createFinalPropertySignatureTransformation(
                Option.orElse(() => Option.some(config.value())),
                identity
              )
            )
          )
          break
        case "Option":
          froms.push(AST.createPropertySignature(key, from, true, true))
          tos.push(
            AST.createPropertySignature(key, optionFromSelf(make(to)).ast, false, true, annotations)
          )
          propertySignatureTransformations.push(
            AST.createPropertySignatureTransform(
              key,
              key,
              AST.createFinalPropertySignatureTransformation(Option.some, Option.flatten)
            )
          )
          break
      }
    } else {
      pss.push(AST.createPropertySignature(key, field.ast, false, true))
      froms.push(AST.createPropertySignature(key, field.ast, false, true))
      tos.push(AST.createPropertySignature(key, AST.to(field.ast), false, true))
    }
  }
  if (ReadonlyArray.isNonEmptyReadonlyArray(propertySignatureTransformations)) {
    return make(
      AST.createTransform(
        AST.createTypeLiteral(froms, []),
        AST.createTypeLiteral(tos, []),
        AST.createTypeLiteralTransformation(
          propertySignatureTransformations
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

const appendBrandAnnotation = <B extends string | symbol, A>(
  ast: AST.AST,
  brand: B,
  options?: DocAnnotations<A>
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
  options?: DocAnnotations<A>
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
        (e) => [{ meta: input, message: TreeFormatter.formatErrors(e.errors) }]
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
 * Make all properties in T mutable
 *
 * @since 1.0.0
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

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
    make(AST.createTransform(ab.ast, cd.ast, AST.composeTransformation))
)

/**
 * @category combinators
 * @since 1.0.0
 */
export const lazy = <I, A = I>(
  f: () => Schema<I, A>,
  annotations?: AST.Annotated["annotations"]
): Schema<I, A> => make(AST.createLazy(() => f().ast, annotations))

/**
 * @category combinators
 * @since 1.0.0
 */
export function filter<C extends A, B extends A, A = C>(
  refinement: Predicate.Refinement<A, B>,
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, C>) => Schema<I, C & B>
export function filter<B extends A, A = B>(
  predicate: Predicate.Predicate<A>,
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, B>) => Schema<I, B>
export function filter<A>(
  predicate: Predicate.Predicate<A>,
  options?: FilterAnnotations<A>
): <I>(self: Schema<I, A>) => Schema<I, A> {
  return (self) =>
    make(AST.createRefinement(
      self.ast,
      (a: A, _, ast: AST.AST) =>
        predicate(a)
          ? Option.none()
          : Option.some(ParseResult.parseError([ParseResult.type(ast, a)])),
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
  <K extends PropertyKey, V extends AST.LiteralValue>(
    key: K,
    value: V
  ): <I, A extends object>(
    schema: Schema<I, A>
  ) => Schema<I, Simplify<A & { readonly [k in K]: V }>>
  <I, A, K extends PropertyKey, V extends AST.LiteralValue>(
    schema: Schema<I, A>,
    key: K,
    value: V
  ): Schema<I, Simplify<A & { readonly [k in K]: V }>>
} = dual(3, <I, A, K extends PropertyKey, V extends AST.LiteralValue>(
  schema: Schema<I, A>,
  key: K,
  value: V
): Schema<I, Simplify<A & { readonly [k in K]: V }>> =>
  make(AST.createTransform(
    schema.ast,
    to(schema).pipe(extend(struct({ [key]: literal(value) }))).ast,
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

// ---------------------------------------------
// annotations
// ---------------------------------------------

const toAnnotations = <A>(
  options?: FilterAnnotations<A>
): AST.Annotated["annotations"] => {
  if (!options) {
    return {}
  }
  const out: AST.Annotated["annotations"] = {}

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
  move("documentation", AST.DocumentationAnnotationId)
  move("jsonSchema", AST.JSONSchemaAnnotationId)
  move("arbitrary", Internal.ArbitraryHookId)
  move("pretty", Internal.PrettyHookId)

  return out
}

/**
 * @since 1.0.0
 */
export interface DocAnnotations<A> extends AST.Annotations {
  readonly identifier?: AST.IdentifierAnnotation
  readonly title?: AST.TitleAnnotation
  readonly description?: AST.DescriptionAnnotation
  readonly examples?: AST.ExamplesAnnotation
  readonly documentation?: AST.DocumentationAnnotation
  readonly message?: AST.MessageAnnotation<A>
}

/**
 * @since 1.0.0
 */
export interface FilterAnnotations<A> extends DocAnnotations<A> {
  readonly typeId?: AST.TypeAnnotation | { id: AST.TypeAnnotation; params: unknown }
  readonly jsonSchema?: AST.JSONSchemaAnnotation
  readonly arbitrary?: (...args: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
  readonly pretty?: (...args: ReadonlyArray<Pretty<any>>) => Pretty<any>
}

/**
 * @category annotations
 * @since 1.0.0
 */
export const annotations =
  (annotations: AST.Annotated["annotations"]) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
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

/**
 * @category annotations
 * @since 1.0.0
 */
export const documentation =
  (documentation: AST.DocumentationAnnotation) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.DocumentationAnnotationId, documentation))

/**
 * @category annotations
 * @since 1.0.0
 */
export const jsonSchema =
  (jsonSchema: AST.JSONSchemaAnnotation) => <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.JSONSchemaAnnotationId, jsonSchema))

// ---------------------------------------------
// string filters
// ---------------------------------------------

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
export const MaxLengthTypeId = Symbol.for("@effect/schema/TypeId/MaxLength")

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
export const MinLengthTypeId = Symbol.for("@effect/schema/TypeId/MinLength")

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
 * Verifies that a string is lowercased
 *
 * Note. This combinator does not make any transformations, it only validates.
 * If what you were looking for was a combinator to lowercase strings, then check out the `lowercase` combinator.
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
export const LengthTypeId = Symbol.for("@effect/schema/TypeId/Length")

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

// ---------------------------------------------
// string transformations
// ---------------------------------------------

/**
 * This combinator converts a string to lowercase
 *
 * @category string transformations
 * @since 1.0.0
 */
export const lowercase = <I, A extends string>(self: Schema<I, A>): Schema<I, A> =>
  transform(
    self,
    to(self).pipe(lowercased()),
    (s) => s.toLowerCase(),
    identity,
    { strict: false }
  )

/**
 * This combinator converts a string to lowercase
 *
 * @category string transformations
 * @since 1.0.0
 */
export const Lowercase: Schema<string> = lowercase(string)

/**
 * This combinator allows removing whitespaces from the beginning and end of a string.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const trim = <I, A extends string>(self: Schema<I, A>): Schema<I, A> =>
  transform(
    self,
    to(self).pipe(trimmed()),
    (s) => s.trim(),
    identity,
    { strict: false }
  )

/**
 * This combinator allows splitting a string into an array of strings.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const split: {
  (separator: string): <I>(self: Schema<I, string>) => Schema<I, ReadonlyArray<string>>
  <I>(self: Schema<I, string>, separator: string): Schema<I, ReadonlyArray<string>>
} = dual(
  2,
  <I>(self: Schema<I, string>, separator: string): Schema<I, ReadonlyArray<string>> =>
    transform(
      self,
      array(string),
      S.split(separator),
      ReadonlyArray.join(separator)
    )
)

/**
 * The `parseJson` combinator offers a method to convert JSON strings into the `unknown` type using the underlying
 * functionality of `JSON.parse`. It also employs `JSON.stringify` for encoding.
 *
 * @category string transformations
 * @since 1.0.0
 */
export const parseJson = <I, A extends string>(self: Schema<I, A>, options?: {
  reviver?: Parameters<typeof JSON.parse>[1]
  replacer?: Parameters<typeof JSON.stringify>[1]
  space?: Parameters<typeof JSON.stringify>[2]
}): Schema<I, unknown> => {
  return transformOrFail(self, unknown, (s, _, ast) => {
    try {
      return ParseResult.success<unknown>(JSON.parse(s, options?.reviver))
    } catch (e: any) {
      return ParseResult.failure(ParseResult.type(ast, s, e.message))
    }
  }, (u, _, ast) => {
    try {
      return ParseResult.success(JSON.stringify(u, options?.replacer, options?.space))
    } catch (e: any) {
      return ParseResult.failure(ParseResult.type(ast, u, e.message))
    }
  }, { strict: false })
}

// ---------------------------------------------
// string constructors
// ---------------------------------------------

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
 * This schema allows removing whitespaces from the beginning and end of a string.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const Trim: Schema<string> = trim(string)

/**
 * The `ParseJson` schema offers a method to convert JSON strings into the `unknown` type using the underlying
 * functionality of `JSON.parse`. It also employs `JSON.stringify` for encoding.
 *
 * @category string constructors
 * @since 1.0.0
 */
export const ParseJson: Schema<string, unknown> = parseJson(string)

// ---------------------------------------------
// number filters
// ---------------------------------------------

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
export const GreaterThanTypeId = Symbol.for("@effect/schema/TypeId/GreaterThan")

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
export const GreaterThanOrEqualToTypeId = Symbol.for("@effect/schema/TypeId/GreaterThanOrEqualTo")

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
export const IntTypeId = Symbol.for("@effect/schema/TypeId/Int")

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
export const LessThanTypeId = Symbol.for("@effect/schema/TypeId/LessThan")

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
export const LessThanOrEqualToTypeId = Symbol.for("@effect/schema/TypeId/LessThanOrEqualTo")

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
export const BetweenTypeId = Symbol.for("@effect/schema/TypeId/Between")

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

// ---------------------------------------------
// number transformations
// ---------------------------------------------

/**
 * Clamps a number between a minimum and a maximum value.
 *
 * @category number transformations
 * @since 1.0.0
 */
export const clamp =
  (min: number, max: number) => <I, A extends number>(self: Schema<I, A>): Schema<I, A> =>
    transform(
      self,
      self.pipe(to, between(min, max)),
      (self) => N.clamp(self, min, max),
      identity,
      { strict: false }
    )

/**
 * This combinator transforms a `string` into a `number` by parsing the string using the `Number` function.
 *
 * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
 *
 * The following special string values are supported: "NaN", "Infinity", "-Infinity".
 *
 * @param self - The schema representing the input string
 *
 * @category number transformations
 * @since 1.0.0
 */
export const numberFromString = <I, A extends string>(self: Schema<I, A>): Schema<I, number> => {
  return transformOrFail(
    self,
    number,
    (s, _, ast) => {
      if (s === "NaN") {
        return ParseResult.success(NaN)
      }
      if (s === "Infinity") {
        return ParseResult.success(Infinity)
      }
      if (s === "-Infinity") {
        return ParseResult.success(-Infinity)
      }
      if (s.trim() === "") {
        return ParseResult.failure(ParseResult.type(ast, s))
      }
      const n = Number(s)
      return Number.isNaN(n)
        ? ParseResult.failure(ParseResult.type(ast, s))
        : ParseResult.success(n)
    },
    (n) => ParseResult.success(String(n)),
    { strict: false }
  )
}

// ---------------------------------------------
// number constructors
// ---------------------------------------------

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
 * This schema transforms a `string` into a `number` by parsing the string using the `Number` function.
 *
 * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
 *
 * The following special string values are supported: "NaN", "Infinity", "-Infinity".
 *
 * @category number constructors
 * @since 1.0.0
 */
export const NumberFromString: Schema<string, number> = numberFromString(string)

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

// ---------------------------------------------
// boolean transformations
// ---------------------------------------------

/**
 * Negates a boolean value
 *
 * @category boolean transformations
 * @since 1.0.0
 */
export const not = <I>(self: Schema<I, boolean>): Schema<I, boolean> =>
  transform(
    self,
    to(self),
    (self) => !self,
    (self) => !self
  )

// ---------------------------------------------
// boolean constructors
// ---------------------------------------------

/**
 * @category boolean constructors
 * @since 1.0.0
 */
export const Not: Schema<boolean> = not(boolean)

// ---------------------------------------------
// symbol transformations
// ---------------------------------------------

/**
 * This combinator transforms a `string` into a `symbol`.
 *
 * @param self - The schema representing the input string
 *
 * @category symbol transformations
 * @since 1.0.0
 */
export const symbolFromString = <I, A extends string>(self: Schema<I, A>): Schema<I, symbol> => {
  return transform(
    self,
    symbolFromSelf,
    (s) => Symbol.for(s),
    (sym) => sym.description,
    { strict: false }
  )
}

// ---------------------------------------------
// symbol constructors
// ---------------------------------------------

/**
 * This schema transforms a `string` into a `symbol`.
 *
 * @category symbol constructors
 * @since 1.0.0
 */
export const symbol: Schema<string, symbol> = symbolFromString(string)

// ---------------------------------------------
// bigint filters
// ---------------------------------------------

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanBigintTypeId = Symbol.for("@effect/schema/TypeId/GreaterThanBigint")

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
      typeId: GreaterThanBigintTypeId,
      description: min === 0n ? "a positive bigint" : `a bigint greater than ${min}n`,
      jsonSchema: { exclusiveMinimum: min },
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const GreaterThanOrEqualToBigintTypeId = Symbol.for(
  "@effect/schema/TypeId/GreaterThanOrEqualToBigint"
)

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
      typeId: GreaterThanOrEqualToBigintTypeId,
      description: min === 0n
        ? "a non-negative bigint"
        : `a bigint greater than or equal to ${min}n`,
      jsonSchema: { minimum: min },
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanBigintTypeId = Symbol.for("@effect/schema/TypeId/LessThanBigint")

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
      typeId: LessThanBigintTypeId,
      description: max === 0n ? "a negative bigint" : `a bigint less than ${max}n`,
      jsonSchema: { exclusiveMaximum: max },
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const LessThanOrEqualToBigintTypeId = Symbol.for(
  "@effect/schema/TypeId/LessThanOrEqualToBigint"
)

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
      typeId: LessThanOrEqualToBigintTypeId,
      description: max === 0n ? "a non-positive bigint" : `a bigint less than or equal to ${max}n`,
      jsonSchema: { maximum: max },
      ...options
    })
  )

/**
 * @category type id
 * @since 1.0.0
 */
export const BetweenBigintTypeId = Symbol.for("@effect/schema/TypeId/BetweenBigint")

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
      typeId: BetweenBigintTypeId,
      description: `a bigint between ${min}n and ${max}n`,
      jsonSchema: { maximum: max, minimum: min },
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

// ---------------------------------------------
// bigint transformations
// ---------------------------------------------

/**
 * Clamps a bigint between a minimum and a maximum value.
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const clampBigint =
  (min: bigint, max: bigint) => <I, A extends bigint>(self: Schema<I, A>): Schema<I, A> =>
    transform(
      self,
      self.pipe(to, betweenBigint(min, max)),
      (self) => BigInt_.clamp(self, min, max),
      identity,
      { strict: false }
    )

/**
 * This combinator transforms a `string` into a `bigint` by parsing the string using the `BigInt` function.
 *
 * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
 *
 * @param self - The schema representing the input string
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const bigintFromString = <I, A extends string>(self: Schema<I, A>): Schema<I, bigint> => {
  return transformOrFail(
    self,
    bigintFromSelf,
    (s, _, ast) => {
      if (s.trim() === "") {
        return ParseResult.failure(ParseResult.type(ast, s))
      }

      try {
        return ParseResult.success(BigInt(s))
      } catch (_) {
        return ParseResult.failure(ParseResult.type(ast, s))
      }
    },
    (n) => ParseResult.success(String(n)),
    { strict: false }
  )
}

/**
 * This combinator transforms a `number` into a `bigint` by parsing the number using the `BigInt` function.
 *
 * It returns an error if the value can't be safely encoded as a `number` due to being out of range.
 *
 * @param self - The schema representing the input number
 *
 * @category bigint transformations
 * @since 1.0.0
 */
export const bigintFromNumber = <I, A extends number>(self: Schema<I, A>): Schema<I, bigint> => {
  return transformOrFail(
    self,
    bigintFromSelf,
    (n, _, ast) => {
      try {
        return ParseResult.success(BigInt(n))
      } catch (_) {
        return ParseResult.failure(ParseResult.type(ast, n))
      }
    },
    (b, _, ast) => {
      if (b > Internal.maxSafeInteger || b < Internal.minSafeInteger) {
        return ParseResult.failure(ParseResult.type(ast, b))
      }

      return ParseResult.success(Number(b))
    },
    { strict: false }
  )
}

// ---------------------------------------------
// bigint constructors
// ---------------------------------------------

/**
 * This schema transforms a `string` into a `bigint` by parsing the string using the `BigInt` function.
 *
 * It returns an error if the value can't be converted (for example when non-numeric characters are provided).
 *
 * @category bigint constructors
 * @since 1.0.0
 */
export const bigint: Schema<string, bigint> = bigintFromString(string)

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
 * @category bigint constructors
 * @since 1.0.0
 */
export const BigintFromNumber: Schema<number, bigint> = bigintFromNumber(number)

// ---------------------------------------------
// Uint8Array constructors
// ---------------------------------------------

/**
 * @category Uint8Array constructors
 * @since 1.0.0
 */
export const Uint8ArrayFromSelf: Schema<Uint8Array> = declare(
  [],
  struct({}),
  () => (u, _, ast) =>
    !Predicate.isUint8Array(u)
      ? ParseResult.failure(ParseResult.type(ast, u))
      : ParseResult.success(u),
  {
    [AST.IdentifierAnnotationId]: "Uint8Array",
    [Internal.PrettyHookId]: (): Pretty<Uint8Array> => (u8arr) =>
      `new Uint8Array(${JSON.stringify(Array.from(u8arr))})`,
    [Internal.ArbitraryHookId]: (): Arbitrary<Uint8Array> => (fc) => fc.uint8Array()
  }
)

// ---------------------------------------------
// Uint8Array transformations
// ---------------------------------------------

/**
 * A combinator that transforms a `number` array into a `Uint8Array`.
 *
 * @category Uint8Array transformations
 * @since 1.0.0
 */
export const uint8ArrayFromNumbers = <I, A extends ReadonlyArray<number>>(
  self: Schema<I, A>
): Schema<I, Uint8Array> =>
  transform(
    self,
    Uint8ArrayFromSelf,
    (a) => Uint8Array.from(a),
    (n) => Array.from(n),
    { strict: false }
  )

const _Uint8Array: Schema<ReadonlyArray<number>, Uint8Array> = uint8ArrayFromNumbers(
  array(number.pipe(
    between(0, 255, {
      title: "8-bit unsigned integer",
      description: "a 8-bit unsigned integer"
    })
  ))
)

export {
  /**
   * A schema that transforms a `number` array into a `Uint8Array`.
   *
   * @category Uint8Array constructors
   * @since 1.0.0
   */
  _Uint8Array as Uint8Array
}

// ---------------------------------------------
// Encoding transformations
// ---------------------------------------------

const makeEncodingTransform = <A extends string>(
  id: string,
  decode: (s: A) => Either.Either<Encoding.DecodeException, Uint8Array>,
  encode: (u: Uint8Array) => string,
  arbitrary: Arbitrary<Uint8Array>
) =>
<I, A2 extends A>(
  self: Schema<I, A2>
): Schema<I, Uint8Array> =>
  transformOrFail(
    self,
    Uint8ArrayFromSelf,
    (s, _, ast) =>
      Either.mapLeft(
        decode(s),
        (decodeException) =>
          ParseResult.parseError([ParseResult.type(ast, s, decodeException.message)])
      ),
    (u) => ParseResult.success(encode(u)),
    { strict: false }
  ).pipe(annotations({
    [AST.IdentifierAnnotationId]: id,
    [Internal.PrettyHookId]: (): Pretty<Uint8Array> => (u) => `${id}(${encode(u)})`,
    [Internal.ArbitraryHookId]: () => arbitrary
  }))

/**
 * Transforms a base64 `string` into a `Uint8Array`.
 *
 * @category encoding transformations
 * @since 1.0.0
 */
export const base64: <I, A extends string>(self: Schema<I, A>) => Schema<I, Uint8Array> =
  makeEncodingTransform(
    "Base64",
    Encoding.decodeBase64,
    Encoding.encodeBase64,
    (fc) => fc.base64String().map((s) => Either.getOrThrow(Encoding.decodeBase64(s)))
  )

/**
 * Transforms a base64url `string` into a `Uint8Array`.
 *
 * @category encoding transformations
 * @since 1.0.0
 */
export const base64url: <I, A extends string>(self: Schema<I, A>) => Schema<I, Uint8Array> =
  makeEncodingTransform(
    "Base64Url",
    Encoding.decodeBase64Url,
    Encoding.encodeBase64Url,
    (fc) => fc.base64String().map((s) => Either.getOrThrow(Encoding.decodeBase64Url(s)))
  )

/**
 * Transforms a hex `string` into a `Uint8Array`.
 *
 * @category encoding transformations
 * @since 1.0.0
 */
export const hex: <I, A extends string>(self: Schema<I, A>) => Schema<I, Uint8Array> =
  makeEncodingTransform(
    "Hex",
    Encoding.decodeHex,
    Encoding.encodeHex,
    (fc) => fc.hexaString().map((s) => Either.getOrThrow(Encoding.decodeHex(s)))
  )

// ---------------------------------------------
// Encoding constructors
// ---------------------------------------------

/**
 * @category encoding constructors
 * @since 1.0.0
 */
export const Base64: Schema<string, Uint8Array> = base64(string)

/**
 * @category encoding constructors
 * @since 1.0.0
 */
export const Base64Url: Schema<string, Uint8Array> = base64url(string)

/**
 * @category encoding constructors
 * @since 1.0.0
 */
export const Hex: Schema<string, Uint8Array> = hex(string)

// ---------------------------------------------
// ReadonlyArray filters
// ---------------------------------------------

/**
 * @category type id
 * @since 1.0.0
 */
export const MinItemsTypeId = Symbol.for("@effect/schema/TypeId/MinItems")

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
export const MaxItemsTypeId = Symbol.for("@effect/schema/TypeId/MaxItems")

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
export const ItemsCountTypeId = Symbol.for("@effect/schema/TypeId/ItemsCount")

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

// ---------------------------------------------
// Date filters
// ---------------------------------------------

/**
 * @category type id
 * @since 1.0.0
 */
export const ValidDateTypeId = Symbol.for("@effect/schema/TypeId/ValidDate")

/**
 * A filter excluding invalid dates (e.g. `new Date("fail")`).
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

// ---------------------------------------------
// Date constructors
// ---------------------------------------------

const dateArbitrary = (): Arbitrary<Date> => (fc) => fc.date()

const datePretty = (): Pretty<Date> => (date) => `new Date(${JSON.stringify(date)})`

/**
 * @category Date constructors
 * @since 1.0.0
 */
export const DateFromSelf: Schema<Date> = declare(
  [],
  struct({}),
  () => (u, _, ast) =>
    !Predicate.isDate(u) ? ParseResult.failure(ParseResult.type(ast, u)) : ParseResult.success(u),
  {
    [AST.IdentifierAnnotationId]: "Date",
    [Internal.PrettyHookId]: datePretty,
    [Internal.ArbitraryHookId]: dateArbitrary
  }
)

/**
 * A schema representing valid dates, e.g. `new Date("fail")` is excluded, even though it is an instance of `Date`.
 *
 * @category Date constructors
 * @since 1.0.0
 */
export const ValidDateFromSelf: Schema<Date> = DateFromSelf.pipe(validDate())

// ---------------------------------------------
// Date transformations
// ---------------------------------------------

/**
 * A combinator that transforms a `string` into a valid `Date`.
 *
 * @category Date transformations
 * @since 1.0.0
 */
export const dateFromString = <I, A extends string>(self: Schema<I, A>): Schema<I, Date> =>
  transform(
    self,
    ValidDateFromSelf,
    (s) => new Date(s),
    (n) => n.toISOString(),
    { strict: false }
  )

const _Date: Schema<string, Date> = dateFromString(string)

/**
 * A schema representing valid dates, e.g. `new Date("fail")` is excluded, even though it is an instance of `Date`.
 *
 * @category Date constructors
 * @since 1.0.0
 */
export const ValidDate: Schema<string, Date> = _Date.pipe(validDate())

export {
  /**
   * A schema that transforms a `string` into a valid `Date`.
   *
   * @category Date constructors
   * @since 1.0.0
   */
  _Date as Date
}

// ---------------------------------------------
// Option transformations
// ---------------------------------------------

const optionArbitrary = <A>(value: Arbitrary<A>): Arbitrary<Option.Option<A>> => (fc) =>
  fc.oneof(fc.constant(Option.none()), value(fc).map(Option.some))

const optionPretty = <A>(value: Pretty<A>): Pretty<Option.Option<A>> =>
  Option.match({
    onNone: () => "none()",
    onSome: (a) => `some(${value(a)})`
  })

const optionInline = <I, A>(value: Schema<I, A>) =>
  union(
    struct({
      _tag: literal("None")
    }),
    struct({
      _tag: literal("Some"),
      value
    })
  )

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromSelf = <I, A>(
  value: Schema<I, A>
): Schema<Option.Option<I>, Option.Option<A>> => {
  return declare(
    [value],
    optionInline(value),
    (isDecoding, value) => {
      const parse = isDecoding ? Parser.parse(value) : Parser.encode(value)
      return (u, options, ast) =>
        !Option.isOption(u) ?
          ParseResult.failure(ParseResult.type(ast, u)) :
          Option.isNone(u) ?
          ParseResult.success(Option.none()) :
          ParseResult.map(parse(u.value, options), Option.some)
    },
    {
      [AST.IdentifierAnnotationId]: "Option",
      [Internal.PrettyHookId]: optionPretty,
      [Internal.ArbitraryHookId]: optionArbitrary
    }
  )
}

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const option = <I, A>(
  value: Schema<I, A>
): Schema<
  { readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: I },
  Option.Option<A>
> =>
  transform(
    optionInline(value),
    to(optionFromSelf(value)),
    (a) => a._tag === "None" ? Option.none() : Option.some(a.value),
    Option.match({
      onNone: () => ({ _tag: "None" as const }),
      onSome: (value) => ({ _tag: "Some" as const, value })
    })
  )

/**
 * @category Option transformations
 * @since 1.0.0
 */
export const optionFromNullable = <I, A>(
  value: Schema<I, A>
): Schema<I | null, Option.Option<A>> =>
  transform(nullable(value), to(optionFromSelf(value)), Option.fromNullable, Option.getOrNull)

// ---------------------------------------------
// Either transformations
// ---------------------------------------------

const eitherArbitrary = <E, A>(
  left: Arbitrary<E>,
  right: Arbitrary<A>
): Arbitrary<Either.Either<E, A>> =>
(fc) => fc.oneof(left(fc).map(Either.left), right(fc).map(Either.right))

const eitherPretty = <E, A>(left: Pretty<E>, right: Pretty<A>): Pretty<Either.Either<E, A>> =>
  Either.match({
    onLeft: (e) => `left(${left(e)})`,
    onRight: (a) => `right(${right(a)})`
  })

const eitherInline = <IE, E, IA, A>(left: Schema<IE, E>, right: Schema<IA, A>) =>
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
    eitherInline(left, right),
    (isDecoding, left, right) => {
      const parseLeft = isDecoding ? Parser.parse(left) : Parser.encode(left)
      const parseRight = isDecoding ? Parser.parse(right) : Parser.encode(right)
      return (u, options, ast) =>
        !Either.isEither(u) ?
          ParseResult.failure(ParseResult.type(ast, u)) :
          Either.isLeft(u) ?
          ParseResult.map(parseLeft(u.left, options), Either.left) :
          ParseResult.map(parseRight(u.right, options), Either.right)
    },
    {
      [AST.IdentifierAnnotationId]: "Either",
      [Internal.PrettyHookId]: eitherPretty,
      [Internal.ArbitraryHookId]: eitherArbitrary
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
): Schema<
  { readonly _tag: "Left"; readonly left: IE } | { readonly _tag: "Right"; readonly right: IA },
  Either.Either<E, A>
> =>
  transform(
    eitherInline(left, right),
    to(eitherFromSelf(left, right)),
    (a) => a._tag === "Left" ? Either.left(a.left) : Either.right(a.right),
    Either.match({
      onLeft: (left) => ({ _tag: "Left" as const, left }),
      onRight: (right) => ({ _tag: "Right" as const, right })
    })
  )

// ---------------------------------------------
// ReadonlyMap transformations
// ---------------------------------------------

const isMap = (u: unknown): u is Map<unknown, unknown> => u instanceof Map

const readonlyMapArbitrary = <K, V>(
  key: Arbitrary<K>,
  value: Arbitrary<V>
): Arbitrary<ReadonlyMap<K, V>> =>
(fc) => fc.array(fc.tuple(key(fc), value(fc))).map((as) => new Map(as))

const readonlyMapPretty = <K, V>(
  key: Pretty<K>,
  value: Pretty<V>
): Pretty<ReadonlyMap<K, V>> =>
(map) =>
  `new Map([${
    Array.from(map.entries())
      .map(([k, v]) => `[${key(k)}, ${value(v)}]`)
      .join(", ")
  }])`

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
      size: number
    }),
    (isDecoding, key, value) => {
      const parse = isDecoding
        ? Parser.parse(array(tuple(key, value)))
        : Parser.encode(array(tuple(key, value)))
      return (u, options, ast) =>
        !isMap(u) ?
          ParseResult.failure(ParseResult.type(ast, u)) :
          ParseResult.map(parse(Array.from(u.entries()), options), (as) => new Map(as))
    },
    {
      [AST.IdentifierAnnotationId]: "ReadonlyMap",
      [Internal.PrettyHookId]: readonlyMapPretty,
      [Internal.ArbitraryHookId]: readonlyMapArbitrary
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
    to(readonlyMapFromSelf(key, value)),
    (as) => new Map(as),
    (map) => Array.from(map.entries())
  )

// ---------------------------------------------
// ReadonlySet transformations
// ---------------------------------------------

const isSet = (u: unknown): u is Set<unknown> => u instanceof Set

const readonlySetArbitrary = <A>(item: Arbitrary<A>): Arbitrary<ReadonlySet<A>> => (fc) =>
  fc.array(item(fc)).map((as) => new Set(as))

const readonlySetPretty = <A>(item: Pretty<A>): Pretty<ReadonlySet<A>> => (set) =>
  `new Set([${Array.from(set.values()).map((a) => item(a)).join(", ")}])`

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
      size: number
    }),
    (isDecoding, item) => {
      const parse = isDecoding ? Parser.parse(array(item)) : Parser.encode(array(item))
      return (u, options, ast) =>
        !isSet(u) ?
          ParseResult.failure(ParseResult.type(ast, u)) :
          ParseResult.map(parse(Array.from(u.values()), options), (as) => new Set(as))
    },
    {
      [AST.IdentifierAnnotationId]: "ReadonlySet",
      [Internal.PrettyHookId]: readonlySetPretty,
      [Internal.ArbitraryHookId]: readonlySetArbitrary
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
    to(readonlySetFromSelf(item)),
    (as) => new Set(as),
    (set) => Array.from(set)
  )

// ---------------------------------------------
// Chunk transformations
// ---------------------------------------------

const chunkArbitrary = <A>(item: Arbitrary<A>): Arbitrary<Chunk.Chunk<A>> => (fc) =>
  fc.array(item(fc)).map(Chunk.fromIterable)

const chunkPretty = <A>(item: Pretty<A>): Pretty<Chunk.Chunk<A>> => (c) =>
  `Chunk(${Chunk.toReadonlyArray(c).map(item).join(", ")})`

/**
 * @category Chunk transformations
 * @since 1.0.0
 */
export const chunkFromSelf = <I, A>(item: Schema<I, A>): Schema<Chunk.Chunk<I>, Chunk.Chunk<A>> => {
  return declare(
    [item],
    struct({
      _id: uniqueSymbol(Symbol.for("effect/Chunk")),
      length: number
    }),
    (isDecoding, item) => {
      const parse = isDecoding ? Parser.parse(array(item)) : Parser.encode(array(item))
      return (u, options, ast) => {
        if (Chunk.isChunk(u)) {
          return Chunk.isEmpty(u)
            ? ParseResult.success(u)
            : ParseResult.map(parse(Chunk.toReadonlyArray(u), options), Chunk.fromIterable)
        }
        return ParseResult.failure(ParseResult.type(ast, u))
      }
    },
    {
      [AST.IdentifierAnnotationId]: "Chunk",
      [Internal.PrettyHookId]: chunkPretty,
      [Internal.ArbitraryHookId]: chunkArbitrary
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
    to(chunkFromSelf(item)),
    (as) => as.length === 0 ? Chunk.empty() : Chunk.fromIterable(as),
    Chunk.toReadonlyArray
  )

// ---------------------------------------------
// Data transformations
// ---------------------------------------------

const toData = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(a: A): Data.Data<A> =>
  Array.isArray(a) ? Data.array(a) : Data.struct(a)

const dataArbitrary = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Arbitrary<A>
): Arbitrary<Data.Data<A>> =>
(fc) => item(fc).map(toData)

const dataPretty = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Pretty<A>
): Pretty<Data.Data<A>> =>
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
        !Equal.isEqual(u) ?
          ParseResult.failure(ParseResult.type(ast, u)) :
          ParseResult.map(parse(u, options), toData)
    },
    {
      [AST.IdentifierAnnotationId]: "Data",
      [Internal.PrettyHookId]: dataPretty,
      [Internal.ArbitraryHookId]: dataArbitrary
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
    to(dataFromSelf(item)),
    toData,
    (a) => Array.isArray(a) ? Array.from(a) : Object.assign({}, a),
    { strict: false }
  )

// ---------------------------------------------
// classes
// ---------------------------------------------

type MissingSelfGeneric<Usage extends string> =
  `Missing \`Self\` generic - use \`class Self extends ${Usage}<Self>()({ ... })\``

/**
 * @category classes
 * @since 1.0.0
 */
export interface Class<I, A, Self, Inherited = Data.Case> extends Schema<I, Self> {
  new(props: A): A & Omit<Inherited, keyof A>

  readonly struct: Schema<I, A>

  readonly extend: <Extended>() => <FieldsB extends StructFields>(
    fields: FieldsB
  ) => [unknown] extends [Extended] ? MissingSelfGeneric<"Base.extend">
    : Class<
      Simplify<Omit<I, keyof FieldsB> & FromStruct<FieldsB>>,
      Simplify<Omit<A, keyof FieldsB> & ToStruct<FieldsB>>,
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
  : Class<Simplify<FromStruct<Fields>>, Simplify<ToStruct<Fields>>, Self> =>
  makeClass(struct(fields), fields, Data.Class.prototype)

const makeClass = <I, A>(selfSchema: Schema<I, A>, selfFields: StructFields, base: any) => {
  const validator = Parser.validateSync(selfSchema)

  const fn = function(this: any, props: unknown) {
    Object.assign(this, validator(props))
  } as any
  fn.prototype = Object.create(base)
  fn[TypeId] = variance
  fn.pipe = function pipe() {
    return pipeArguments(this, arguments)
  }
  Object.defineProperty(fn, "ast", {
    get() {
      if (this._ast) {
        return this._ast
      }
      const toSchema = to(selfSchema)
      this._ast = transform(
        selfSchema,
        declare([toSchema], toSchema, () => (input, _, ast) =>
          input instanceof this
            ? ParseResult.success(input)
            : ParseResult.failure(ParseResult.type(ast, input)), {
          [AST.DescriptionAnnotationId]: `an instance of ${this.name}`,
          [Internal.ArbitraryHookId]: (struct: any) => (fc: any) =>
            struct(fc).map((props: any) => new this(props))
        }),
        (input) => Object.assign(Object.create(this.prototype), input),
        (input) => ({ ...input })
      ).ast
      return this._ast
    }
  })
  fn.struct = selfSchema
  fn.extend = function() {
    return (fields: any) => {
      const newFields = { ...selfFields, ...fields }
      return makeClass(
        struct(newFields),
        newFields,
        this.prototype
      )
    }
  }
  fn.transform = function() {
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
        this.prototype
      )
    }
  }
  fn.transformFrom = function() {
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
        this.prototype
      )
    }
  }

  return fn
}
