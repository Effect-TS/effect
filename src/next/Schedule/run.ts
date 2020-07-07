import * as A from "../../Array"
import * as NA from "../../NonEmptyArray"
import { chain_ } from "../Effect/chain_"
import { Effect } from "../Effect/effect"
import { foldM_ } from "../Effect/foldM_"
import { map_ } from "../Effect/map_"
import { succeedNow } from "../Effect/succeedNow"

import { Schedule } from "./schedule"

/**
 * Run a schedule using the provided input and collect all outputs.
 */
export const run_ = <S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  input: Iterable<A>
): Effect<S, R, never, readonly B[]> => {
  const loop = (
    xs: readonly A[],
    state: ST,
    acc: readonly B[]
  ): Effect<S, R, never, readonly B[]> => {
    if (A.isNonEmpty(xs)) {
      const [x, t] = [NA.head(xs), NA.tail(xs)]
      return foldM_(
        self.update(x, state),
        () => succeedNow([self.extract(x, state), ...acc]),
        (s) => loop(t, s, [self.extract(x, state), ...acc])
      )
    } else {
      return succeedNow(acc)
    }
  }

  return map_(
    chain_(self.initial, (_) => loop(Array.from(input), _, [])),
    A.reverse
  )
}

/**
 * Run a schedule using the provided input and collect all outputs.
 */
export const run = <A>(input: Iterable<A>) => <S, R, ST, B>(
  self: Schedule<S, R, ST, A, B>
): Effect<S, R, never, readonly B[]> => run_(self, input)
