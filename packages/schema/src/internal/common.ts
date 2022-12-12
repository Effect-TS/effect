/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Json, JsonArray, JsonObject } from "@fp-ts/data/Json"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
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
import type { Provider } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

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
export const flatMap = <A, E2, B>(
  f: (a: A) => T.These<NonEmptyReadonlyArray<E2>, B>
) =>
  <E1>(self: T.These<NonEmptyReadonlyArray<E1>, A>): T.These<NonEmptyReadonlyArray<E1 | E2>, B> => {
    if (T.isLeft(self)) {
      return self
    }
    if (T.isRight(self)) {
      return f(self.right)
    }
    const that = f(self.right)
    if (T.isLeft(that)) {
      return T.left(RA.prependAllNonEmpty(that.left)(self.left))
    }
    if (T.isRight(that)) {
      return T.both(self.left, that.right)
    }
    return T.both(RA.prependAllNonEmpty(that.left)(self.left), that.right)
  }

/** @internal */
export const compose = <B, C>(bc: Decoder<B, C>) =>
  <A>(ab: Decoder<A, B>): Decoder<A, C> =>
    makeDecoder(bc, (a) => pipe(ab.decode(a), flatMap(bc.decode)))

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
export const isUnknownObject = (u: unknown): u is { readonly [_: PropertyKey]: unknown } =>
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
// Compiler IDs
// ---------------------------------------------

/** @internal */
export const GuardId: unique symbol = Symbol.for(
  "@fp-ts/schema/Guard"
)

/** @internal */
export const ArbitraryId: unique symbol = Symbol.for(
  "@fp-ts/schema/Arbitrary"
)

/** @internal */
export const DecoderId: unique symbol = Symbol.for(
  "@fp-ts/schema/Decoder"
)

/** @internal */
export const EncoderId: unique symbol = Symbol.for(
  "@fp-ts/schema/Encoder"
)

/** @internal */
export const PrettyId: unique symbol = Symbol.for(
  "@fp-ts/schema/Pretty"
)

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
export const declareSchema = <Schemas extends ReadonlyArray<Schema<any>>>(
  id: symbol,
  keyof: ReadonlyArray<AST.KeyOf>,
  config: Option<unknown>,
  provider: Provider,
  ...schemas: Schemas
): Schema<any> => makeSchema(AST.declare(id, keyof, config, provider, schemas.map((s) => s.ast)))

const makeLiteral = <Literal extends AST.Literal>(value: Literal): Schema<Literal> =>
  makeSchema(AST.literalType(value))

/** @internal */
export const literal = <Literals extends ReadonlyArray<AST.Literal>>(
  ...literals: Literals
): Schema<Literals[number]> =>
  literals.length === 1 ? makeLiteral(literals[0]) : union(...literals.map(makeLiteral))

/** @internal */
export const isUndefined = (u: unknown): u is undefined => u === undefined

/** @internal */
export const _undefined: Schema<undefined> = makeSchema(AST.undefinedKeyword)

/** @internal */
export const isNever = (_u: unknown): _u is never => false

/** @internal */
export const never: Schema<never> = makeSchema(AST.neverKeyword)

/** @internal */
export const isUnknown = (_u: unknown): _u is unknown => true

/** @internal */
export const unknown: Schema<unknown> = makeSchema(AST.unknownKeyword)

/** @internal */
export const any: Schema<any> = makeSchema(AST.anyKeyword)

/** @internal */
export const string: Schema<string> = makeSchema(AST.stringKeyword)

/** @internal */
export const number: Schema<number> = makeSchema(AST.numberKeyword)

/** @internal */
export const boolean: Schema<boolean> = makeSchema(AST.booleanKeyword)

/** @internal */
export const isBigInt = (u: unknown): u is bigint => typeof u === "bigint"

/** @internal */
export const bigint: Schema<bigint> = makeSchema(AST.bigIntKeyword)

/** @internal */
export const isSymbol = (u: unknown): u is symbol => typeof u === "symbol"

/** @internal */
export const symbol: Schema<symbol> = makeSchema(AST.symbolKeyword)

type Infer<S extends Schema<any>> = Parameters<S["A"]>[0]

/** @internal */
export const union = <Members extends ReadonlyArray<Schema<any>>>(
  ...members: Members
): Schema<Infer<Members[number]>> => makeSchema(AST.union(members.map((m) => m.ast)))

type Spread<A> = {
  [K in keyof A]: A[K]
} extends infer B ? B : never

/** @internal */
export const struct: {
  <Required extends Record<PropertyKey, Schema<any>>>(
    required: Required
  ): Schema<{ readonly [K in keyof Required]: Infer<Required[K]> }>
  <
    Required extends Record<PropertyKey, Schema<any>>,
    Optional extends Record<PropertyKey, Schema<any>>
  >(
    required: Required,
    optional: Optional
  ): Schema<
    Spread<
      & { readonly [K in keyof Required]: Infer<Required[K]> }
      & { readonly [K in keyof Optional]?: Infer<Optional[K]> }
    >
  >
} = <
  Required extends Record<PropertyKey, Schema<any>>,
  Optional extends Record<PropertyKey, Schema<any>>
>(
  required: Required,
  optional?: Optional
): Schema<
  Spread<
    & { readonly [K in keyof Required]: Infer<Required[K]> }
    & { readonly [K in keyof Optional]?: Infer<Optional[K]> }
  >
> => {
  const _optional: any = optional || {}
  return makeSchema(
    AST.struct(
      getPropertyKeys(required).map((key) => AST.field(key, required[key].ast, false, true))
        .concat(
          getPropertyKeys(_optional).map((key) => AST.field(key, _optional[key].ast, true, true))
        ),
      AST.indexSignatures(O.none, O.none, O.none)
    )
  )
}

/** @internal */
export const lazy = <A>(f: () => Schema<A>): Schema<A> => makeSchema(AST.lazy(() => f().ast))

/** @internal */
export const array = <A>(item: Schema<A>): Schema<ReadonlyArray<A>> =>
  makeSchema(AST.tuple([], O.some(item.ast), true))

// ---------------------------------------------
// general helpers
// ---------------------------------------------

/** @internal */
export const getPropertyKeys = (o: object): ReadonlyArray<PropertyKey> =>
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
