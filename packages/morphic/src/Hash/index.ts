import type { M, Summoner } from "../Batteries/summoner"
import { summonFor } from "../Batteries/summoner"
import type { Materialized } from "../Batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../Batteries/usage/summoner"
import type { Hash, HashURI } from "./base"
import { modelHashInterpreter } from "./interpreter"

export function deriveFor<S extends Summoner<any>>(S: S) {
  return (
    _: {
      [k in HashURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k]
    }
  ) => <L, A>(
    F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
  ) => F.derive(modelHashInterpreter<SummonerEnv<S>>())(_).hash
}

const hashes = new Map<any, any>()
const defDerive = deriveFor(summonFor({}).make)({})

export function hash<E, A>(F: M<{}, E, A>): Hash {
  if (hashes.has(F)) {
    return hashes.get(F)
  }
  const d = defDerive(F)
  hashes.set(F, d)
  return d
}
