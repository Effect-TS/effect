/**
 * @since 1.0.0
 */

import type { Json, JsonArray, JsonObject } from "@fp-ts/data/Json"
import * as O from "@fp-ts/data/Option"
import type { Refinement } from "@fp-ts/data/Predicate"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import * as RA from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as AST from "@fp-ts/schema/AST"
import type * as DE from "@fp-ts/schema/DecodeError"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { OptionalKeys, OptionalSchema, Schema, Spread } from "@fp-ts/schema/Schema"

// ---------------------------------------------
// Decoder APIs
// ---------------------------------------------

/** @internal */
export const success: <A>(a: A) => T.These<never, A> = T.right

/** @internal */
export const failure = (e: DE.DecodeError): T.These<NonEmptyReadonlyArray<DE.DecodeError>, never> =>
  T.left([e])

/** @internal */
export const failures = (
  es: NonEmptyReadonlyArray<DE.DecodeError>
): T.These<NonEmptyReadonlyArray<DE.DecodeError>, never> => T.left(es)

/** @internal */
export const warning = <A>(
  e: DE.DecodeError,
  a: A
): T.These<NonEmptyReadonlyArray<DE.DecodeError>, A> => T.both([e], a)

/** @internal */
export const warnings = <A>(
  es: NonEmptyReadonlyArray<DE.DecodeError>,
  a: A
): T.These<NonEmptyReadonlyArray<DE.DecodeError>, A> => T.both(es, a)

/** @internal */
export const isSuccess = T.isRight

/** @internal */
export const isFailure = T.isLeft

/** @internal */
export const isWarning = T.isBoth

/** @internal */
export const flatMap: <A, E2, B>(f: (a: A) => T.Validated<E2, B>) => <E1>(
  self: T.Validated<E1, A>
) => T.Validated<E1 | E2, B> = T.flatMap

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
export const isUnknownObject = (u: unknown): u is { readonly [x: PropertyKey]: unknown } =>
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
export const makeGuard = <A>(
  schema: Schema<A>,
  is: Guard<A>["is"]
): Guard<A> => ({ ast: schema.ast, is }) as any

/** @internal */
export const makeArbitrary = <A>(
  schema: Schema<A>,
  arbitrary: Arbitrary<A>["arbitrary"]
): Arbitrary<A> => ({ ast: schema.ast, arbitrary }) as any

/** @internal */
export const makeDecoder = <I, A>(
  schema: Schema<A>,
  decode: Decoder<I, A>["decode"]
): Decoder<I, A> => ({ ast: schema.ast, decode }) as any

/** @internal */
export const fromRefinement = <A>(
  schema: Schema<A>,
  refinement: (u: unknown) => u is A,
  onFalse: (u: unknown) => DE.DecodeError
): Decoder<unknown, A> =>
  makeDecoder(schema, (u) => refinement(u) ? success(u) : failure(onFalse(u)))

/** @internal */
export const makeEncoder = <O, A>(
  schema: Schema<A>,
  encode: Encoder<O, A>["encode"]
): Encoder<O, A> => ({ ast: schema.ast, encode }) as any

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
  annotations: ReadonlyArray<unknown>
): Schema<any> =>
  makeSchema(AST.typeAliasDeclaration(
    typeParameters.map((tp) => tp.ast),
    type.ast,
    annotations
  ))

/** @internal */
export const refinement = <A, B extends A>(
  from: Schema<A>,
  refinement: Refinement<A, B>,
  declaration: unknown,
  annotations: ReadonlyArray<unknown>
): Schema<B> => makeSchema(AST.refinement(from.ast, refinement, declaration, annotations))

const makeLiteral = <Literal extends AST.Literal>(
  value: Literal,
  annotations: ReadonlyArray<unknown>
): Schema<Literal> => makeSchema(AST.literalType(value, annotations))

/** @internal */
export const literal = <Literals extends ReadonlyArray<AST.Literal>>(
  ...literals: Literals
): Schema<Literals[number]> => union(...literals.map((literal) => makeLiteral(literal, [])))

/** @internal */
export const uniqueSymbol = <S extends symbol>(symbol: S): Schema<S> =>
  makeSchema(AST.uniqueSymbol(symbol, []))

/** @internal */
export const isUndefined = (u: unknown): u is undefined => u === undefined

/** @internal */
export const _undefined: Schema<undefined> = makeSchema(AST.undefinedKeyword([]))

/** @internal */
export const isNever = (_u: unknown): _u is never => false

/** @internal */
export const never: Schema<never> = makeSchema(AST.neverKeyword([]))

/** @internal */
export const isUnknown = (_u: unknown): _u is unknown => true

/** @internal */
export const unknown: Schema<unknown> = makeSchema(AST.unknownKeyword([]))

/** @internal */
export const any: Schema<any> = makeSchema(AST.anyKeyword([]))

/** @internal */
export const string: Schema<string> = makeSchema(AST.stringKeyword([]))

/** @internal */
export const number: Schema<number> = makeSchema(AST.numberKeyword([]))

/** @internal */
export const boolean: Schema<boolean> = makeSchema(AST.booleanKeyword([]))

/** @internal */
export const isBigInt = (u: unknown): u is bigint => typeof u === "bigint"

/** @internal */
export const bigint: Schema<bigint> = makeSchema(AST.bigIntKeyword([]))

/** @internal */
export const isSymbol = (u: unknown): u is symbol => typeof u === "symbol"

/** @internal */
export const symbol: Schema<symbol> = makeSchema(AST.symbolKeyword([]))

/** @internal */
export const _void: Schema<void> = makeSchema(AST.voidKeyword([]))

type Infer<S extends Schema<any>> = Parameters<S["A"]>[0]

/** @internal */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Schema<Infer<Members[number]>> => makeSchema(AST.union(members.map((m) => m.ast), []))

/** @internal */
export const FieldSchemaId: symbol = Symbol.for("@fp-ts/schema/Schema/Field")

const isOptionalSchema = <A>(schema: Schema<A>): schema is OptionalSchema<A, boolean> =>
  schema["_id"] === FieldSchemaId

const isOptional = <A>(schema: Schema<A>): boolean => isOptionalSchema(schema)

/** @internal */
export const optional = <A>(schema: Schema<A>): OptionalSchema<A, true> => {
  const out: any = makeSchema(schema.ast)
  out["_id"] = FieldSchemaId
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
    AST.struct(
      ownKeys(fields).map((key) =>
        AST.field(
          key,
          fields[key].ast,
          isOptional(fields[key]),
          true,
          []
        )
      ),
      [],
      []
    )
  )

/** @internal */
export const tuple = <Elements extends ReadonlyArray<Schema<any>>>(
  ...elements: Elements
): Schema<{ readonly [K in keyof Elements]: Infer<Elements[K]> }> =>
  makeSchema(
    AST.tuple(elements.map((schema) => AST.element(schema.ast, false, [])), O.none, true, [])
  )

/** @internal */
export const lazy = <A>(f: () => Schema<A>): Schema<A> => makeSchema(AST.lazy(() => f().ast, []))

/** @internal */
export const array = <A>(item: Schema<A>): Schema<ReadonlyArray<A>> =>
  makeSchema(AST.tuple([], O.some([item.ast]), true, []))

/** @internal */
export const stringIndexSignature = <A>(value: Schema<A>): Schema<{ readonly [x: string]: A }> =>
  makeSchema(
    AST.struct(
      [],
      [AST.indexSignature("string", value.ast, true, [])],
      []
    )
  )

/** @internal */
export const annotation = (
  annotation: unknown
) => <A>(schema: Schema<A>): Schema<A> => makeSchema(AST.prependAnnotation(schema.ast, annotation))

/** @internal */
export const annotations = (
  annotations: ReadonlyArray<unknown>
) =>
  <A>(schema: Schema<A>): Schema<A> =>
    makeSchema(AST.prependAllAnnotations(schema.ast, annotations))

// ---------------------------------------------
// general helpers
// ---------------------------------------------

/** @internal */
export const ownKeys = (o: object): ReadonlyArray<PropertyKey> =>
  (Object.keys(o) as ReadonlyArray<PropertyKey>).concat(Object.getOwnPropertySymbols(o))

/** @internal */
export const memoize = <A, B>(f: (a: A) => B, trace = false): (a: A) => B => {
  const cache = new Map()
  return (a) => {
    if (!cache.has(a)) {
      const b = f(a)
      cache.set(a, b)
      return b
    } else if (trace) {
      console.log("cache hit, key: ", a, ", value: ", cache.get(a))
    }
    return cache.get(a)
  }
}
