/**
 * Flattens out a nested `STM` effect.
 *
 * @tsplus static ets/STM/Ops flatten
 * @tsplus fluent ets/STM flatten
 */
export function flatten<R, E, R1, E1, B>(
  self: STM<R, E, STM<R1, E1, B>>
): STM<R1 & R, E | E1, B> {
  return self.flatMap(identity);
}
