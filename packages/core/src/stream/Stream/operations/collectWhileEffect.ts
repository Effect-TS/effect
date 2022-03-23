import type { Chunk } from "../../../collection/immutable/Chunk"
import { constFalse, constTrue } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { UIO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"
import { loopOnPartialChunks } from "./_internal/loopOnPartialChunks"

/**
 * Effectfully transforms all elements of the stream for as long as the
 * specified partial function is defined.
 *
 * @tsplus fluent ets/Stream collectWhileEffect
 */
export function collectWhileEffect_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  pf: (a: A) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  return loopOnPartialChunks(self, loop(pf))
}

/**
 * Effectfully transforms all elements of the stream for as long as the
 * specified partial function is defined.
 */
export const collectWhileEffect = Pipeable(collectWhileEffect_)

function loop<R, E, A, A2>(
  pf: (a: A) => Option<Effect<R, E, A2>>,
  __tsplusTrace?: string
) {
  return (chunk: Chunk<A>, emit: (a: A2) => UIO<void>): Effect<R, E, boolean> =>
    chunk.isEmpty() ? Effect.succeed(constTrue) : pfSome(chunk.unsafeHead(), pf, emit)
}

function pfSome<R, E, A, A2>(
  a: A,
  pf: (a: A) => Option<Effect<R, E, A2>>,
  emit: (a: A2) => UIO<void>,
  __tsplusTrace?: string
) {
  return pf(a).fold(Effect.succeed(constFalse), (effect) =>
    effect.flatMap(emit).as(constTrue)
  )
}
