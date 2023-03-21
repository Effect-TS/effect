/**
 * @since 1.0.0
 */

import * as B from "@effect/data/Bigint"
import type { Brand } from "@effect/data/Brand"
import { RefinedConstructorsTypeId } from "@effect/data/Brand"
import type { Chunk } from "@effect/data/Chunk"
import * as C from "@effect/data/Chunk"
import * as D from "@effect/data/Data"
import type { Either } from "@effect/data/Either"
import * as E from "@effect/data/Either"
import * as Equal from "@effect/data/Equal"
import { dual, identity, pipe } from "@effect/data/Function"
import * as N from "@effect/data/Number"
import type { Option } from "@effect/data/Option"
import * as O from "@effect/data/Option"
import type { Predicate, Refinement } from "@effect/data/Predicate"
import { isDate } from "@effect/data/Predicate"
import * as RA from "@effect/data/ReadonlyArray"
import { untracedMethod } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Arbitrary } from "@effect/schema/Arbitrary"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import * as I from "@effect/schema/internal/common"
import * as P from "@effect/schema/Parser"
import type { ParseResult } from "@effect/schema/ParseResult"
import * as PR from "@effect/schema/ParseResult"
import type { Pretty } from "@effect/schema/Pretty"
import { formatErrors } from "@effect/schema/TreeFormatter"

/**
 * @category model
 * @since 1.0.0
 */
export interface Schema<From, To = From> {
  readonly From: (_: From) => From
  readonly To: (_: To) => To
  readonly ast: AST.AST
}

/**
 * @since 1.0.0
 */
export type From<S extends { readonly From: (_: any) => any }> = Parameters<S["From"]>[0]

/**
 * @since 1.0.0
 */
export type To<S extends { readonly To: (_: any) => any }> = Parameters<S["To"]>[0]

/**
 * @since 1.0.0
 */
export const from = <I, A>(schema: Schema<I, A>): Schema<I> => make(AST.getFrom(schema.ast))

/**
 * @since 1.0.0
 */
export const to = <I, A>(schema: Schema<I, A>): Schema<A> => make(AST.getTo(schema.ast))

/**
 * @since 1.0.0
 */
export const reverse = <I, A>(schema: Schema<I, A>): Schema<A, I> => make(AST.reverse(schema.ast))

/* c8 ignore start */
export {
  /**
   * @since 1.0.0
   */
  asserts,
  /**
   * @since 1.0.0
   */
  decode,
  /**
   * @since 1.0.0
   */
  decodeEffect,
  /**
   * @since 1.0.0
   */
  decodeEither,
  /**
   * @since 1.0.0
   */
  decodeOption,
  /**
   * @since 1.0.0
   */
  decodePromise,
  /**
   * @since 1.0.0
   */
  decodeResult,
  /**
   * @since 1.0.0
   */
  encode,
  /**
   * @since 1.0.0
   */
  encodeEffect,
  /**
   * @since 1.0.0
   */
  encodeEither,
  /**
   * @since 1.0.0
   */
  encodeOption,
  /**
   * @since 1.0.0
   */
  encodePromise,
  /**
   * @since 1.0.0
   */
  encodeResult,
  /**
   * @since 1.0.0
   */
  is,
  /**
   * @since 1.0.0
   */
  parse,
  /**
   * @since 1.0.0
   */
  parseEffect,
  /**
   * @since 1.0.0
   */
  parseEither,
  /**
   * @since 1.0.0
   */
  parseOption,
  /**
   * @since 1.0.0
   */
  parsePromise,
  /**
   * @since 1.0.0
   */
  parseResult,
  /**
   * @since 1.0.0
   */
  validate,
  /**
   * @since 1.0.0
   */
  validateEffect,
  /**
   * @since 1.0.0
   */
  validateEither,
  /**
   * @since 1.0.0
   */
  validateOption,
  /**
   * @since 1.0.0
   */
  validatePromise,
  /**
   * @since 1.0.0
   */
  validateResult
} from "@effect/schema/Parser"

export type {
  /**
   * @since 1.0.0
   */
  ToAsserts
} from "@effect/schema/Parser"
/* c8 ignore end */

// ---------------------------------------------
// constructors
// ---------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <I, A>(ast: AST.AST) => Schema<I, A> = I.makeSchema

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
): Schema<Join<{ [K in keyof T]: To<T[K]> }>> => {
  let types: ReadonlyArray<AST.TemplateLiteral | AST.Literal> = getTemplateLiterals(head.ast)
  for (const span of tail) {
    types = pipe(
      types,
      RA.flatMap((a) => getTemplateLiterals(span.ast).map((b) => combineTemplateLiterals(a, b)))
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
      pipe(
        a.spans,
        RA.modifyNonEmptyLast((span) => ({ ...span, literal: span.literal + String(b.literal) }))
      )
    )
  }
  return AST.createTemplateLiteral(
    a.head,
    pipe(
      a.spans,
      RA.modifyNonEmptyLast((span) => ({ ...span, literal: span.literal + String(b.head) })),
      RA.appendAll(b.spans)
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
      return pipe(ast.types, RA.flatMap(getTemplateLiterals))
    default:
      throw new Error(`Unsupported template literal span ${ast._tag}`)
  }
}

/**
  @category combinators
  @since 1.0.0
*/
export const declare = (
  typeParameters: ReadonlyArray<Schema<any>>,
  type: Schema<any>,
  decode: (
    ...typeParameters: ReadonlyArray<Schema<any>>
  ) => (input: unknown, options?: ParseOptions) => ParseResult<any>,
  annotations?: AST.Annotated["annotations"]
): Schema<any> =>
  make(AST.createDeclaration(
    typeParameters.map((tp) => tp.ast),
    type.ast,
    (...typeParameters) => decode(...typeParameters.map(make)),
    annotations
  ))

// ---------------------------------------------
// combinators
// ---------------------------------------------

/**
 * @category combinators
 * @since 1.0.0
 */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Schema<From<Members[number]>, To<Members[number]>> =>
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
  { readonly [K in keyof Elements]: From<Elements[K]> },
  { readonly [K in keyof Elements]: To<Elements[K]> }
> =>
  make(
    AST.createTuple(elements.map((schema) => AST.createElement(schema.ast, false)), O.none(), true)
  )

/**
 * @category combinators
 * @since 1.0.0
 */
export const rest = <IR, R>(rest: Schema<IR, R>) =>
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
export const element = <IE, E>(element: Schema<IE, E>) =>
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
export const optionalElement = <IE, E>(element: Schema<IE, E>) =>
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
  make(AST.createTuple([], O.some([item.ast]), true))

/**
 * @category combinators
 * @since 1.0.0
 */
export const nonEmptyArray = <I, A>(
  item: Schema<I, A>
): Schema<readonly [I, ...Array<I>], readonly [A, ...Array<A>]> => pipe(tuple(item), rest(item))

/**
 * @since 1.0.0
 */
export type Spread<A> = {
  [K in keyof A]: A[K]
} extends infer B ? B : never

/**
 * @since 1.0.0
 */
export const OptionalSchemaId = Symbol.for("@effect/schema/Schema/OptionalSchema")

/**
 * @since 1.0.0
 */
export type OptionalSchemaId = typeof OptionalSchemaId

/**
 * @since 1.0.0
 */
export interface OptionalSchema<From, To = From> {
  readonly From: (_: From) => From
  readonly To: (_: To) => To
  readonly _id: OptionalSchemaId
}

const isOptionalSchema = <I, A>(schema: object): schema is OptionalSchema<I, A> =>
  "_id" in schema && schema["_id"] === OptionalSchemaId

/**
 * @since 1.0.0
 */
export const optional = <I, A>(schema: Schema<I, A>): OptionalSchema<I, A> => {
  const out: any = make(schema.ast)
  out["_id"] = OptionalSchemaId
  return out
}

/**
 * @since 1.0.0
 */
export type OptionalKeys<T> = {
  [K in keyof T]: T[K] extends OptionalSchema<any> ? K : never
}[keyof T]

/**
 * @category combinators
 * @since 1.0.0
 */
export const struct = <Fields extends Record<PropertyKey, Schema<any> | OptionalSchema<any>>>(
  fields: Fields
): Schema<
  Spread<
    & { readonly [K in Exclude<keyof Fields, OptionalKeys<Fields>>]: From<Fields[K]> }
    & { readonly [K in OptionalKeys<Fields>]?: From<Fields[K]> }
  >,
  Spread<
    & { readonly [K in Exclude<keyof Fields, OptionalKeys<Fields>>]: To<Fields[K]> }
    & { readonly [K in OptionalKeys<Fields>]?: To<Fields[K]> }
  >
> =>
  make(
    AST.createTypeLiteral(
      Reflect.ownKeys(fields).map((key) =>
        AST.createPropertySignature(
          key,
          (fields[key] as any).ast,
          isOptionalSchema(fields[key]),
          true
        )
      ),
      []
    )
  )

/**
 * @category combinators
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  <I extends Record<keyof A, any>>(
    self: Schema<I, A>
  ): Schema<{ readonly [P in Keys[number]]: I[P] }, { readonly [P in Keys[number]]: A[P] }> =>
    make(AST.pick(self.ast, keys))

/**
 * @category combinators
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  <I extends Record<keyof A, any>>(
    self: Schema<I, A>
  ): Schema<
    { readonly [P in Exclude<keyof A, Keys[number]>]: I[P] },
    { readonly [P in Exclude<keyof A, Keys[number]>]: A[P] }
  > => make(AST.omit(self.ast, keys))

/**
 * Returns an object containing all property signatures of a given schema.
 *
 * ```
 * Schema<A> -> { [K in keyof A]: Schema<A[K]> }
 * ```
 *
 * @param schema - The schema to extract property signatures from.
 *
 * @example
 * import * as S from "@effect/schema/Schema"
 *
 * const Person = S.struct({
 *   name: S.string,
 *   age: S.number
 * })
 *
 * const shape = S.getPropertySignatures(Person)
 *
 * assert.deepStrictEqual(shape.name, S.string)
 * assert.deepStrictEqual(shape.age, S.number)
 *
 * @since 1.0.0
 */
export const getPropertySignatures = <I extends Record<keyof A, any>, A>(
  schema: Schema<I, A>
): { [K in keyof A]: Schema<I[K], A[K]> } => {
  const out: Record<PropertyKey, Schema<any>> = {}
  const propertySignatures = AST._getPropertySignatures(schema.ast)
  for (const propertySignature of propertySignatures) {
    out[propertySignature.name] = make(propertySignature.type)
  }
  return out as any
}

/**
 * @category model
 * @since 1.0.0
 */
export interface BrandSchema<From, To extends Brand<any>>
  extends Schema<From, To>, Brand.Constructor<To>
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
 * import * as S from "@effect/schema/Schema"
 * import { pipe } from "@effect/data/Function"
 *
 * const Int = pipe(S.number, S.int(), S.brand("Int"))
 * type Int = S.To<typeof Int> // number & Brand<"Int">
 *
 * @category combinators
 * @since 1.0.0
 */
export const brand = <B extends string, A>(
  brand: B,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): BrandSchema<I, A & Brand<B>> => {
    const annotations = toAnnotations(options)
    annotations[AST.BrandAnnotationId] = [...getBrands(self.ast), brand]
    const ast = AST.mergeAnnotations(self.ast, annotations)
    const schema = make(ast)
    const validate = P.validate(schema)
    const validateOption = P.validateOption(schema)
    const validateEither = P.validateEither(schema)
    const is = P.is(schema)
    const out: any = Object.assign((input: unknown) => validate(input), {
      [RefinedConstructorsTypeId]: RefinedConstructorsTypeId,
      ast,
      option: (input: unknown) => validateOption(input),
      either: (input: unknown) =>
        E.mapLeft(
          validateEither(input),
          (e) => [{ meta: input, message: formatErrors(e.errors) }]
        ),
      refine: (input: unknown): input is A & Brand<B> => is(input)
    })
    return out
  }

const getBrands = (ast: AST.AST): Array<string> =>
  (ast.annotations[AST.BrandAnnotationId] as Array<string> | undefined) || []

/**
 * @category combinators
 * @since 1.0.0
 */
export const partial = <I, A>(self: Schema<I, A>): Schema<Partial<I>, Partial<A>> =>
  make(AST.partial(self.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const record = <K extends string | symbol, I, A>(
  key: Schema<K>,
  value: Schema<I, A>
): Schema<{ readonly [k in K]: I }, { readonly [k in K]: A }> =>
  make(AST.createRecord(key.ast, value.ast, true))

const isOverlappingPropertySignatures = (x: AST.TypeLiteral, y: AST.TypeLiteral): boolean =>
  x.propertySignatures.some((px) => y.propertySignatures.some((py) => px.name === py.name))

const isOverlappingIndexSignatures = (x: AST.TypeLiteral, y: AST.TypeLiteral): boolean =>
  x.indexSignatures.some((ix) =>
    y.indexSignatures.some((iy) => {
      const keyofx = AST._getParameterKeyof(ix.parameter)
      const keyofy = AST._getParameterKeyof(iy.parameter)
      // there cannot be two string index signatures or two symbol index signatures at the same time
      return (AST.isStringKeyword(keyofx) && AST.isStringKeyword(keyofy)) ||
        (AST.isSymbolKeyword(keyofx) && AST.isSymbolKeyword(keyofy))
    })
  )

const intersectUnionMembers = (xs: ReadonlyArray<AST.AST>, ys: ReadonlyArray<AST.AST>) => {
  if (xs.every(AST.isTypeLiteral) && ys.every(AST.isTypeLiteral)) {
    return AST.createUnion(
      xs.flatMap((x) =>
        ys.map((y) => {
          if (isOverlappingPropertySignatures(x, y)) {
            throw new Error("`extend` cannot handle overlapping property signatures")
          }
          if (isOverlappingIndexSignatures(x, y)) {
            throw new Error("`extend` cannot handle overlapping index signatures")
          }
          return AST.createTypeLiteral(
            x.propertySignatures.concat(y.propertySignatures),
            x.indexSignatures.concat(y.indexSignatures)
          )
        })
      )
    )
  }
  throw new Error("`extend` can only handle type literals or unions of type literals")
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const extend = <IB, B>(that: Schema<IB, B>) =>
  <I, A>(self: Schema<I, A>): Schema<Spread<I & IB>, Spread<A & B>> =>
    make(
      intersectUnionMembers(
        AST.isUnion(self.ast) ? self.ast.types : [self.ast],
        AST.isUnion(that.ast) ? that.ast.types : [that.ast]
      )
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
 * @since 1.0.0
 */
export type AnnotationOptions<A> = {
  typeId?: AST.TypeAnnotation | { id: AST.TypeAnnotation; params: unknown }
  message?: AST.MessageAnnotation<A>
  identifier?: AST.IdentifierAnnotation
  title?: AST.TitleAnnotation
  description?: AST.DescriptionAnnotation
  examples?: AST.ExamplesAnnotation
  documentation?: AST.DocumentationAnnotation
  jsonSchema?: AST.JSONSchemaAnnotation
}

const toAnnotations = <A>(
  options?: AnnotationOptions<A>
): AST.Annotated["annotations"] => {
  const annotations: AST.Annotated["annotations"] = {}
  if (options?.typeId !== undefined) {
    const typeId = options?.typeId
    if (typeof typeId === "object") {
      annotations[AST.TypeAnnotationId] = typeId.id
      annotations[typeId.id] = typeId.params
    } else {
      annotations[AST.TypeAnnotationId] = typeId
    }
  }
  if (options?.message !== undefined) {
    annotations[AST.MessageAnnotationId] = options?.message
  }
  if (options?.identifier !== undefined) {
    annotations[AST.IdentifierAnnotationId] = options?.identifier
  }
  if (options?.title !== undefined) {
    annotations[AST.TitleAnnotationId] = options?.title
  }
  if (options?.description !== undefined) {
    annotations[AST.DescriptionAnnotationId] = options?.description
  }
  if (options?.examples !== undefined) {
    annotations[AST.ExamplesAnnotationId] = options?.examples
  }
  if (options?.documentation !== undefined) {
    annotations[AST.DocumentationAnnotationId] = options?.documentation
  }
  if (options?.jsonSchema !== undefined) {
    annotations[AST.JSONSchemaAnnotationId] = options?.jsonSchema
  }
  return annotations
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, B>
export function filter<A>(
  predicate: Predicate<A>,
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A>
export function filter<A>(
  predicate: Predicate<A>,
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> {
  return (self) => {
    const decode = (a: A) => predicate(a) ? PR.success(a) : PR.failure(PR.type(ast, a))
    const ast = AST.createRefinement(
      self.ast,
      AST.getTo(self.ast),
      decode,
      decode,
      toAnnotations(options)
    )
    return make(ast)
  }
}

/**
  Create a new `Schema` by transforming the input and output of an existing `Schema`
  using the provided decoding functions.

  @category combinators
  @since 1.0.0
 */
export const transformEffect: {
  <I2, A2, A1>(
    to: Schema<I2, A2>,
    decode: (a1: A1, options?: ParseOptions) => ParseResult<I2>,
    encode: (i2: I2, options?: ParseOptions) => ParseResult<A1>
  ): <I1>(self: Schema<I1, A1>) => Schema<I1, A2>
  <I1, A1, I2, A2>(
    from: Schema<I1, A1>,
    to: Schema<I2, A2>,
    decode: (a1: A1, options?: ParseOptions) => ParseResult<I2>,
    encode: (i2: I2, options?: ParseOptions) => ParseResult<A1>
  ): Schema<I1, A2>
} = dual(4, <I1, A1, I2, A2>(
  from: Schema<I1, A1>,
  to: Schema<I2, A2>,
  decode: (a1: A1, options?: ParseOptions) => ParseResult<I2>,
  encode: (i2: I2, options?: ParseOptions) => ParseResult<A1>
): Schema<I1, A2> => make(AST.createTransform(from.ast, to.ast, decode, encode)))

/**
  Create a new `Schema` by transforming the input and output of an existing `Schema`
  using the provided decoding functions.

  @category combinators
  @since 1.0.0
 */
export const transformEither: {
  <I2, A2, A1>(
    to: Schema<I2, A2>,
    decode: (
      a1: A1,
      options?: ParseOptions
    ) => E.Either<PR.ParseError, I2>,
    encode: (
      i2: I2,
      options?: ParseOptions
    ) => E.Either<PR.ParseError, A1>
  ): <I1>(self: Schema<I1, A1>) => Schema<I1, A2>
  <I1, A1, I2, A2>(
    from: Schema<I1, A1>,
    to: Schema<I2, A2>,
    decode: (
      a1: A1,
      options?: ParseOptions
    ) => E.Either<PR.ParseError, I2>,
    encode: (
      i2: I2,
      options?: ParseOptions
    ) => E.Either<PR.ParseError, A1>
  ): Schema<I1, A2>
} = dual(4, <I1, A1, I2, A2>(
  from: Schema<I1, A1>,
  to: Schema<I2, A2>,
  decode: (
    a1: A1,
    options?: ParseOptions
  ) => E.Either<PR.ParseError, I2>,
  encode: (i2: I2, options?: ParseOptions) => E.Either<PR.ParseError, A1>
): Schema<I1, A2> =>
  make(
    AST.createTransform(from.ast, to.ast, (i, o) =>
      Effect.fromEither(decode(i, o)), (i, o) =>
      Effect.fromEither(encode(i, o)))
  ))

/**
  Create a new `Schema` by transforming the input and output of an existing `Schema`
  using the provided mapping functions.

  @category combinators
  @since 1.0.0
*/
export const transform: {
  <I2, A2, A1>(
    to: Schema<I2, A2>,
    decode: (a1: A1) => I2,
    encode: (i2: I2) => A1
  ): <I1>(self: Schema<I1, A1>) => Schema<I1, A2>
  <I1, A1, I2, A2>(
    from: Schema<I1, A1>,
    to: Schema<I2, A2>,
    decode: (a1: A1) => I2,
    encode: (i2: I2) => A1
  ): Schema<I1, A2>
} = dual(
  4,
  <I1, A1, I2, A2>(
    from: Schema<I1, A1>,
    to: Schema<I2, A2>,
    decode: (a1: A1) => I2,
    encode: (i2: I2) => A1
  ): Schema<I1, A2> =>
    transformEffect(from, to, (a) => PR.success(decode(a)), (b) => PR.success(encode(b)))
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
 * import { pipe } from "@effect/data/Function"
 *
 * const Circle = S.struct({ radius: S.number })
 * const Square = S.struct({ sideLength: S.number })
 * const Shape = S.union(
 *   pipe(Circle, S.attachPropertySignature("kind", "circle")),
 *   pipe(Square, S.attachPropertySignature("kind", "square"))
 * )
 *
 * assert.deepStrictEqual(S.decode(Shape)({ radius: 10 }), {
 *   kind: "circle",
 *   radius: 10
 * })
 *
 * @category combinators
 * @since 1.0.0
 */
export const attachPropertySignature = <K extends PropertyKey, V extends AST.LiteralValue>(
  key: K,
  value: V
) =>
  <I, A extends object>(schema: Schema<I, A>): Schema<I, Spread<A & { readonly [k in K]: V }>> =>
    transform<I, A, any, any>(
      schema,
      pipe(to(schema), extend(struct({ [key]: literal(value) }))),
      (a) => ({ ...a, [key]: value }),
      ({ [key]: _key, ...rest }) => rest
    )

// ---------------------------------------------
// annotations
// ---------------------------------------------

/**
 * @category combinators
 * @since 1.0.0
 */
export const annotations = (annotations: AST.Annotated["annotations"]) =>
  <I, A>(self: Schema<I, A>): Schema<I, A> => make(AST.mergeAnnotations(self.ast, annotations))

/**
 * @category annotations
 * @since 1.0.0
 */
export const message = (message: AST.MessageAnnotation<unknown>) =>
  <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.MessageAnnotationId, message))

/**
 * @category annotations
 * @since 1.0.0
 */
export const identifier = (identifier: AST.IdentifierAnnotation) =>
  <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.IdentifierAnnotationId, identifier))

/**
 * @category annotations
 * @since 1.0.0
 */
export const title = (title: AST.TitleAnnotation) =>
  <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.TitleAnnotationId, title))

/**
 * @category annotations
 * @since 1.0.0
 */
export const description = (description: AST.DescriptionAnnotation) =>
  <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.DescriptionAnnotationId, description))

/**
 * @category annotations
 * @since 1.0.0
 */
export const examples = (examples: AST.ExamplesAnnotation) =>
  <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.ExamplesAnnotationId, examples))

/**
 * @category annotations
 * @since 1.0.0
 */
export const documentation = (documentation: AST.DocumentationAnnotation) =>
  <I, A>(self: Schema<I, A>): Schema<I, A> =>
    make(AST.setAnnotation(self.ast, AST.DocumentationAnnotationId, documentation))

// ---------------------------------------------
// data
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
export const bigint: Schema<bigint> = make(AST.bigIntKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const symbol: Schema<symbol> = make(AST.symbolKeyword)

/**
 * @category primitives
 * @since 1.0.0
 */
export const object: Schema<object> = make(AST.objectKeyword)

// ---------------------------------------------
// data/Bigint
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const GreaterThanBigintTypeId = "@effect/schema/GreaterThanBigintTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const greaterThanBigint = <A extends bigint>(
  min: bigint,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a > min, {
        typeId: GreaterThanBigintTypeId,
        description: `a bigint greater than ${min}n`,
        jsonSchema: { exclusiveMinimum: min },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const GreaterThanOrEqualToBigintTypeId = "@effect/schema/GreaterThanOrEqualToBigintTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const greaterThanOrEqualToBigint = <A extends bigint>(
  min: bigint,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a >= min, {
        typeId: GreaterThanOrEqualToBigintTypeId,
        description: `a bigint greater than or equal to ${min}n`,
        jsonSchema: { minimum: min },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const LessThanBigintTypeId = "@effect/schema/LessThanBigintTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const lessThanBigint = <A extends bigint>(
  max: bigint,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a < max, {
        typeId: LessThanBigintTypeId,
        description: `a bigint less than ${max}n`,
        jsonSchema: { exclusiveMaximum: max },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const LessThanOrEqualToBigintTypeId = "@effect/schema/LessThanOrEqualToBigintTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const lessThanOrEqualToBigint = <A extends bigint>(
  max: bigint,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a <= max, {
        typeId: LessThanOrEqualToBigintTypeId,
        description: `a bigint less than or equal to ${max}n`,
        jsonSchema: { maximum: max },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const BetweenBigintTypeId = "@effect/schema/BetweenBigintTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const betweenBigint = <A extends bigint>(
  min: bigint,
  max: bigint,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a >= min && a <= max, {
        typeId: BetweenBigintTypeId,
        description: `a bigint between ${min}n and ${max}n`,
        jsonSchema: { maximum: max, minimum: min },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const PositiveBigintTypeId = "@effect/schema/PositiveBigintTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const positiveBigint = <A extends bigint>(
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> =>
  greaterThanBigint(0n, {
    typeId: PositiveBigintTypeId,
    description: "a positive bigint",
    ...options
  })

/**
 * @since 1.0.0
 */
export const NegativeBigintTypeId = "@effect/schema/NegativeBigintTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const negativeBigint = <A extends bigint>(
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> =>
  lessThanBigint(0n, {
    typeId: NegativeBigintTypeId,
    description: "a negative bigint",
    ...options
  })

/**
 * @since 1.0.0
 */
export const NonNegativeBigintTypeId = "@effect/schema/NonNegativeBigintTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const nonNegativeBigint = <A extends bigint>(
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> =>
  greaterThanOrEqualToBigint(0n, {
    typeId: NonNegativeBigintTypeId,
    description: "a non-negative bigint",
    ...options
  })

/**
 * @since 1.0.0
 */
export const NonPositiveBigintTypeId = "@effect/schema/NonPositiveBigintTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const nonPositiveBigint = <A extends bigint>(
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> =>
  lessThanOrEqualToBigint(0n, {
    typeId: NonPositiveBigintTypeId,
    description: "a non-positive bigint",
    ...options
  })

/**
 * Clamps a bigint between a minimum and a maximum value.
 *
 * @category parsers
 * @since 1.0.0
 */
export const clampBigint = <A extends bigint>(min: bigint, max: bigint) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    transform(
      self,
      pipe(self, to, betweenBigint(min, max)),
      (self) => B.clamp(self, min, max) as A,
      identity
    )

// ---------------------------------------------
// data/Brand
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const BrandTypeId = "@effect/schema/BrandTypeId"

/**
 * @category combinators
 * @since 1.0.0
 */
export const fromBrand = <C extends Brand<string>>(
  constructor: Brand.Constructor<C>,
  options?: AnnotationOptions<Brand.Unbranded<C>>
) =>
  <I, A extends Brand.Unbranded<C>>(self: Schema<I, A>): Schema<I, A & C> => {
    const decode = untracedMethod(() =>
      (a: A): ParseResult<C> =>
        Effect.fromEither(
          E.mapLeft(
            constructor.either(a),
            (brandErrors) =>
              PR.parseError([PR.type(ast, a, brandErrors.map((v) => v.message).join(", "))])
          )
        )
    )
    const ast = AST.createRefinement(
      self.ast,
      AST.getTo(self.ast),
      decode,
      decode,
      toAnnotations({ typeId: BrandTypeId, ...options })
    )
    return make(ast)
  }

// ---------------------------------------------
// data/Chunk
// ---------------------------------------------

const chunkArbitrary = <A>(item: Arbitrary<A>): Arbitrary<Chunk<A>> =>
  (fc) => fc.array(item(fc)).map(C.fromIterable)

const chunkPretty = <A>(item: Pretty<A>): Pretty<Chunk<A>> =>
  (c) => `Chunk(${C.toReadonlyArray(c).map(item).join(", ")})`

/**
 * @category constructors
 * @since 1.0.0
 */
export const chunkFromSelf = <I, A>(item: Schema<I, A>): Schema<Chunk<I>, Chunk<A>> => {
  const schema = declare(
    [item],
    struct({
      _id: uniqueSymbol(Symbol.for("@effect/data/Chunk")),
      length: number
    }),
    <A>(item: Schema<A>) => {
      const parse = P.parseResult(array(item))
      return (u, options) =>
        !C.isChunk(u) ?
          PR.failure(PR.type(schema.ast, u)) :
          PR.map(parse(C.toReadonlyArray(u), options), C.fromIterable)
    },
    {
      [AST.IdentifierAnnotationId]: "Chunk",
      [I.PrettyHookId]: chunkPretty,
      [I.ArbitraryHookId]: chunkArbitrary
    }
  )
  return schema
}

/**
 * @category parsers
 * @since 1.0.0
 */
export const chunk = <I, A>(item: Schema<I, A>): Schema<ReadonlyArray<I>, Chunk<A>> =>
  transform(array(item), to(chunkFromSelf(item)), C.fromIterable, C.toReadonlyArray)

// ---------------------------------------------
// data/Data
// ---------------------------------------------

const toData = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(a: A): D.Data<A> =>
  Array.isArray(a) ? D.array(a) : D.struct(a)

const dataArbitrary = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Arbitrary<A>
): Arbitrary<D.Data<A>> => (fc) => item(fc).map(toData)

const dataPretty = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Pretty<A>
): Pretty<D.Data<A>> => (d) => `Data(${item(d)})`

/**
 * @category combinators
 * @since 1.0.0
 */
export const dataFromSelf = <
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<I, A>
): Schema<D.Data<I>, D.Data<A>> => {
  const schema = declare(
    [item],
    item,
    <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
      item: Schema<A>
    ) => {
      const parse = P.parseResult(item)
      return (u, options) =>
        !Equal.isEqual(u) ?
          PR.failure(PR.type(schema.ast, u)) :
          PR.map(parse(u, options), toData)
    },
    {
      [AST.IdentifierAnnotationId]: "Data",
      [I.PrettyHookId]: dataPretty,
      [I.ArbitraryHookId]: dataArbitrary
    }
  )
  return schema
}

/**
 * @category parsers
 * @since 1.0.0
 */
export const data = <
  I extends Readonly<Record<string, any>> | ReadonlyArray<any>,
  A extends Readonly<Record<string, any>> | ReadonlyArray<any>
>(
  item: Schema<I, A>
): Schema<I, D.Data<A>> =>
  transform(
    item,
    to(dataFromSelf(item)),
    toData,
    (a) => Array.isArray(a) ? Array.from(a) : Object.assign({}, a) as any
  )

// ---------------------------------------------
// data/Date
// ---------------------------------------------

const dateArbitrary = (): Arbitrary<Date> => (fc) => fc.date()

const datePretty = (): Pretty<Date> => (date) => `new Date(${JSON.stringify(date)})`

/**
 * @category constructors
 * @since 1.0.0
 */
export const date: Schema<Date> = declare(
  [],
  struct({}),
  () => (u) => !isDate(u) ? PR.failure(PR.type(date.ast, u)) : PR.success(u),
  {
    [AST.IdentifierAnnotationId]: "Date",
    [I.PrettyHookId]: datePretty,
    [I.ArbitraryHookId]: dateArbitrary
  }
)

/**
  Transforms a `string` into a `Date` by parsing the string using `Date.parse`.

  @category parsers
  @since 1.0.0
*/
export const dateFromString: Schema<string, Date> = transformEffect(
  string,
  date,
  (s) => {
    const n = Date.parse(s)
    return isNaN(n)
      ? PR.failure(PR.type(dateFromString.ast, s))
      : PR.success(new Date(n))
  },
  (n) => PR.success(n.toISOString())
)

// ---------------------------------------------
// data/Either
// ---------------------------------------------

const eitherArbitrary = <E, A>(
  left: Arbitrary<E>,
  right: Arbitrary<A>
): Arbitrary<Either<E, A>> => (fc) => fc.oneof(left(fc).map(E.left), right(fc).map(E.right))

const eitherPretty = <E, A>(left: Pretty<E>, right: Pretty<A>): Pretty<Either<E, A>> =>
  E.match(
    (e) => `left(${left(e)})`,
    (a) => `right(${right(a)})`
  )

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
 * @category constructors
 * @since 1.0.0
 */
export const eitherFromSelf = <IE, E, IA, A>(
  left: Schema<IE, E>,
  right: Schema<IA, A>
): Schema<Either<IE, IA>, Either<E, A>> => {
  const schema = declare(
    [left, right],
    eitherInline(left, right),
    <E, A>(
      left: Schema<E>,
      right: Schema<A>
    ) => {
      const parseLeft = P.parseResult(left)
      const parseRight = P.parseResult(right)
      return (u, options) =>
        !E.isEither(u) ?
          PR.failure(PR.type(schema.ast, u)) :
          E.isLeft(u) ?
          PR.map(parseLeft(u.left, options), E.left) :
          PR.map(parseRight(u.right, options), E.right)
    },
    {
      [AST.IdentifierAnnotationId]: "Either",
      [I.PrettyHookId]: eitherPretty,
      [I.ArbitraryHookId]: eitherArbitrary
    }
  )
  return schema
}

/**
 * @category parsers
 * @since 1.0.0
 */
export const either = <IE, E, IA, A>(
  left: Schema<IE, E>,
  right: Schema<IA, A>
): Schema<
  { readonly _tag: "Left"; readonly left: IE } | { readonly _tag: "Right"; readonly right: IA },
  Either<E, A>
> =>
  transform(
    eitherInline(left, right),
    to(eitherFromSelf(left, right)),
    (a) => a._tag === "Left" ? E.left(a.left) : E.right(a.right),
    E.match(
      (left) => ({ _tag: "Left" as const, left }),
      (right) => ({ _tag: "Right" as const, right })
    )
  )

// ---------------------------------------------
// data/Json
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export type JsonArray = ReadonlyArray<Json>

/**
 * @since 1.0.0
 */
export type JsonObject = { readonly [key: string]: Json }

/**
 * @since 1.0.0
 */
export type Json =
  | null
  | boolean
  | number
  | string
  | JsonArray
  | JsonObject

const arbitraryJson: Arbitrary<Json> = (fc) => fc.jsonValue().map((json) => json as Json)

/**
 * @category constructors
 * @since 1.0.0
 */
export const json: Schema<Json> = lazy(() =>
  union(
    _null,
    string,
    number,
    boolean,
    array(json),
    record(string, json)
  ), {
  [I.ArbitraryHookId]: () => arbitraryJson
})

// ---------------------------------------------
// data/Number
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const FiniteTypeId = "@effect/schema/FiniteTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const finite = <A extends number>(options?: AnnotationOptions<A>) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => Number.isFinite(a), {
        typeId: FiniteTypeId,
        description: "a finite number",
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const GreaterThanTypeId = "@effect/schema/GreaterThanTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const greaterThan = <A extends number>(
  min: number,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a > min, {
        typeId: GreaterThanTypeId,
        description: `a number greater than ${min}`,
        jsonSchema: { exclusiveMinimum: min },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const GreaterThanOrEqualToTypeId = "@effect/schema/GreaterThanOrEqualToTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = <A extends number>(
  min: number,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a >= min, {
        typeId: GreaterThanOrEqualToTypeId,
        description: `a number greater than or equal to ${min}`,
        jsonSchema: { minimum: min },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const MultipleOfTypeId = "@effect/schema/MultipleOfTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const multipleOf = <A extends number>(
  divisor: number,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => N.remainder(a, divisor) === 0, {
        typeId: MultipleOfTypeId,
        description: `a number divisible by ${divisor}`,
        jsonSchema: { multipleOf: Math.abs(divisor) }, // spec requires positive divisor
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const IntTypeId = "@effect/schema/IntTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const int = <A extends number>(options?: AnnotationOptions<A>) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => Number.isInteger(a), {
        typeId: IntTypeId,
        description: "integer",
        jsonSchema: { type: "integer" },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const LessThanTypeId = "@effect/schema/LessThanTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const lessThan = <A extends number>(max: number, options?: AnnotationOptions<A>) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a < max, {
        typeId: LessThanTypeId,
        description: `a number less than ${max}`,
        jsonSchema: { exclusiveMaximum: max },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const LessThanOrEqualToTypeId = "@effect/schema/LessThanOrEqualToTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const lessThanOrEqualTo = <A extends number>(
  max: number,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a <= max, {
        typeId: LessThanOrEqualToTypeId,
        description: `a number less than or equal to ${max}`,
        jsonSchema: { maximum: max },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const BetweenTypeId = "@effect/schema/BetweenTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const between = <A extends number>(
  min: number,
  max: number,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => a >= min && a <= max, {
        typeId: BetweenTypeId,
        description: `a number between ${min} and ${max}`,
        jsonSchema: { maximum: max, minimum: min },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const NonNaNTypeId = "@effect/schema/NonNaNTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const nonNaN = <A extends number>(options?: AnnotationOptions<A>) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => !Number.isNaN(a), {
        typeId: NonNaNTypeId,
        description: "a number NaN excluded",
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const PositiveTypeId = "@effect/schema/PositiveTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const positive = <A extends number>(
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> =>
  greaterThan(0, {
    typeId: PositiveTypeId,
    description: "a positive number",
    ...options
  })

/**
 * @since 1.0.0
 */
export const NegativeTypeId = "@effect/schema/NegativeTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const negative = <A extends number>(
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> =>
  lessThan(0, {
    typeId: NegativeTypeId,
    description: "a negative number",
    ...options
  })

/**
 * @since 1.0.0
 */
export const NonNegativeTypeId = "@effect/schema/NonNegativeTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const nonNegative = <A extends number>(
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> =>
  greaterThanOrEqualTo(0, {
    typeId: NonNegativeTypeId,
    description: "a non-negative number",
    ...options
  })

/**
 * @since 1.0.0
 */
export const NonPositiveTypeId = "@effect/schema/NonPositiveTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const nonPositive = <A extends number>(
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> =>
  lessThanOrEqualTo(0, {
    typeId: NonPositiveTypeId,
    description: "a non-positive number",
    ...options
  })

/**
 * Clamps a number between a minimum and a maximum value.
 *
 * @category parsers
 * @since 1.0.0
 */
export const clamp = <A extends number>(min: number, max: number) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    transform(
      self,
      pipe(self, to, between<A>(min, max)),
      (self) => N.clamp(self, min, max) as A,
      identity
    )

/**
  Transforms a `string` into a `number` by parsing the string using `parseFloat`.

  The following special string values are supported: "NaN", "Infinity", "-Infinity".

  @category parsers
  @since 1.0.0
*/
export const numberFromString = <I>(self: Schema<I, string>): Schema<I, number> => {
  const schema: Schema<I, number> = transformEffect(
    self,
    number,
    (s) => {
      if (s === "NaN") {
        return PR.success(NaN)
      }
      if (s === "Infinity") {
        return PR.success(Infinity)
      }
      if (s === "-Infinity") {
        return PR.success(-Infinity)
      }
      const n = parseFloat(s)
      return isNaN(n) ? PR.failure(PR.type(schema.ast, s)) : PR.success(n)
    },
    (n) => PR.success(String(n))
  )
  return schema
}

// ---------------------------------------------
// data/Object
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const InstanceOfTypeId = "@effect/schema/InstanceOfTypeId"

/**
 * @category constructors
 * @since 1.0.0
 */
export const instanceOf = <A extends abstract new(...args: any) => any>(
  constructor: A,
  options?: AnnotationOptions<object>
): Schema<InstanceType<A>, InstanceType<A>> => {
  const schema = declare(
    [],
    struct({}),
    () =>
      (input) =>
        input instanceof constructor ? PR.success(input) : PR.failure(PR.type(schema.ast, input)),
    {
      [AST.TypeAnnotationId]: InstanceOfTypeId,
      [InstanceOfTypeId]: { constructor },
      [AST.DescriptionAnnotationId]: `an instance of ${constructor.name}`,
      ...options
    }
  )
  return schema
}

// ---------------------------------------------
// data/Option
// ---------------------------------------------

const optionArbitrary = <A>(value: Arbitrary<A>): Arbitrary<Option<A>> =>
  (fc) => fc.oneof(fc.constant(O.none()), value(fc).map(O.some))

const optionPretty = <A>(value: Pretty<A>): Pretty<Option<A>> =>
  O.match(
    () => "none()",
    (a) => `some(${value(a)})`
  )

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
 * @category constructors
 * @since 1.0.0
 */
export const optionFromSelf = <I, A>(value: Schema<I, A>): Schema<Option<I>, Option<A>> => {
  const schema = declare(
    [value],
    optionInline(value),
    <A>(value: Schema<A>) => {
      const parse = P.parseResult(value)
      return (u, options) =>
        !O.isOption(u) ?
          PR.failure(PR.type(schema.ast, u)) :
          O.isNone(u) ?
          PR.success(O.none()) :
          PR.map(parse(u.value, options), O.some)
    },
    {
      [AST.IdentifierAnnotationId]: "Option",
      [I.PrettyHookId]: optionPretty,
      [I.ArbitraryHookId]: optionArbitrary
    }
  )
  return schema
}

/**
 * @category parsers
 * @since 1.0.0
 */
export const option = <I, A>(
  value: Schema<I, A>
): Schema<{ readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: I }, Option<A>> =>
  transform(
    optionInline(value),
    to(optionFromSelf(value)),
    (a) => a._tag === "None" ? O.none() : O.some(a.value),
    O.match(() => ({ _tag: "None" as const }), (value) => ({ _tag: "Some" as const, value }))
  )

/**
 * @category parsers
 * @since 1.0.0
 */
export const optionFromNullable = <I, A>(
  value: Schema<I, A>
): Schema<I | null | undefined, Option<A>> =>
  transform(union(_undefined, _null, value), to(optionFromSelf(value)), O.fromNullable, O.getOrNull)

/**
 * @category parsers
 * @since 1.0.0
 */
export const optionsFromOptionals = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
) =>
  <I, A extends object>(
    schema: Schema<I, A>
  ): Schema<
    Spread<I & { readonly [K in keyof Fields]?: From<Fields[K]> }>,
    Spread<A & { readonly [K in keyof Fields]: Option<To<Fields[K]>> }>
  > => {
    if (AST.isTypeLiteral(schema.ast)) {
      const propertySignatures = schema.ast.propertySignatures
      const ownKeys = Reflect.ownKeys(fields)
      const from = AST.createTypeLiteral(
        propertySignatures.concat(
          ownKeys.map((key) =>
            AST.createPropertySignature(
              key,
              AST.createUnion([_undefined.ast, _null.ast, fields[key].ast]),
              true,
              true
            )
          )
        ),
        schema.ast.indexSignatures
      )
      const to = AST.createTypeLiteral(
        propertySignatures.concat(
          ownKeys.map((key) =>
            AST.createPropertySignature(
              key,
              optionFromSelf(fields[key]).ast,
              true,
              true
            )
          )
        ),
        schema.ast.indexSignatures
      )
      const out = AST.createTransform(from, to, (o: any) => {
        const out = { ...o }
        for (const key of ownKeys) {
          out[key] = O.fromNullable(o[key])
        }
        return PR.success(out)
      }, (o) => {
        const out = { ...o }
        for (const key of ownKeys) {
          if (O.isSome(o[key])) {
            out[key] = o[key].value
          } else {
            delete out[key]
          }
        }
        return PR.success(out)
      })
      return make(out)
    }
    throw new Error("`parseOptional` can only handle type literals")
  }

// ---------------------------------------------
// data/ReadonlyArray
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const MinItemsTypeId = "@effect/schema/MinItemsTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const minItems = <A>(
  n: number,
  options?: AnnotationOptions<ReadonlyArray<A>>
) =>
  <I>(self: Schema<I, ReadonlyArray<A>>): Schema<I, ReadonlyArray<A>> =>
    pipe(
      self,
      filter((a): a is ReadonlyArray<A> => a.length >= n, {
        typeId: MinItemsTypeId,
        description: `an array of at least ${n} items`,
        jsonSchema: { minItems: n },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const MaxItemsTypeId = "@effect/schema/MaxItemsTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const maxItems = <A>(
  n: number,
  options?: AnnotationOptions<ReadonlyArray<A>>
) =>
  <I>(self: Schema<I, ReadonlyArray<A>>): Schema<I, ReadonlyArray<A>> =>
    pipe(
      self,
      filter((a): a is ReadonlyArray<A> => a.length <= n, {
        typeId: MaxItemsTypeId,
        description: `an array of at most ${n} items`,
        jsonSchema: { maxItems: n },
        ...options
      })
    )

/**
 * @since 1.0.0
 */
export const ItemsCountTypeId = "@effect/schema/ItemsCountTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const itemsCount = <A>(
  n: number,
  options?: AnnotationOptions<ReadonlyArray<A>>
) =>
  <I>(self: Schema<I, ReadonlyArray<A>>): Schema<I, ReadonlyArray<A>> =>
    pipe(
      self,
      filter((a): a is ReadonlyArray<A> => a.length === n, {
        typeId: ItemsCountTypeId,
        description: `an array of exactly ${n} items`,
        jsonSchema: { minItems: n, maxItems: n },
        ...options
      })
    )

// ---------------------------------------------
// data/ReadonlyMap
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
 * @category constructors
 * @since 1.0.0
 */
export const readonlyMapFromSelf = <IK, K, IV, V>(
  key: Schema<IK, K>,
  value: Schema<IV, V>
): Schema<ReadonlyMap<IK, IV>, ReadonlyMap<K, V>> => {
  const schema = declare(
    [key, value],
    struct({
      size: number
    }),
    <K, V>(
      key: Schema<K>,
      value: Schema<V>
    ) => {
      const parse = P.parseResult(array(tuple(key, value)))
      return (u, options) =>
        !isMap(u) ?
          PR.failure(PR.type(schema.ast, u)) :
          PR.map(parse(Array.from(u.entries()), options), (as) => new Map(as))
    },
    {
      [AST.IdentifierAnnotationId]: "ReadonlyMap",
      [I.PrettyHookId]: readonlyMapPretty,
      [I.ArbitraryHookId]: readonlyMapArbitrary
    }
  )
  return schema
}

/**
 * @category parsers
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
// data/ReadonlySet
// ---------------------------------------------

const isSet = (u: unknown): u is Set<unknown> => u instanceof Set

const readonlySetArbitrary = <A>(item: Arbitrary<A>): Arbitrary<ReadonlySet<A>> =>
  (fc) => fc.array(item(fc)).map((as) => new Set(as))

const readonlySetPretty = <A>(item: Pretty<A>): Pretty<ReadonlySet<A>> =>
  (set) => `new Set([${Array.from(set.values()).map((a) => item(a)).join(", ")}])`

/**
 * @category constructors
 * @since 1.0.0
 */
export const readonlySetFromSelf = <I, A>(
  item: Schema<I, A>
): Schema<ReadonlySet<I>, ReadonlySet<A>> => {
  const schema = declare(
    [item],
    struct({
      size: number
    }),
    <A>(item: Schema<A>) => {
      const parse = P.parseResult(array(item))
      return (u, options) =>
        !isSet(u) ?
          PR.failure(PR.type(schema.ast, u)) :
          PR.map(parse(Array.from(u.values()), options), (as) => new Set(as))
    },
    {
      [AST.IdentifierAnnotationId]: "ReadonlySet",
      [I.PrettyHookId]: readonlySetPretty,
      [I.ArbitraryHookId]: readonlySetArbitrary
    }
  )
  return schema
}

/**
 * @category parsers
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
// data/String
// ---------------------------------------------

/**
 * @since 1.0.0
 */
export const TrimmedTypeId = "@effect/schema/TrimmedTypeId"

const trimmedRegex = /^\S.*\S$|^\S$|^$/

/**
 * Verifies that a string contains no leading or trailing whitespaces.
 *
 * Note. This combinator does not make any transformations, it only validates.
 * If what you were looking for was a combinator to trim strings, then check out the `trim` combinator.
 *
 * @category filters
 * @since 1.0.0
 */
export const trimmed = <A extends string>(options?: AnnotationOptions<A>) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter((a): a is A => trimmedRegex.test(a), {
        typeId: TrimmedTypeId,
        description: "a string with no leading or trailing whitespace",
        jsonSchema: {
          type: "string",
          pattern: trimmedRegex.source
        },
        ...options
      })
    )

/**
 * @category filters
 * @since 1.0.0
 */
export const maxLength = <A extends string>(
  maxLength: number,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter(
        (a): a is A => a.length <= maxLength,
        {
          description: `a string at most ${maxLength} character(s) long`,
          jsonSchema: { maxLength },
          ...options
        }
      )
    )

/**
 * @category filters
 * @since 1.0.0
 */
export const minLength = <A extends string>(
  minLength: number,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
      filter(
        (a): a is A => a.length >= minLength,
        {
          description: `a string at least ${minLength} character(s) long`,
          jsonSchema: { minLength },
          ...options
        }
      )
    )

/**
 * @since 1.0.0
 */
export const PatternTypeId = "@effect/schema/PatternTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const pattern = <A extends string>(
  regex: RegExp,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> => {
    const pattern = regex.source
    return pipe(
      self,
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
          ...options
        }
      )
    )
  }

/**
 * @since 1.0.0
 */
export const StartsWithTypeId = "@effect/schema/StartsWithTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const startsWith = <A extends string>(
  startsWith: string,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
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
 * @since 1.0.0
 */
export const EndsWithTypeId = "@effect/schema/EndsWithTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const endsWith = <A extends string>(
  endsWith: string,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
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
 * @since 1.0.0
 */
export const IncludesTypeId = "@effect/schema/IncludesTypeId"

/**
 * @category filters
 * @since 1.0.0
 */
export const includes = <A extends string>(
  searchString: string,
  options?: AnnotationOptions<A>
) =>
  <I>(self: Schema<I, A>): Schema<I, A> =>
    pipe(
      self,
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
 * The `trim` parser allows removing whitespaces from the beginning and end of a string.
 *
 * @category parsers
 * @since 1.0.0
 */
export const trim = <I>(self: Schema<I, string>): Schema<I, string> =>
  transform(
    self,
    pipe(to(self), trimmed()),
    (s) => s.trim(),
    identity
  )

/**
 * @since 1.0.0
 */
export const UUIDTypeId = "@effect/schema/UUIDTypeId"

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

/**
 * @category constructors
 * @since 1.0.0
 */
export const UUID: Schema<string> = pipe(
  string,
  pattern(uuidRegex, {
    typeId: UUIDTypeId
  }),
  annotations({
    [I.ArbitraryHookId]: (): Arbitrary<string> => (fc) => fc.uuid()
  })
)

/**
 * @category filters
 * @since 1.0.0
 */
export const length = <A extends string>(
  length: number,
  options?: AnnotationOptions<A>
) => <I>(self: Schema<I, A>): Schema<I, A> => minLength(length, options)(maxLength<A>(length)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const nonEmpty = <A extends string>(
  options?: AnnotationOptions<A>
): <I>(self: Schema<I, A>) => Schema<I, A> => minLength(1, options)
