import * as Option from "@fp-ts/data/Option"

/**
 * Simultaneously filters and flatMaps the value produced by this effect.
 * Continues on the effect returned from pf.
 *
 * @tsplus static effect/core/stm/STM.Aspects collectSTM
 * @tsplus pipeable effect/core/stm/STM collectSTM
 * @category constructors
 * @since 1.0.0
 */
export function collectSTM<A, R1, E1, B>(pf: (a: A) => STM<R1, E1, Option.Option<B>>) {
  return <R, E>(self: STM<R, E, A>): STM<R | R1, E | E1, B> =>
    self.foldSTM(
      (_) => STM.fail(_),
      (a: A) =>
        pf(a).flatMap((option) =>
          Option.isSome(option) ?
            STM.succeed(option.value) :
            STM.retry
        )
    )
}
