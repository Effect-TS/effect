import { Stackless } from "@effect/core/io/Cause/definition"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Remove all `Die` causes that the specified partial function is defined at,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 *
 * @tsplus static effect/core/io/Cause.Aspects stripSomeDefects
 * @tsplus pipeable effect/core/io/Cause stripSomeDefects
 * @category mutations
 * @since 1.0.0
 */
export function stripSomeDefects(pf: (defect: unknown) => unknown) {
  return <E>(cause: Cause<E>): Option.Option<Cause<E>> =>
    cause.fold<E, Option.Option<Cause<E>>>(
      Option.some(Cause.empty),
      (e) => Option.some(Cause.fail(e)),
      (t) => pf(t) ? Option.none : Option.some(Cause.die(t)),
      (fiberId) => Option.some(Cause.interrupt(fiberId)),
      (x, y) => {
        if (Option.isSome(x) && Option.isSome(y)) {
          return Option.some(Cause.then(x.value, y.value))
        }
        if (Option.isSome(x) && Option.isNone(y)) {
          return Option.some(x.value)
        }
        if (Option.isNone(x) && Option.isSome(y)) {
          return Option.some(y.value)
        }
        return Option.none
      },
      (x, y) => {
        if (Option.isSome(x) && Option.isSome(y)) {
          return Option.some(Cause.both(x.value, y.value))
        }
        if (Option.isSome(x) && Option.isNone(y)) {
          return Option.some(x.value)
        }
        if (Option.isNone(x) && Option.isSome(y)) {
          return Option.some(y.value)
        }
        return Option.none
      },
      (causeOption, stackless) =>
        pipe(
          causeOption,
          Option.map((cause) => new Stackless(cause, stackless))
        )
    )
}
