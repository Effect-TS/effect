import { concreteTDeferred } from "@effect/core/stm/TDeferred/operations/_internal/InternalTDeferred"

/**
 * @tsplus getter effect/core/stm/TDeferred await
 */
export function await_<E, A>(self: TDeferred<E, A>): STM<never, E, A> {
  concreteTDeferred(self)
  return self.ref.get.collect((_) => _.map((e) => STM.fromEither(e))).flatten
}

export { await_ as await }
