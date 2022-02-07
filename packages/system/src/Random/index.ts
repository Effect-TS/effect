// ets_tracing: off

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Random.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import "../Operator/index.js"

import { chain_, succeedWith } from "../Effect/core.js"
import type { UIO } from "../Effect/effect.js"
import { accessServiceM, replaceService } from "../Effect/has.js"
import type { Has } from "../Has/index.js"
import { tag } from "../Has/index.js"
import { PCGRandom } from "./PCG/index.js"

export const RandomId: unique symbol = Symbol.for("@effect-ts/system/Random")
export type RandomId = typeof RandomId

export abstract class Random {
  readonly serviceId: RandomId = RandomId

  abstract readonly next: UIO<number>
  abstract readonly nextBoolean: UIO<boolean>
  abstract readonly nextInt: UIO<number>
  abstract readonly nextRange: (low: number, high: number) => UIO<number>
  abstract readonly nextIntBetween: (low: number, high: number) => UIO<number>
}

export class LiveRandom extends Random {
  private PRNG

  constructor(seed: number) {
    super()
    this.PRNG = new PCGRandom(seed)
  }

  next: UIO<number> = succeedWith(() => this.PRNG.number())

  nextBoolean: UIO<boolean> = chain_(this.next, (n) => succeedWith(() => n > 0.5))

  nextInt: UIO<number> = succeedWith(() => this.PRNG.integer(0))

  nextRange: (low: number, high: number) => UIO<number> = (low, high) =>
    chain_(this.next, (n) => succeedWith(() => (high - low) * n + low))

  nextIntBetween: (low: number, high: number) => UIO<number> = (low, high) =>
    succeedWith(() => this.PRNG.integer(1 + high - low) + low)
}

export const defaultRandom = new LiveRandom((Math.random() * 4294967296) >>> 0)

export const HasRandom = tag<Random>(RandomId)

export type HasRandom = Has<Random>

export const next = accessServiceM(HasRandom)((_) => _.next)

export const nextBoolean = accessServiceM(HasRandom)((_) => _.nextBoolean)

export const nextIntBetween = (low: number, high: number) =>
  accessServiceM(HasRandom)((_) => _.nextIntBetween(low, high))

export const nextInt = accessServiceM(HasRandom)((_) => _.nextInt)

export const nextRange = (low: number, high: number) =>
  accessServiceM(HasRandom)((_) => _.nextRange(low, high))

export const withSeed = (seed: number) =>
  replaceService(HasRandom, () => new LiveRandom(seed))
