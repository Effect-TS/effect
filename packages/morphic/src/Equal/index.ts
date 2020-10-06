import type { Equal } from "@effect-ts/core/Classic/Equal"

import type { M, Summoner } from "../Batteries/summoner"
import { summonFor } from "../Batteries/summoner"
import type { Materialized } from "../Batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../Batteries/usage/summoner"
import type { EqURI } from "./hkt"
import { modelEqInterpreter } from "./interpreter"

export const deriveFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in EqURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelEqInterpreter<SummonerEnv<S>>())(_).eq

const encoders = new Map<any, any>()

export const equal = <E, A>(F: M<{}, E, A>): Equal<A> => {
  if (encoders.has(F)) {
    return encoders.get(F)
  }
  const d = deriveFor(summonFor({}).make)({})(F)
  encoders.set(F, d)
  return d
}
