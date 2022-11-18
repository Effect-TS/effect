/**
 * @since 1.0.0
 */
import * as Arb from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import { ArbitraryId, GuardId, JsonDecoderId } from "@fp-ts/codec/internal/Interpreter"
import type * as provider from "@fp-ts/codec/Provider"
import * as S from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/any")

/**
 * @since 1.0.0
 */
export const Provider: provider.Provider = new Map([
  [GuardId, new Map<symbol, Function>([[id, () => Guard]])],
  [ArbitraryId, new Map<symbol, Function>([[id, () => Arbitrary]])],
  [JsonDecoderId, new Map<symbol, Function>([[id, () => Decoder]])]
])
/**
 * @since 1.0.0
 */
export const Schema: S.Schema<any> = S.declare(id, Provider)

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<any> = G.make(Schema, (_u: unknown): _u is any => true)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, any> = D.fromGuard(
  Guard,
  (u) => DE.notType("any", u)
)

/**
 * @since 1.0.0
 */
export const Arbitrary: Arb.Arbitrary<unknown> = Arb.make(Schema, (fc) => fc.anything())
