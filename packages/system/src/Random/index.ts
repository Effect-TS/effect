/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Random.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import { chain_, effectTotal } from "../Effect/core"
import type { UIO } from "../Effect/effect"
import { accessServiceM, replaceService } from "../Effect/has"
import type { HasTag } from "../Has"
import { tag } from "../Has"
import { PRNG } from "./Alea"

export const RandomURI = Symbol()

export abstract class Random {
  readonly _tag!: typeof RandomURI

  abstract readonly next: UIO<number>
  abstract readonly nextBoolean: UIO<boolean>
  abstract readonly nextInt: UIO<number>
  abstract readonly nextDouble: UIO<number>
  abstract readonly nextRange: (low: number, high: number) => UIO<number>
  abstract readonly nextIntBetween: (low: number, high: number) => UIO<number>
  abstract readonly setSeed: (s: string) => UIO<void>
}

export class LiveRandom extends Random {
  private PRNG = new PRNG(this.seed)

  constructor(private seed: string) {
    super()
  }

  next: UIO<number> = effectTotal(() => this.PRNG.next())

  nextBoolean: UIO<boolean> = chain_(this.next, (n) => effectTotal(() => n > 0.5))

  nextInt: UIO<number> = effectTotal(() => this.PRNG.int32())

  nextDouble: UIO<number> = effectTotal(() => this.PRNG.double())

  nextRange: (low: number, high: number) => UIO<number> = (low, high) =>
    chain_(this.next, (n) => effectTotal(() => (high - low) * n + low))

  nextIntBetween: (low: number, high: number) => UIO<number> = (low, high) =>
    chain_(this.next, (n) => effectTotal(() => Math.floor((high - low + 1) * n + low)))

  setSeed = (s: string) =>
    effectTotal(() => {
      this.PRNG.setSeed(s)
    })
}

export const defaultRandom = new LiveRandom(String(Math.random()))

export const HasRandom = tag(Random)
export type HasRandom = HasTag<typeof HasRandom>

export const next = accessServiceM(HasRandom)((_) => _.next)

export const nextBoolean = accessServiceM(HasRandom)((_) => _.nextBoolean)

export const nextIntBetween = (low: number, high: number) =>
  accessServiceM(HasRandom)((_) => _.nextIntBetween(low, high))

export const nextInt = accessServiceM(HasRandom)((_) => _.nextInt)

export const nextDouble = accessServiceM(HasRandom)((_) => _.nextDouble)

export const nextRange = (low: number, high: number) =>
  accessServiceM(HasRandom)((_) => _.nextRange(low, high))

export const setSeed = (seed: string) =>
  accessServiceM(HasRandom)((_) => _.setSeed(seed))

export const withSeed = (seed: string) =>
  replaceService(HasRandom, () => new LiveRandom(seed))
