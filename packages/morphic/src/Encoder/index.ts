import type { M, Summoner } from "../Batteries/summoner"
import { summonFor } from "../Batteries/summoner"
import type { Materialized } from "../Batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../Batteries/usage/summoner"
import type { Encoder, EncoderURI } from "./hkt"
import { modelEncoderInterpreter } from "./interpreter"

export const deriveFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in EncoderURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelEncoderInterpreter<SummonerEnv<S>>())(_).encoder

const encoders = new Map<any, any>()
const defDerive = deriveFor(summonFor({}).make)({})
export const encoder = <E, A>(F: M<{}, E, A>): Encoder<A, E> => {
  if (encoders.has(F)) {
    return encoders.get(F)
  }
  const d = defDerive(F)
  encoders.set(F, d)
  return d
}
