import type { M, Summoner } from "../Batteries/summoner"
import { summonFor } from "../Batteries/summoner"
import type { Materialized } from "../Batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../Batteries/usage/summoner"
import type { DecodeError, Decoder, DecoderURI } from "./hkt"
import { modelDecoderInterpreter } from "./interpreter"

export const deriveFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in DecoderURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelDecoderInterpreter<SummonerEnv<S>>())(_).decoder

const decoders = new Map<any, any>()
const defDerive = deriveFor(summonFor({}).make)({})

export const decoder = <E, A>(F: M<{}, E, A>): Decoder<A> => {
  if (decoders.has(F)) {
    return decoders.get(F)
  }
  const d = defDerive(F)
  decoders.set(F, d)
  return d
}

export const report = (e: DecodeError) =>
  e.errors
    .map((e) => e.message)
    .filter((e) => e && e.length > 0)
    .join(",")
