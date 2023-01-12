/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Json, JsonArray, JsonObject } from "@fp-ts/data/Json"
import * as O from "@fp-ts/data/Option"
import type { Predicate, Refinement } from "@fp-ts/data/Predicate"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import * as RA from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as AST from "@fp-ts/schema/AST"
import * as PE from "@fp-ts/schema/ParseError"
import type { Parser } from "@fp-ts/schema/Parser"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { OptionalKeys, OptionalSchema, Schema, Spread } from "@fp-ts/schema/Schema"

/** @internal */
export const flatMap = T.flatMap

/** @internal */
export const map = T.map

/** @internal */
export const mutableAppend = <A>(self: Array<A>, a: A): NonEmptyReadonlyArray<A> => {
  self.push(a)
  return self as any
}

/** @internal */
export const isNonEmpty = RA.isNonEmpty

// ---------------------------------------------
// Refinements
// ---------------------------------------------

/** @internal */
export const isUnknownObject = (u: unknown): u is { readonly [x: string | symbol]: unknown } =>
  typeof u === "object" && u != null && !Array.isArray(u)

/** @internal */
export const isJsonArray = (u: unknown): u is JsonArray => Array.isArray(u) && u.every(isJson)

/** @internal */
export const isJsonObject = (u: unknown): u is JsonObject =>
  isUnknownObject(u) && Object.keys(u).every((key) => isJson(u[key]))

/** @internal */
export const isJson = (u: unknown): u is Json =>
  u === null || typeof u === "string" || (typeof u === "number" && !isNaN(u) && isFinite(u)) ||
  typeof u === "boolean" ||
  isJsonArray(u) ||
  isJsonObject(u)

// ---------------------------------------------
// artifacts constructors
// ---------------------------------------------

/** @internal */
export const makeArbitrary = <A>(
  schema: Schema<A>,
  arbitrary: Arbitrary<A>["arbitrary"]
): Arbitrary<A> => ({ ast: schema.ast, arbitrary }) as any

/** @internal */
export const makeParser = <I, A>(
  schema: Schema<A>,
  parse: Parser<I, A>["parse"]
): Parser<I, A> => ({ ast: schema.ast, parse }) as any

/** @internal */
export const fromRefinement = <A>(
  schema: Schema<A>,
  refinement: (u: unknown) => u is A
): Parser<unknown, A> =>
  makeParser(schema, (u) => refinement(u) ? PE.success(u) : PE.failure(PE.type(schema.ast, u)))

/** @internal */
export const makePretty = <A>(
  schema: Schema<A>,
  pretty: Pretty<A>["pretty"]
): Pretty<A> => ({ ast: schema.ast, pretty }) as any

// ---------------------------------------------
// Schema APIs
// ---------------------------------------------

/** @internal */
export const makeSchema = <A>(ast: AST.AST): Schema<A> => ({ ast }) as any

/** @internal */
export const typeAlias = (
  typeParameters: ReadonlyArray<Schema<any>>,
  type: Schema<any>,
  annotations?: AST.Annotated["annotations"]
): Schema<any> =>
  makeSchema(AST.typeAlias(
    typeParameters.map((tp) => tp.ast),
    type.ast,
    annotations
  ))

/** @internal */
export const filterOrFail = <A, B extends A>(
  decode: Parser<A, B>["parse"],
  description: string,
  meta: unknown,
  annotations?: AST.Annotated["annotations"]
) =>
  (self: Schema<A>): Schema<B> =>
    makeSchema(AST.refinement(self.ast, decode, meta, {
      [AST.DescriptionAnnotationId]: description,
      ...annotations
    }))

/** @internal */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
  description: string,
  meta: unknown,
  annotations?: AST.Annotated["annotations"]
): (from: Schema<A>) => Schema<B>
export function filter<A>(
  predicate: Predicate<A>,
  description: string,
  meta: unknown,
  annotations?: AST.Annotated["annotations"]
): (from: Schema<A>) => Schema<A>
export function filter<A>(
  predicate: Predicate<A>,
  description: string,
  meta: unknown,
  annotations?: AST.Annotated["annotations"]
): (from: Schema<A>) => Schema<A> {
  return (from) => {
    const schema: Schema<A> = pipe(
      from,
      filterOrFail(
        function refinement(a) {
          return predicate(a) ? PE.success(a) : PE.failure(PE.type(schema.ast, a))
        },
        description,
        meta,
        annotations
      )
    )
    return schema
  }
}

/** @internal */
export const transformOrFail = <A, B>(
  to: Schema<B>,
  decode: Parser<A, B>["parse"],
  encode: Parser<B, A>["parse"]
) => (self: Schema<A>): Schema<B> => makeSchema(AST.transform(self.ast, to.ast, decode, encode))

/** @internal */
export const transform = <A, B>(to: Schema<B>, ab: (a: A) => B, ba: (b: B) => A) =>
  (self: Schema<A>): Schema<B> =>
    pipe(
      self,
      transformOrFail(to, function mapTo(a) {
        return PE.success(ab(a))
      }, function mapFrom(b) {
        return PE.success(ba(b))
      })
    )

const makeLiteral = <Literal extends AST.LiteralValue>(value: Literal): Schema<Literal> =>
  makeSchema(AST.literal(value))

/** @internal */
export const literal = <Literals extends ReadonlyArray<AST.LiteralValue>>(
  ...literals: Literals
): Schema<Literals[number]> => union(...literals.map((literal) => makeLiteral(literal)))

/** @internal */
export const uniqueSymbol = <S extends symbol>(
  symbol: S,
  annotations?: AST.Annotated["annotations"]
): Schema<S> => makeSchema(AST.uniqueSymbol(symbol, annotations))

/** @internal */
export const never: Schema<never> = makeSchema(AST.neverKeyword)

/** @internal */
export const unknown: Schema<unknown> = makeSchema(AST.unknownKeyword)

/** @internal */
export const any: Schema<any> = makeSchema(AST.anyKeyword)

/** @internal */
export const isUndefined = (u: unknown): u is undefined => u === undefined

/** @internal */
export const _undefined: Schema<undefined> = makeSchema(AST.undefinedKeyword)

/** @internal */
export const _null: Schema<null> = makeSchema(AST.literal(null))

/** @internal */
export const _void: Schema<void> = makeSchema(AST.voidKeyword)

/** @internal */
export const string: Schema<string> = makeSchema(AST.stringKeyword)

/** @internal */
export const number: Schema<number> = makeSchema(AST.numberKeyword)

/** @internal */
export const boolean: Schema<boolean> = makeSchema(AST.booleanKeyword)

/** @internal */
export const isNever = (u: unknown): u is never => false

/** @internal */
export const isBigInt = (u: unknown): u is bigint => typeof u === "bigint"

/** @internal */
export const bigint: Schema<bigint> = makeSchema(AST.bigIntKeyword)

/** @internal */
export const isSymbol = (u: unknown): u is symbol => typeof u === "symbol"

/** @internal */
export const symbol: Schema<symbol> = makeSchema(AST.symbolKeyword)

/** @internal */
export const object: Schema<object> = makeSchema(AST.objectKeyword)

/** @internal */
export const isObject = (u: unknown): u is object => typeof u === "object" && u !== null

/** @internal */
export const isNotNull = (u: unknown): u is {} => u !== null

type Infer<S extends Schema<any>> = Parameters<S["A"]>[0]

/** @internal */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Schema<Infer<Members[number]>> => makeSchema(AST.union(members.map((m) => m.ast)))

/** @internal */
export const nullable = <A>(self: Schema<A>): Schema<A | null> => union(_null, self)

const OptionalSchemaId = Symbol.for("@fp-ts/schema/Schema/OptionalSchema")

const isOptionalSchema = <A>(schema: Schema<A>): schema is OptionalSchema<A, boolean> =>
  schema["_id"] === OptionalSchemaId

/** @internal */
export const optional = <A>(schema: Schema<A>): OptionalSchema<A, true> => {
  const out: any = makeSchema(schema.ast)
  out["_id"] = OptionalSchemaId
  return out
}

/** @internal */
export const struct = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
): Schema<
  Spread<
    & { readonly [K in Exclude<keyof Fields, OptionalKeys<Fields>>]: Infer<Fields[K]> }
    & { readonly [K in OptionalKeys<Fields>]?: Infer<Fields[K]> }
  >
> =>
  makeSchema(
    AST.typeLiteral(
      ownKeys(fields).map((key) =>
        AST.propertySignature(key, fields[key].ast, isOptionalSchema(fields[key]), true)
      ),
      []
    )
  )

/** @internal */
export const tuple = <Elements extends ReadonlyArray<Schema<any>>>(
  ...elements: Elements
): Schema<{ readonly [K in keyof Elements]: Infer<Elements[K]> }> =>
  makeSchema(AST.tuple(elements.map((schema) => AST.element(schema.ast, false)), O.none, true))

/** @internal */
export const lazy = <A>(
  f: () => Schema<A>,
  annotations?: AST.Annotated["annotations"]
): Schema<A> => makeSchema(AST.lazy(() => f().ast, annotations))

/** @internal */
export const array = <A>(item: Schema<A>): Schema<ReadonlyArray<A>> =>
  makeSchema(AST.tuple([], O.some([item.ast]), true))

/** @internal */
export const record = <K extends string | symbol, V>(
  key: Schema<K>,
  value: Schema<V>
): Schema<{ readonly [k in K]: V }> => makeSchema(AST.record(key.ast, value.ast, true))

/** @internal */
export const getKeysForIndexSignature = (
  input: { readonly [x: PropertyKey]: unknown },
  parameter: AST.AST
): ReadonlyArray<string> | ReadonlyArray<symbol> => {
  switch (parameter._tag) {
    case "StringKeyword":
    case "TemplateLiteral":
      return Object.keys(input)
    case "SymbolKeyword":
      return Object.getOwnPropertySymbols(input)
    case "Refinement":
      return getKeysForIndexSignature(input, parameter.from)
    default:
      return []
  }
}

/** @internal */
export const getTemplateLiteralRegex = (ast: AST.TemplateLiteral): RegExp => {
  let pattern = `^${ast.head}`
  for (const span of ast.spans) {
    if (AST.isStringKeyword(span.type)) {
      pattern += ".*"
    } else if (AST.isNumberKeyword(span.type)) {
      pattern += "-?\\d+(\\.\\d+)?"
    }
    pattern += span.literal
  }
  pattern += "$"
  return new RegExp(pattern)
}

// ---------------------------------------------
// general helpers
// ---------------------------------------------

/** @internal */
export const ownKeys = (o: object): ReadonlyArray<PropertyKey> =>
  (Object.keys(o) as ReadonlyArray<PropertyKey>).concat(Object.getOwnPropertySymbols(o))

/** @internal */
export const memoize = <A, B>(f: (a: A) => B): (a: A) => B => {
  const cache = new Map()
  return (a) => {
    if (!cache.has(a)) {
      const b = f(a)
      cache.set(a, b)
      return b
    }
    return cache.get(a)
  }
}
