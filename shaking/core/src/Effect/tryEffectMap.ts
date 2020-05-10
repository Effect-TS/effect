import type { Lazy } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { flatten } from "./chain"
import { trySyncMap } from "./trySyncMap"

export function tryEffectMap<E>(
  onError: (e: unknown) => E
): <S, R, E2, A>(thunk: Lazy<Effect<S, R, E2, A>>) => Effect<S, R, E | E2, A> {
  return (thunk) => flatten(trySyncMap(onError)(thunk))
}
