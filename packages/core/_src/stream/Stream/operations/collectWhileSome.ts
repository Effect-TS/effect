/**
 * Terminates the stream when encountering the first `None`.
 *
 * @tsplus getter effect/core/stream/Stream collectWhileSome
 */
export function collectWhileSome<R, E, L, A>(
  self: Stream<R, E, Maybe<A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.collectWhile((option) => option.isSome() ? Maybe.some(option.value) : Maybe.none)
}
