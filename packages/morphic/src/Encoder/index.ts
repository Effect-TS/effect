import { flow } from "@effect-ts/core/Function"
import { run } from "@effect-ts/core/Sync"

import type { M, Summoner } from "../Batteries/summoner"
import { summonFor } from "../Batteries/summoner"
import type { Materialized } from "../Batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../Batteries/usage/summoner"
import type { Encoder, EncoderType, EncoderURI } from "./base"
import { modelEncoderInterpreter } from "./interpreter"

export function deriveFor<S extends Summoner<any>>(S: S) {
  return (
    _: {
      [k in EncoderURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k]
    }
  ) => <L, A>(
    F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
  ) => F.derive(modelEncoderInterpreter<SummonerEnv<S>>())(_)
}

const encoders = new Map<any, any>()
const defDerive = deriveFor(summonFor({}).make)({})

export function encoder<E, A>(F: M<{}, E, A>): Encoder<A, E> {
  if (encoders.has(F)) {
    return encoders.get(F).encoder
  }
  const d = defDerive(F)
  encoders.set(F, d)
  return d.encoder
}

export function encoderType<E, A>(F: M<{}, E, A>): EncoderType<A, E> {
  if (encoders.has(F)) {
    return encoders.get(F)
  }
  const d = defDerive(F)
  encoders.set(F, d)
  return d
}

export function encode<E, A>(F: M<{}, E, A>) {
  return encoder(F).encode
}

export function runEncode<E, A>(F: M<{}, E, A>) {
  return flow(encoder(F).encode, run)
}
