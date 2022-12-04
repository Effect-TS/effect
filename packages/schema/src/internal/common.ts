/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import type { Json, JsonArray, JsonObject } from "@fp-ts/data/Json"
import type { Option } from "@fp-ts/data/Option"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"
import * as RA from "@fp-ts/data/ReadonlyArray"
import * as T from "@fp-ts/data/These"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import type { AST } from "@fp-ts/schema/AST"
import * as ast from "@fp-ts/schema/AST"
import type { UnknownObject } from "@fp-ts/schema/data/UnknownObject"
import type * as DE from "@fp-ts/schema/DecodeError"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import type { Provider } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

export const success: <A>(a: A) => T.These<never, A> = T.right

export const failure = (e: DE.DecodeError): T.These<NonEmptyReadonlyArray<DE.DecodeError>, never> =>
  T.left([e])

export const failures = (
  es: NonEmptyReadonlyArray<DE.DecodeError>
): T.These<NonEmptyReadonlyArray<DE.DecodeError>, never> => T.left(es)

export const warning = <A>(
  e: DE.DecodeError,
  a: A
): T.These<NonEmptyReadonlyArray<DE.DecodeError>, A> => T.both([e], a)

export const warnings = <A>(
  es: NonEmptyReadonlyArray<DE.DecodeError>,
  a: A
): T.These<NonEmptyReadonlyArray<DE.DecodeError>, A> => T.both(es, a)

export const isSuccess = T.isRight

export const isFailure = T.isLeft

export const isWarning = T.isBoth

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

export const isUnknownObject = (u: unknown): u is UnknownObject =>
  typeof u === "object" && u != null && !Array.isArray(u)

export const isJsonArray = (u: unknown): u is JsonArray => Array.isArray(u) && u.every(isJson)

export const isJsonObject = (u: unknown): u is JsonObject =>
  isUnknownObject(u) && Object.keys(u).every((key) => isJson(u[key]))

export const isJson = (u: unknown): u is Json =>
  u === null || typeof u === "string" || typeof u === "number" || typeof u === "boolean" ||
  isJsonArray(u) ||
  isJsonObject(u)

export const GuardId: unique symbol = Symbol.for(
  "@fp-ts/schema/Guard"
)

export const ArbitraryId: unique symbol = Symbol.for(
  "@fp-ts/schema/Arbitrary"
)

export const JsonDecoderId: unique symbol = Symbol.for(
  "@fp-ts/schema/JsonDecoder"
)

export const UnknownDecoderId: unique symbol = Symbol.for(
  "@fp-ts/schema/UnknownDecoder"
)

export const JsonEncoderId: unique symbol = Symbol.for(
  "@fp-ts/schema/JsonEncoder"
)

export const UnknownEncoderId: unique symbol = Symbol.for(
  "@fp-ts/schema/UnknownEncoder"
)

export const makeSchema = <A>(ast: AST): Schema<A> => ({ ast }) as any

export const declareSchema = <Schemas extends ReadonlyArray<Schema<any>>>(
  id: symbol,
  config: Option<unknown>,
  provider: Provider,
  ...schemas: Schemas
): Schema<any> => makeSchema(ast.declare(id, config, provider, schemas.map((s) => s.ast)))

export const makeArbitrary = <A>(
  schema: Schema<A>,
  arbitrary: Arbitrary<A>["arbitrary"]
): Arbitrary<A> => ({ ast: schema.ast, arbitrary }) as any

export const makeDecoder = <I, A>(
  schema: Schema<A>,
  decode: Decoder<I, A>["decode"]
): Decoder<I, A> => ({ ast: schema.ast, decode }) as any

export const compose = <B, C>(bc: Decoder<B, C>) =>
  <A>(ab: Decoder<A, B>): Decoder<A, C> =>
    makeDecoder(bc, (a) => pipe(ab.decode(a), flatMap(bc.decode)))

export const fromRefinement = <A>(
  schema: Schema<A>,
  refinement: (u: unknown) => u is A,
  onFalse: (u: unknown) => DE.DecodeError
): Decoder<unknown, A> =>
  makeDecoder(schema, (u) => refinement(u) ? success(u) : failure(onFalse(u)))

export const makeGuard = <A>(
  schema: Schema<A>,
  is: Guard<A>["is"]
): Guard<A> => ({ ast: schema.ast, is }) as any

export const makeEncoder = <O, A>(
  schema: Schema<A>,
  encode: Encoder<O, A>["encode"]
): Encoder<O, A> => ({ ast: schema.ast, encode }) as any

export const append = <A>(self: Array<A>, a: A): NonEmptyReadonlyArray<A> => {
  self.push(a)
  return self as any
}

export const isNonEmpty = RA.isNonEmpty

export const isValueJsonEncodable = (u: unknown): u is Json => {
  try {
    JSON.stringify(u)
    return true
  } catch (e) {
    return false
  }
}

export const getPropertyKeys = (o: object): ReadonlyArray<PropertyKey> =>
  (Object.keys(o) as ReadonlyArray<PropertyKey>).concat(Object.getOwnPropertySymbols(o))
