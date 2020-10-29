import { flow } from "@effect-ts/core/Function"
import { mapError } from "@effect-ts/core/Sync"

import type { M, Summoner } from "../Batteries/summoner"
import { summonFor } from "../Batteries/summoner"
import type { Materialized } from "../Batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../Batteries/usage/summoner"
import type { Decoder } from "./common"
import { report } from "./common"
import type { DecoderURI } from "./hkt"
import { modelDecoderInterpreter } from "./interpreter"

export type {
  Decoder,
  ContextEntry,
  DecodeError,
  DecodingError,
  Validate,
  ValidationError,
  report,
  fail
} from "./common"

export function deriveFor<S extends Summoner<any>>(S: S) {
  return (
    _: {
      [k in DecoderURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k]
    }
  ) => <L, A>(
    F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
  ) => F.derive(modelDecoderInterpreter<SummonerEnv<S>>())(_).decoder
}

const decoders = new Map<any, any>()
const defDerive = deriveFor(summonFor({}).make)({})

export function decoder<E, A>(F: M<{}, E, A>): Decoder<A> {
  if (decoders.has(F)) {
    return decoders.get(F)
  }
  const d: Decoder<A> = {
    decode: (u) => defDerive(F).validate(u, { actual: u, key: "", types: [] })
  }
  decoders.set(F, d)
  return d
}

export function decodeReport<E, A>(F: M<{}, E, A>) {
  return flow(decoder(F).decode, mapError(report))
}
