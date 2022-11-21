/**
 * @since 1.0.0
 */

import type { Arbitrary } from "@fp-ts/codec/Arbitrary"
import type { AST } from "@fp-ts/codec/AST"
import * as ast from "@fp-ts/codec/AST"
import type * as DE from "@fp-ts/codec/DecodeError"
import type { Decoder } from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import type { Guard } from "@fp-ts/codec/Guard"
import type { Provider } from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import type { Show } from "@fp-ts/codec/Show"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"

export const GuardId: unique symbol = Symbol.for(
  "@fp-ts/codec/Guard"
)

export type GuardId = typeof GuardId

export const ArbitraryId: unique symbol = Symbol.for(
  "@fp-ts/codec/Arbitrary"
)

export type ArbitraryId = typeof ArbitraryId

export const ShowId: unique symbol = Symbol.for(
  "@fp-ts/codec/Show"
)

export type ShowId = typeof ShowId

export const JsonDecoderId: unique symbol = Symbol.for(
  "@fp-ts/codec/JsonDecoder"
)

export type JsonDecoderId = typeof JsonDecoderId

export const JsonEncoderId: unique symbol = Symbol.for(
  "@fp-ts/codec/JsonEncoder"
)

export type JsonEncoderId = typeof JsonEncoderId

export const DecoderId: unique symbol = Symbol.for(
  "@fp-ts/codec/Decoder"
)

export type DecoderId = typeof DecoderId

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

export const succeed: <A>(a: A) => T.These<never, A> = T.right

export const fail = <E>(e: E): T.These<ReadonlyArray<E>, never> => T.left([e])

export const warn = <E, A>(e: E, a: A): T.These<ReadonlyArray<E>, A> => T.both([e], a)

export const flatMap = <A, E2, B>(
  f: (a: A) => T.These<ReadonlyArray<E2>, B>
) =>
  <E1>(self: T.These<ReadonlyArray<E1>, A>): T.These<ReadonlyArray<E1 | E2>, B> => {
    if (T.isLeft(self)) {
      return self
    }
    if (T.isRight(self)) {
      return f(self.right)
    }
    const that = f(self.right)
    if (T.isLeft(that)) {
      return T.left([...self.left, ...that.left])
    }
    if (T.isRight(that)) {
      return T.both(self.left, that.right)
    }
    return T.both([...self.left, ...that.left], that.right)
  }

export const compose = <B, C>(bc: Decoder<B, C>) =>
  <A>(ab: Decoder<A, B>): Decoder<A, C> =>
    makeDecoder(bc, (a) => pipe(ab.decode(a), flatMap(bc.decode)))

export const fromGuard = <A>(
  guard: Guard<A>,
  onFalse: (u: unknown) => DE.DecodeError
): Decoder<unknown, A> => makeDecoder(guard, (u) => guard.is(u) ? succeed(u) : fail(onFalse(u)))

export const makeGuard = <A>(
  schema: Schema<A>,
  is: Guard<A>["is"]
): Guard<A> => ({ ast: schema.ast, is }) as any

export const makeShow = <A>(schema: Schema<A>, show: Show<A>["show"]): Show<A> =>
  ({ ast: schema.ast, show }) as any

export const makeEncoder = <O, A>(
  schema: Schema<A>,
  encode: Encoder<O, A>["encode"]
): Encoder<O, A> => ({ ast: schema.ast, encode }) as any
