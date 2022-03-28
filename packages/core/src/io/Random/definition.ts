import type { LazyArg } from "../../data/Function"
import type { Has } from "../../data/Has"
import { tag } from "../../data/Has"
import type { UIO } from "../Effect"

export const RandomId: unique symbol = Symbol.for("@effect-ts/core/Random")
export type RandomId = typeof RandomId

/**
 * @tsplus type ets/Random
 */
export interface Random {
  readonly next: UIO<number>
  readonly nextBoolean: UIO<boolean>
  readonly nextInt: UIO<number>
  readonly nextRange: (low: number, high: number, __tsplusTrace?: string) => UIO<number>
  readonly nextIntBetween: (
    low: number,
    high: number,
    __tsplusTrace?: string
  ) => UIO<number>
  readonly shuffle: <A>(
    collection: LazyArg<Iterable<A>>,
    __tsplusTrace?: string
  ) => UIO<Iterable<A>>
}

/**
 * @tsplus type ets/RandomOps
 */
export interface RandomOps {}
export const Random: RandomOps = {}

export const HasRandom = tag<Random>(RandomId)

export type HasRandom = Has<Random>
