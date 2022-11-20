/**
 * @since 1.0.0
 */
import * as arbitrary_ from "@fp-ts/codec/Arbitrary"
import type * as J from "@fp-ts/codec/data/Json"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import { ArbitraryId, GuardId, JsonDecoderId, ShowId } from "@fp-ts/codec/internal/Interpreter"
import * as provider from "@fp-ts/codec/Provider"
import * as S from "@fp-ts/codec/Schema"
import * as show_ from "@fp-ts/codec/Show"
import * as T from "@fp-ts/data/These"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/Set")

/**
 * @since 1.0.0
 */
export const guard = <A>(item: G.Guard<A>): G.Guard<Set<A>> =>
  G.make(
    schema(item),
    (input): input is Set<A> => input instanceof Set && Array.from(input.values()).every(item.is)
  )

// TODO decoder

/**
 * @since 1.0.0
 */
export const jsonDecoder = <A>(item: D.Decoder<J.Json, A>): D.Decoder<J.Json, Set<A>> =>
  D.make(schema(item), (json) => {
    if (!(Array.isArray(json))) {
      return D.fail(DE.notType("Array", json))
    }
    const out: Set<unknown> = new Set()
    for (let i = 0; i < json.length; i++) {
      const t = item.decode(json[i])
      if (T.isLeft(t)) {
        return T.left(t.left)
      }
      out.add(t.right) // TODO handle both
    }
    return D.succeed(out as any)
  })

/**
 * @since 1.0.0
 */
export const arbitrary = <A>(item: arbitrary_.Arbitrary<A>): arbitrary_.Arbitrary<Set<A>> =>
  arbitrary_.make(
    schema(item),
    (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as))
  )

/**
 * @since 1.0.0
 */
export const show = <A>(item: show_.Show<A>): show_.Show<Set<A>> =>
  show_.make(schema(item), (a) => `Set([${Array.from(a.values()).map(item.show).join(", ")}])`)

/**
 * @since 1.0.0
 */
export const Provider: provider.Provider = provider.make(id, {
  [GuardId]: guard,
  [ArbitraryId]: arbitrary,
  [ShowId]: show,
  [JsonDecoderId]: jsonDecoder
})

/**
 * @since 1.0.0
 */
export const schema = <A>(item: S.Schema<A>): S.Schema<Set<A>> => S.declare(id, Provider, item)
