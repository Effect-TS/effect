/**
 * @since 1.0.0
 */

import type { Brand } from "@effect/data/Brand"
import { pipe } from "@effect/data/Function"
import type { Option } from "@effect/data/Option"
import type { Predicate, Refinement } from "@effect/data/Predicate"
import * as RA from "@effect/data/ReadonlyArray"
import * as A from "@effect/schema/annotation/AST"
import * as AST from "@effect/schema/AST"
import type { ParseOptions } from "@effect/schema/AST"
import * as DataDate from "@effect/schema/data/Date"
import * as N from "@effect/schema/data/Number"
import * as O from "@effect/schema/data/Object"
import * as DataOption from "@effect/schema/data/Option"
import * as SRA from "@effect/schema/data/ReadonlyArray"
import * as S from "@effect/schema/data/String"
import * as I from "@effect/schema/internal/common"
import type { ParseResult } from "@effect/schema/ParseResult"

/**
 * @category model
 * @since 1.0.0
 */
export interface Schema<A> {
  readonly A: (_: A) => A
  readonly ast: AST.AST
}

/**
 * @since 1.0.0
 */
export type Infer<S extends { readonly A: (_: any) => any }> = Parameters<S["A"]>[0]

// ---------------------------------------------
// constructors
// ---------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <A>(ast: AST.AST) => Schema<A> = I.makeSchema

/**
 * @category constructors
 * @since 1.0.0
 */
export const literal: <Literals extends ReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
) => Schema<Literals[number]> = I.literal

/**
 * @category constructors
 * @since 1.0.0
 */
export const uniqueSymbol: <S extends symbol>(
  symbol: S,
  annotations?: AST.Annotated["annotations"]
) => Schema<S> = I.uniqueSymbol

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
 * @category constructors
 * @since 1.0.0
 */
export const instanceOf: <A extends abstract new(...args: any) => any>(
  constructor: A,
  annotationOptions?: AnnotationOptions<object>
) => (self: Schema<object>) => Schema<InstanceType<A>> = O.instanceOf

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
): Schema<Join<{ [K in keyof T]: Infer<T[K]> }>> => {
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
export const typeAlias: (
  typeParameters: ReadonlyArray<Schema<any>>,
  type: Schema<any>,
  annotations?: AST.Annotated["annotations"]
) => Schema<any> = I.typeAlias

// ---------------------------------------------
// filters
// ---------------------------------------------

/**
 * @category filters
 * @since 1.0.0
 */
export const minLength: <A extends string>(
  minLength: number,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = S.minLength

/**
 * @category filters
 * @since 1.0.0
 */
export const maxLength: <A extends string>(
  maxLength: number,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = S.maxLength

/**
 * @category filters
 * @since 1.0.0
 */
export const length = <A extends string>(
  length: number,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> => minLength(length, annotationOptions)(maxLength<A>(length)(self))

/**
 * @category filters
 * @since 1.0.0
 */
export const nonEmpty = <A extends string>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> => minLength(1, annotationOptions)

/**
 * @category filters
 * @since 1.0.0
 */
export const startsWith: <A extends string>(
  startsWith: string,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = S.startsWith

/**
 * @category filters
 * @since 1.0.0
 */
export const endsWith: <A extends string>(
  endsWith: string,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = S.endsWith

/**
 * @category filters
 * @since 1.0.0
 */
export const includes: <A extends string>(
  searchString: string,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = S.includes

/**
 * @category filters
 * @since 1.0.0
 */
export const pattern: <A extends string>(
  regex: RegExp,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = S.pattern

/**
 * @category filters
 * @since 1.0.0
 */
export const lessThan: <A extends number>(
  max: number,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.lessThan

/**
 * @category filters
 * @since 1.0.0
 */
export const lessThanOrEqualTo: <A extends number>(
  max: number,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.lessThanOrEqualTo

/**
 * @category filters
 * @since 1.0.0
 */
export const greaterThan: <A extends number>(
  min: number,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.greaterThan

/**
 * @category filters
 * @since 1.0.0
 */
export const greaterThanOrEqualTo: <A extends number>(
  min: number,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.greaterThanOrEqualTo

/**
 * @category filters
 * @since 1.0.0
 */
export const between: <A extends number>(
  min: number,
  max: number,
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.between

/**
 * @category filters
 * @since 1.0.0
 */
export const int: <A extends number>(
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.int

/**
 * Note. This combinator does not make any transformations, it only validates.
 * If what you were looking for was a combinator to trim strings, then check out the `trim` combinator.
 *
 * @category filters
 * @since 1.0.0
 */
export const trimmed: <A extends string>(
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = S.trimmed

/**
 * @category filters
 * @since 1.0.0
 */
export const nonNaN: <A extends number>(
  annotationOptions?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.nonNaN

/**
 * @category filters
 * @since 1.0.0
 */
export const finite: <A extends number>(
  options?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.finite

/**
 * @category filters
 * @since 1.0.0
 */
export const positive: <A extends number>(
  options?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.positive

/**
 * @category filters
 * @since 1.0.0
 */
export const negative: <A extends number>(
  options?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.negative

/**
 * @category filters
 * @since 1.0.0
 */
export const nonNegative: <A extends number>(
  options?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.nonNegative

/**
 * @category filters
 * @since 1.0.0
 */
export const nonPositive: <A extends number>(
  options?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.nonPositive

/**
 * @category filters
 * @since 1.0.0
 */
export const maxItems: <A>(
  n: number,
  options?: AnnotationOptions<ReadonlyArray<A>>
) => (self: Schema<ReadonlyArray<A>>) => Schema<ReadonlyArray<A>> = SRA.maxItems

/**
 * @category filters
 * @since 1.0.0
 */
export const minItems: <A>(
  n: number,
  options?: AnnotationOptions<ReadonlyArray<A>>
) => (self: Schema<ReadonlyArray<A>>) => Schema<ReadonlyArray<A>> = SRA.minItems

/**
 * @category filters
 * @since 1.0.0
 */
export const itemsCount: <A>(
  n: number,
  options?: AnnotationOptions<ReadonlyArray<A>>
) => (self: Schema<ReadonlyArray<A>>) => Schema<ReadonlyArray<A>> = SRA.itemsCount

// ---------------------------------------------
// combinators
// ---------------------------------------------

/**
 * @category combinators
 * @since 1.0.0
 */
export const union: <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
) => Schema<Infer<Members[number]>> = I.union

/**
 * @category combinators
 * @since 1.0.0
 */
export const nullable: <A>(self: Schema<A>) => Schema<A | null> = I.nullable

/**
 * @category combinators
 * @since 1.0.0
 */
export const keyof = <A>(schema: Schema<A>): Schema<keyof A> => make(AST.keyof(schema.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const tuple: <Elements extends ReadonlyArray<Schema<any>>>(
  ...elements: Elements
) => Schema<{ readonly [K in keyof Elements]: Infer<Elements[K]> }> = I.tuple

/**
 * @category combinators
 * @since 1.0.0
 */
export const rest = <R>(rest: Schema<R>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Schema<readonly [...A, ...Array<R>]> => {
    if (AST.isTuple(self.ast)) {
      return make(AST.appendRestElement(self.ast, rest.ast))
    }
    throw new Error("`rest` is not supported on this schema")
  }

/**
 * @category combinators
 * @since 1.0.0
 */
export const element = <E>(element: Schema<E>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Schema<readonly [...A, E]> => {
    if (AST.isTuple(self.ast)) {
      return make(AST.appendElement(self.ast, AST.createElement(element.ast, false)))
    }
    throw new Error("`element` is not supported on this schema")
  }

/**
 * @category combinators
 * @since 1.0.0
 */
export const optionalElement = <E>(element: Schema<E>) =>
  <A extends ReadonlyArray<any>>(self: Schema<A>): Schema<readonly [...A, E?]> => {
    if (AST.isTuple(self.ast)) {
      return make(AST.appendElement(self.ast, AST.createElement(element.ast, true)))
    }
    throw new Error("`optionalElement` is not supported on this schema")
  }

/**
 * @category combinators
 * @since 1.0.0
 */
export const array: <A>(item: Schema<A>) => Schema<ReadonlyArray<A>> = I.array

/**
 * @category combinators
 * @since 1.0.0
 */
export const nonEmptyArray = <A>(
  item: Schema<A>
): Schema<readonly [A, ...Array<A>]> => pipe(tuple(item), rest(item))

/**
 * @since 1.0.0
 */
export type Spread<A> = {
  [K in keyof A]: A[K]
} extends infer B ? B : never

/**
 * @category symbol
 * @since 1.0.0
 */
export const OptionalSchemaId = Symbol.for("@effect/schema/Schema/OptionalSchema")

/**
 * @category symbol
 * @since 1.0.0
 */
export type OptionalSchemaId = typeof OptionalSchemaId

/**
 * @since 1.0.0
 */
export interface OptionalSchema<A> {
  readonly A: (_: A) => A
  readonly _id: OptionalSchemaId
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const optional: <A>(schema: Schema<A>) => OptionalSchema<A> = I.optional

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
export const struct: <Fields extends Record<PropertyKey, Schema<any> | OptionalSchema<any>>>(
  fields: Fields
) => Schema<
  Spread<
    & { readonly [K in Exclude<keyof Fields, OptionalKeys<Fields>>]: Infer<Fields[K]> }
    & { readonly [K in OptionalKeys<Fields>]?: Infer<Fields[K]> }
  >
> = I.struct

/**
 * @category combinators
 * @since 1.0.0
 */
export const pick = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): Schema<{ readonly [P in Keys[number]]: A[P] }> =>
    make(AST.pick(self.ast, keys))

/**
 * @category combinators
 * @since 1.0.0
 */
export const omit = <A, Keys extends ReadonlyArray<keyof A>>(...keys: Keys) =>
  (self: Schema<A>): Schema<{ readonly [P in Exclude<keyof A, Keys[number]>]: A[P] }> =>
    make(AST.omit(self.ast, keys))

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
 * import * as S from "@effect/schema"
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
export const getPropertySignatures = <A>(schema: Schema<A>): { [K in keyof A]: Schema<A[K]> } => {
  const out: Record<PropertyKey, Schema<any>> = {}
  const propertySignatures = AST._getPropertySignatures(schema.ast)
  for (const propertySignature of propertySignatures) {
    out[propertySignature.name] = make(propertySignature.type)
  }
  return out as any
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
 * import * as S from "@effect/schema"
 * import { pipe } from "@effect/data/Function"
 *
 * const Int = pipe(S.number, S.int(), S.brand("Int"))
 * type Int = S.Infer<typeof Int> // number & Brand<"Int">
 *
 * @category combinators
 * @since 1.0.0
 */
export const brand: <B extends string, A>(
  brand: B,
  options?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A & Brand<B>> = I.brand

/**
 * @category combinators
 * @since 1.0.0
 */
export const partial = <A>(self: Schema<A>): Schema<Partial<A>> => make(AST.partial(self.ast))

/**
 * @category combinators
 * @since 1.0.0
 */
export const record: <K extends string | symbol, V>(
  key: Schema<K>,
  value: Schema<V>
) => Schema<{ readonly [k in K]: V }> = I.record

const isOverlappingPropertySignatures = (x: AST.TypeLiteral, y: AST.TypeLiteral): boolean =>
  x.propertySignatures.some((px) => y.propertySignatures.some((py) => px.name === py.name))

const isOverlappingIndexSignatures = (x: AST.TypeLiteral, y: AST.TypeLiteral): boolean =>
  x.indexSignatures.some((ix) =>
    y.indexSignatures.some((iy) => {
      const bx = AST._getParameter(ix.parameter)
      const by = AST._getParameter(iy.parameter)
      // there cannot be two string index signatures or two symbol index signatures at the same time
      return (AST.isStringKeyword(bx) && AST.isStringKeyword(by)) ||
        (AST.isSymbolKeyword(bx) && AST.isSymbolKeyword(by))
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
export const extend = <B>(that: Schema<B>) =>
  <A>(self: Schema<A>): Schema<Spread<A & B>> =>
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
export const lazy: <A>(
  f: () => Schema<A>,
  annotations?: AST.Annotated["annotations"]
) => Schema<A> = I.lazy

/**
 * @category combinators
 * @since 1.0.0
 */
export type AnnotationOptions<A> = {
  message?: A.Message<A>
  identifier?: A.Identifier
  title?: A.Title
  description?: A.Description
  examples?: A.Examples
  documentation?: A.Documentation
  jsonSchema?: A.JSONSchema
  custom?: A.Custom
}

/**
 * @category combinators
 * @since 1.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<B>
export function filter<A>(
  predicate: Predicate<A>,
  options?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A>
export function filter<A>(
  predicate: Predicate<A>,
  options?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> {
  return I.filter(predicate, options)
}

/**
  Create a new `Schema` by transforming the input and output of an existing `Schema`
  using the provided decoding functions.

  @category combinators
  @since 1.0.0
 */
export const transformOrFail: <A, B>(
  to: Schema<B>,
  decode: (input: A, options?: ParseOptions) => ParseResult<B>,
  encode: (input: B, options?: ParseOptions) => ParseResult<A>
) => (self: Schema<A>) => Schema<B> = I.transformOrFail

/**
  Create a new `Schema` by transforming the input and output of an existing `Schema`
  using the provided mapping functions.

  @category combinators
  @since 1.0.0
*/
export const transform: <A, B>(
  to: Schema<B>,
  f: (a: A) => B,
  g: (b: B) => A
) => (self: Schema<A>) => Schema<B> = I.transform

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
 * import * as S from "@effect/schema"
 * import { pipe } from "@effect/data/Function"
 *
 * const Circle = S.struct({ radius: S.number })
 * const Square = S.struct({ sideLength: S.number })
 * const Shape = S.union(
 *   pipe(Circle, S.attachPropertySignature("kind", "circle")),
 *   pipe(Square, S.attachPropertySignature("kind", "square"))
 * )
 *
 * assert.deepStrictEqual(S.decodeOrThrow(Shape)({ radius: 10 }), {
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
  <A extends object>(schema: Schema<A>): Schema<Spread<A & { readonly [k in K]: V }>> =>
    pipe(
      schema,
      transform<A, any>(
        pipe(schema, extend(struct({ [key]: literal(value) }))),
        (a) => ({ ...a, [key]: value }),
        ({ [key]: _key, ...rest }) => rest
      )
    )

// ---------------------------------------------
// annotations
// ---------------------------------------------

/**
 * @category annotations
 * @since 1.0.0
 */
export const annotations: (
  annotations: AST.Annotated["annotations"]
) => <A>(self: Schema<A>) => Schema<A> = I.annotations

/**
 * @category annotations
 * @since 1.0.0
 */
export const message = (message: A.Message<unknown>) =>
  <A>(self: Schema<A>): Schema<A> => make(AST.setAnnotation(self.ast, A.MessageId, message))

/**
 * @category annotations
 * @since 1.0.0
 */
export const identifier = (identifier: A.Identifier) =>
  <A>(self: Schema<A>): Schema<A> => make(AST.setAnnotation(self.ast, A.IdentifierId, identifier))

/**
 * @category annotations
 * @since 1.0.0
 */
export const title = (title: A.Title) =>
  <A>(self: Schema<A>): Schema<A> => make(AST.setAnnotation(self.ast, A.TitleId, title))

/**
 * @category annotations
 * @since 1.0.0
 */
export const description = (description: A.Description) =>
  <A>(self: Schema<A>): Schema<A> => make(AST.setAnnotation(self.ast, A.DescriptionId, description))

/**
 * @category annotations
 * @since 1.0.0
 */
export const examples = (examples: A.Examples) =>
  <A>(self: Schema<A>): Schema<A> => make(AST.setAnnotation(self.ast, A.ExamplesId, examples))

/**
 * @category annotations
 * @since 1.0.0
 */
export const documentation = (documentation: A.Documentation) =>
  <A>(self: Schema<A>): Schema<A> =>
    make(AST.setAnnotation(self.ast, A.DocumentationId, documentation))

// ---------------------------------------------
// data
// ---------------------------------------------

const _undefined: Schema<undefined> = I._undefined

const _void: Schema<void> = I._void

const _null: Schema<null> = I._null

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
export const never: Schema<never> = I.never

/**
 * @category primitives
 * @since 1.0.0
 */
export const unknown: Schema<unknown> = I.unknown

/**
 * @category primitives
 * @since 1.0.0
 */
export const any: Schema<any> = I.any

/**
 * @category primitives
 * @since 1.0.0
 */
export const string: Schema<string> = I.string

/**
 * @category primitives
 * @since 1.0.0
 */
export const number: Schema<number> = I.number

/**
 * @category primitives
 * @since 1.0.0
 */
export const boolean: Schema<boolean> = I.boolean

/**
 * @category primitives
 * @since 1.0.0
 */
export const bigint: Schema<bigint> = I.bigint

/**
 * @category primitives
 * @since 1.0.0
 */
export const symbol: Schema<symbol> = I.symbol

/**
 * @category primitives
 * @since 1.0.0
 */
export const object: Schema<object> = I.object

/**
 * @category primitives
 * @since 1.0.0
 */
export const date: Schema<Date> = DataDate.date

/**
 * Transforms a `string` into a `string` with no leading or trailing whitespace.
 *
 * @category parsers
 * @since 1.0.0
 */
export const trim = (item: Schema<string>): Schema<string> => S.trim(item)

/**
 * @category parsers
 * @since 1.0.0
 */
export const option: <A>(value: Schema<A>) => Schema<Option<A>> = DataOption.fromNullable

/**
 * Restricts the value to be within the range specified by the minimum and maximum values.
 *
 * @category parsers
 * @since 1.0.0
 */
export const clamp: <A extends number>(
  min: number,
  max: number,
  options?: AnnotationOptions<A>
) => (self: Schema<A>) => Schema<A> = N.clamp
