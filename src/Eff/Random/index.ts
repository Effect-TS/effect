import { provideAll } from "../Effect"
import { accessM } from "../Effect/accessM"
import { Sync, Effect } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"

import { PRNG } from "./Alea"

export const RandomURI = "@matechs/core/Eff/RandomURI"

export interface Random {
  [RandomURI]: {
    next: Sync<number>
    nextBoolean: Sync<boolean>
    nextIntBetween(low: number, high: number): Sync<number>
    nextInt: Sync<number>
    nextDouble: Sync<number>
    nextRange(low: number, high: number): Sync<number>
    setSeed: (seed: string) => Sync<void>
    withSeed: (
      seed: string
    ) => <S, R, E, A>(_: Effect<S, R, E, A>) => Effect<S, R, E, A>
  }
}

export const randomLive = (seed = String(Math.random())): Random => {
  let prng = new PRNG(seed)

  return {
    [RandomURI]: {
      next: effectTotal(() => prng.next()),
      nextBoolean: effectTotal(() => prng.next() > 0.5),
      nextIntBetween: (high, low) =>
        effectTotal(() => Math.floor((high - low + 1) * prng.next() + low)),
      nextInt: effectTotal(() => prng.int32()),
      nextDouble: effectTotal(() => prng.double()),
      nextRange: (high, low) => effectTotal(() => (high - low) * prng.next() + low),
      setSeed: (seed) =>
        effectTotal(() => {
          prng = new PRNG(seed)
        }),
      withSeed: (seed: string) => <S, R, E, A>(effect: Effect<S, R, E, A>) =>
        accessM((r: R) =>
          provideAll({
            ...r,
            ...randomLive(seed)
          })(effect)
        )
    }
  }
}

export const defaultRandom =
  /*#__PURE__*/
  randomLive()

export const next =
  /*#__PURE__*/
  accessM((_: Random) => _[RandomURI].next)

export const nextBoolean =
  /*#__PURE__*/
  accessM((_: Random) => _[RandomURI].nextBoolean)

export const nextIntBetween = (low: number, high: number) =>
  accessM((_: Random) => _[RandomURI].nextIntBetween(low, high))

export const nextInt =
  /*#__PURE__*/
  accessM((_: Random) => _[RandomURI].nextInt)

export const nextDouble =
  /*#__PURE__*/
  accessM((_: Random) => _[RandomURI].nextDouble)

export const nextRange = (low: number, high: number) =>
  accessM((_: Random) => _[RandomURI].nextRange(low, high))

export const setSeed = (seed: string) =>
  accessM((_: Random) => _[RandomURI].setSeed(seed))

export const withSeed = (seed: string) => <S, R, E, A>(effect: Effect<S, R, E, A>) =>
  accessM((_: Random) => _[RandomURI].withSeed(seed)(effect))
