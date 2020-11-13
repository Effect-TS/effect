import type { M, Summoner } from "../Batteries/summoner"
import { summonFor } from "../Batteries/summoner"
import type { Materialized } from "../Batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "../Batteries/usage/summoner"
import type { Reorder, ReorderURI } from "./base"
import { modelReorderInterpreter } from "./interpreter"

export function deriveFor<S extends Summoner<any>>(S: S) {
  return (
    _: {
      [k in ReorderURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k]
    }
  ) => <L, A>(
    F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
  ) => F.derive(modelReorderInterpreter<SummonerEnv<S>>())(_).reorder
}

const reorders = new Map<any, any>()
const defDerive = deriveFor(summonFor({}).make)({})

export function reorder<E, A>(F: M<{}, E, A>): Reorder<A> {
  if (reorders.has(F)) {
    return reorders.get(F)
  }
  const d = defDerive(F)
  reorders.set(F, d)
  return d
}
