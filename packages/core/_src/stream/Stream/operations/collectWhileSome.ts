/**
 * Terminates the stream when encountering the first `None`.
 *
 * @tsplus fluent ets/Stream collectWhileSome
 */
export function collectWhileSome<R, E, L, A>(
  self: Stream<R, E, Option<A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.collectWhile((option) => option.isSome() ? Option.some(option.value) : Option.none)
}
