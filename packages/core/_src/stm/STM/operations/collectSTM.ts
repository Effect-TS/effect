/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from pf.
 *
 * @tsplus fluent ets/STM collectSTM
 */
export function collectSTM<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  pf: (a: A) => STM<R1, E1, Option<B>>
): STM<R | R1, E | E1, B> {
  return self.foldSTM((_) => STM.fail(_), (a: A) => pf(a).flatMap((_) => _.isSome() ? STM.succeed(_.value) : STM.retry))
}
