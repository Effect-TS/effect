import { accessM } from "../Effect/accessM"
import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { provideAll_ } from "../Effect/provideAll_"

import { PRNG } from "./Alea"

export const RandomURI = "@matechs/core/Eff/RandomURI"

export interface Random {
  [RandomURI]: {
    prng: PRNG
  }
}

export const randomLive = (seed = String(Math.random())): Random => {
  return {
    [RandomURI]: {
      prng: new PRNG(seed)
    }
  }
}

export const defaultRandom =
  /*#__PURE__*/
  randomLive()

export const next =
  /*#__PURE__*/
  accessM((_: Random) => effectTotal(() => _[RandomURI].prng.next()))

export const nextBoolean =
  /*#__PURE__*/
  chain_(next, (n) => effectTotal(() => n > 0.5))

export const nextIntBetween = (low: number, high: number) =>
  chain_(next, (n) => effectTotal(() => Math.floor((high - low + 1) * n + low)))

export const nextInt =
  /*#__PURE__*/
  accessM((_: Random) => effectTotal(() => _[RandomURI].prng.int32()))

export const nextDouble =
  /*#__PURE__*/
  accessM((_: Random) => effectTotal(() => _[RandomURI].prng.double()))

export const nextRange = (low: number, high: number) =>
  chain_(next, (n) => effectTotal(() => (high - low) * n + low))

export const setSeed = (seed: string) =>
  accessM((_: Random) =>
    effectTotal(() => {
      _[RandomURI].prng.setSeed(seed)
    })
  )

export const withSeed = (seed: string) => <S, R, E, A>(
  effect: Effect<S, R & Random, E, A>
) =>
  accessM((r: R) =>
    provideAll_(effect, {
      ...r,
      ...randomLive(seed)
    })
  )
