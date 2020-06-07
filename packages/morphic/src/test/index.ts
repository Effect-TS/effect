export {} from "../fc/interpreter/configs"

import { Summoner, summonFor } from "../batteries/summoner"
import type { Materialized } from "../batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../batteries/usage/summoner"
import { FastCheckURI, modelFcInterpreter } from "../fc"

export const arbFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in FastCheckURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelFcInterpreter<SummonerEnv<S>>())(_).arb

export const deriveArb =
  /*#__PURE__*/
  (() => arbFor(summonFor({}).make)({}))()
