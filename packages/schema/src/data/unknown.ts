/**
 * @since 1.0.0
 */
import * as Arb from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import { ArbitraryId, GuardId, JsonDecoderId } from "@fp-ts/codec/internal/Interpreter"
import * as S from "@fp-ts/codec/Schema"
import type * as support from "@fp-ts/codec/Support"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/unknown")

/**
 * @since 1.0.0
 */
export const Support: support.Support = new Map([
  [GuardId, new Map<symbol, Function>([[id, () => Guard]])],
  [ArbitraryInterpreterId, new Map<symbol, Function>([[id, () => Arbitrary]])],
  [JsonDecoderId, new Map<symbol, Function>([[id, () => Decoder]])]
])
/**
 * @since 1.0.0
 */
export const Schema: S.Schema<unknown> = S.declare(id, Support)

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<unknown> = G.make(Schema, (_u: unknown): _u is unknown => true)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, unknown> = D.fromGuard(
  Guard,
  (u) => DE.notType("unknown", u)
)

/**
 * @since 1.0.0
 */
export const Arbitrary: Arb.Arbitrary<unknown> = Arb.make(Schema, (fc) => fc.anything())
