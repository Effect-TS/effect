import type { Arbitrary } from "fast-check"
import * as fc from "fast-check"

import type { M, Summoner } from "../Batteries/summoner"
import { summonFor } from "../Batteries/summoner"
import type { Materialized } from "../Batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../Batteries/usage/summoner"
import { FastCheckURI } from "./hkt"
import { modelFcInterpreter } from "./interpreter"

export const deriveFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in FastCheckURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelFcInterpreter<SummonerEnv<S>>())(_).arb

const arbitraries = new Map<any, any>()
const defDerive = deriveFor(summonFor({}).make)({
  [FastCheckURI]: {
    module: fc
  }
})

export const arbitrary = <E, A>(F: M<{}, E, A>): Arbitrary<A> => {
  if (arbitraries.has(F)) {
    return arbitraries.get(F)
  }
  const d = defDerive(F)
  arbitraries.set(F, d)
  return d
}
