import * as fc from "fast-check"

import { Summoner, summonFor, M } from "../batteries/summoner"
import { Materialized } from "../batteries/usage/materializer"
import {
  SummonerEnv,
  SummonerProgURI,
  SummonerInterpURI
} from "../batteries/usage/summoner"

import { FastCheckURI } from "./hkt"
import { modelFcInterpreter } from "./interpreter"

export const deriveFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in FastCheckURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelFcInterpreter<SummonerEnv<S>>())(_).arb

export const derive = <E, A>(F: M<{}, E, A>) =>
  deriveFor(summonFor({}).make)({
    [FastCheckURI]: {
      module: fc
    }
  })(F)
