import type { M, Summoner } from "../Batteries/summoner"
import { summonFor } from "../Batteries/summoner"
import type { Materialized } from "../Batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../Batteries/usage/summoner"
import type { DecodeError, DecoderURI } from "./hkt"
import { modelDecoderInterpreter } from "./interpreter"

export const deriveFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in DecoderURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelDecoderInterpreter<SummonerEnv<S>>())(_).decoder

export const decoder = <E, A>(F: M<{}, E, A>) => deriveFor(summonFor({}).make)({})(F)

export const report = (e: DecodeError) =>
  e.errors
    .map((e) => e.message)
    .filter((e) => e && e.length > 0)
    .join(",")
