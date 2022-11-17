/**
 * @since 1.0.0
 */
import * as arbitrary from "@fp-ts/codec/Arbitrary"
import type * as J from "@fp-ts/codec/data/Json"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import {
  ArbitraryInterpreterId,
  GuardInterpreterId,
  JsonDecoderInterpreterId,
  ShowInterpreterId
} from "@fp-ts/codec/internal/Interpreter"
import * as T from "@fp-ts/codec/internal/These"
import * as S from "@fp-ts/codec/Schema"
import * as Sh from "@fp-ts/codec/Show"
import type * as support from "@fp-ts/codec/Support"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/Set")

/**
 * @since 1.0.0
 */
export const Guard = <A>(item: G.Guard<A>): G.Guard<Set<A>> =>
  G.make(
    Schema(item),
    (input): input is Set<A> => input instanceof Set && Array.from(input.values()).every(item.is)
  )

/**
 * @since 1.0.0
 */
export const Decoder = <A>(item: D.Decoder<J.Json, A>): D.Decoder<J.Json, Set<A>> =>
  D.make(Schema(item), (u) => {
    if (!(Array.isArray(u))) {
      return D.fail(DE.notType("Array", u))
    }
    const out: Set<unknown> = new Set()
    for (let i = 0; i < u.length; i++) {
      const t = item.decode(u[i])
      if (T.isLeft(t)) {
        return T.left(t.left)
      }
      out.add(t.right)
    }
    return D.succeed(out as any)
  })

/**
 * @since 1.0.0
 */
export const Arbitrary = <A>(item: arbitrary.Arbitrary<A>): arbitrary.Arbitrary<Set<A>> =>
  arbitrary.make(
    Schema(item),
    (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as))
  )

/**
 * @since 1.0.0
 */
export const Show = <A>(item: Sh.Show<A>): Sh.Show<Set<A>> =>
  Sh.make(Schema(item), (a) => `Set([${Array.from(a.values()).map(item.show).join(", ")}])`)

/**
 * @since 1.0.0
 */
export const Support: support.Support = new Map([
  [GuardInterpreterId, new Map<symbol, Function>([[id, Guard]])],
  [ArbitraryInterpreterId, new Map<symbol, Function>([[id, Arbitrary]])],
  [ShowInterpreterId, new Map<symbol, Function>([[id, Show]])],
  [JsonDecoderInterpreterId, new Map<symbol, Function>([[id, Decoder]])]
])

/**
 * @since 1.0.0
 */
export const Schema = <A>(item: S.Schema<A>): S.Schema<Set<A>> => S.declare(id, Support, item)
