/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Random.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

import type { Has } from "../../data/Has"
import { tag } from "../../data/Has"
import type { UIO } from "../Effect"
import { chain_ } from "../Effect/operations/chain"
import { serviceWithEffect } from "../Effect/operations/serviceWithEffect"
import { succeed } from "../Effect/operations/succeed"
import { updateService } from "../Effect/operations/updateService"
import { PCGRandom } from "./PCG"

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

  next: UIO<number> = succeed(() => this.PRNG.number())

  nextBoolean: UIO<boolean> = chain_(this.next, (n) => succeed(() => n > 0.5))

  nextInt: UIO<number> = succeed(() => this.PRNG.integer(0))

  nextRange: (low: number, high: number) => UIO<number> = (low, high) =>
    chain_(this.next, (n) => succeed(() => (high - low) * n + low))

  nextIntBetween: (low: number, high: number) => UIO<number> = (low, high) =>
    succeed(() => this.PRNG.integer(1 + high - low) + low)
}

export const defaultRandom = new LiveRandom((Math.random() * 4294967296) >>> 0)

export const HasRandom = tag<Random>(RandomId)

export type HasRandom = Has<Random>

export const next = serviceWithEffect(HasRandom)((_) => _.next)

export const nextBoolean = serviceWithEffect(HasRandom)((_) => _.nextBoolean)

export const nextIntBetween = (low: number, high: number) =>
  serviceWithEffect(HasRandom)((_) => _.nextIntBetween(low, high))

export const nextInt = serviceWithEffect(HasRandom)((_) => _.nextInt)

export const nextRange = (low: number, high: number) =>
  serviceWithEffect(HasRandom)((_) => _.nextRange(low, high))

export const withSeed = (seed: number) =>
  updateService(HasRandom, () => new LiveRandom(seed))
