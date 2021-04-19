// tracing: off

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Random.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import "../Operator"

import { chain_, succeedWith } from "../Effect/core"
import type { UIO } from "../Effect/effect"
import { accessServiceM, replaceService } from "../Effect/has"
import type { HasTag } from "../Has"
import { tag } from "../Has"
import { PCGRandom } from "./PCG"

export const RandomSymbol: unique symbol = Symbol.for("@effect-ts/system/Random")
export type RandomSymbol = typeof RandomSymbol

export abstract class Random {
  readonly _tag: RandomSymbol = RandomSymbol

  abstract readonly next: UIO<number>
  abstract readonly nextBoolean: UIO<boolean>
  abstract readonly nextInt: UIO<number>
  abstract readonly nextRange: (low: number, high: number) => UIO<number>
  abstract readonly nextIntBetween: (low: number, high: number) => UIO<number>
}

export class LiveRandom extends Random {
  private PRNG = new PCGRandom(this.seed)

  constructor(private seed: number) {
    super()
  }

  next: UIO<number> = succeedWith(() => this.PRNG.number())

  nextBoolean: UIO<boolean> = chain_(this.next, (n) => succeedWith(() => n > 0.5))

  nextInt: UIO<number> = succeedWith(() => this.PRNG.integer(0))

  nextRange: (low: number, high: number) => UIO<number> = (low, high) =>
    chain_(this.next, (n) => succeedWith(() => (high - low) * n + low))

  nextIntBetween: (low: number, high: number) => UIO<number> = (low, high) =>
    succeedWith(() => this.PRNG.integer(1 + high - low) + low)
}

export const defaultRandom = new LiveRandom(Math.random())

export const HasRandom = tag(Random).setKey(RandomSymbol)

export type HasRandom = HasTag<typeof HasRandom>

export const next = accessServiceM(HasRandom)((_) => _.next)

export const nextBoolean = accessServiceM(HasRandom)((_) => _.nextBoolean)

export const nextIntBetween = (low: number, high: number) =>
  accessServiceM(HasRandom)((_) => _.nextIntBetween(low, high))

export const nextInt = accessServiceM(HasRandom)((_) => _.nextInt)

export const nextRange = (low: number, high: number) =>
  accessServiceM(HasRandom)((_) => _.nextRange(low, high))

export const withSeed = (seed: number) =>
  replaceService(HasRandom, () => new LiveRandom(seed))
