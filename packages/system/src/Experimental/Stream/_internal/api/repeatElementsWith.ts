// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as O from "../../../../Option/index.js"
import * as SC from "../../../../Schedule/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * This function accepts two conversion functions, which allow the output of this stream and the
 * output of the provided schedule to be unified into a single type. For example, `Either` or
 * similar data type.
 */
export function repeatElementsWith_<R, R1, E, A, B, C1, C2>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
): C.Stream<R & R1 & CL.HasClock, E, C1 | C2> {
  return new C.Stream(
    self.channel[">>>"](
      CH.unwrap(
        pipe(
          T.do,
          T.bind("driver", () => SC.driver(schedule)),
          T.map(({ driver }) => {
            const feed = (
              in_: CK.Chunk<A>
            ): CH.Channel<
              R1 & CL.HasClock,
              E,
              CK.Chunk<A>,
              unknown,
              E,
              CK.Chunk<C1 | C2>,
              void
            > =>
              O.fold_(
                CK.head(in_),
                () => loop(),
                (a) =>
                  CH.zipRight_(CH.write(CK.single(f(a))), step(CK.drop_(in_, 1), a))
              )

            const step = (
              in_: CK.Chunk<A>,
              a: A
            ): CH.Channel<
              R1 & CL.HasClock,
              E,
              CK.Chunk<A>,
              unknown,
              E,
              CK.Chunk<C1 | C2>,
              void
            > => {
              const advance = T.as_(
                driver.next(a),
                CH.zipRight_(CH.write(CK.single(f(a))), step(in_, a))
              )
              const reset: T.Effect<
                R1 & CL.HasClock,
                never,
                CH.Channel<
                  R1 & CL.HasClock,
                  E,
                  CK.Chunk<A>,
                  unknown,
                  E,
                  CK.Chunk<C1 | C2>,
                  void
                >
              > = pipe(
                T.do,
                T.bind("b", () => T.orDie(driver.last)),
                T.tap(() => driver.reset),
                T.map(({ b }) => CH.zipRight_(CH.write(CK.single(g(b))), feed(in_)))
              )

              return CH.unwrap(T.orElse_(advance, () => reset))
            }

            const loop = (): CH.Channel<
              R1 & CL.HasClock,
              E,
              CK.Chunk<A>,
              unknown,
              E,
              CK.Chunk<C1 | C2>,
              void
            > =>
              CH.readWith(
                feed,
                (_) => CH.fail(_),
                (_) => CH.unit
              )

            return loop()
          })
        )
      )
    )
  )
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * This function accepts two conversion functions, which allow the output of this stream and the
 * output of the provided schedule to be unified into a single type. For example, `Either` or
 * similar data type.
 *
 * @ets_data_first repeatElementsWith_
 */
export function repeatElementsWith<R1, A, B, C1, C2>(
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
) {
  return <R, E>(self: C.Stream<R, E, A>) => repeatElementsWith_(self, schedule, f, g)
}
