import { Summoner, summonFor, M } from "../batteries/summoner"
import type { Materialized } from "../batteries/usage/materializer"
import {
  SummonerEnv,
  SummonerProgURI,
  SummonerInterpURI
} from "../batteries/usage/summoner"

import type { GuardURI } from "./hkt"
import { modelGuardInterpreter } from "./interpreter"

export const deriveFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in GuardURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelGuardInterpreter<SummonerEnv<S>>())(_).guard

export const derive = <E, A>(F: M<{}, E, A>) => deriveFor(summonFor({}).make)({})(F)
