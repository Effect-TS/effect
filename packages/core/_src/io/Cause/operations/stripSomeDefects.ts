import { Annotated } from "@effect/core/io/Cause/definition"

/**
 * Remove all `Die` causes that the specified partial function is defined at,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 *
 * @tsplus static effect/core/io/Cause.Aspects stripSomeDefects
 * @tsplus pipeable effect/core/io/Cause stripSomeDefects
 */
export function stripSomeDefects(pf: (defect: unknown) => unknown) {
  return <E>(cause: Cause<E>): Maybe<Cause<E>> =>
    cause.fold<E, Maybe<Cause<E>>>(
      Maybe.some(Cause.empty),
      (e) => Maybe.some(Cause.fail(e)),
      (t) => pf(t) ? Maybe.none : Maybe.some(Cause.die(t)),
      (fiberId) => Maybe.some(Cause.interrupt(fiberId)),
      (x, y) => {
        if (x.isSome() && y.isSome()) {
          return Maybe.some(Cause.then(x.value, y.value))
        }
        if (x.isSome() && y.isNone()) {
          return Maybe.some(x.value)
        }
        if (x.isNone() && y.isSome()) {
          return Maybe.some(y.value)
        }
        return Maybe.none
      },
      (x, y) => {
        if (x.isSome() && y.isSome()) {
          return Maybe.some(Cause.both(x.value, y.value))
        }
        if (x.isSome() && y.isNone()) {
          return Maybe.some(x.value)
        }
        if (x.isNone() && y.isSome()) {
          return Maybe.some(y.value)
        }
        return Maybe.none
      },
      (causeOption, annotation) => causeOption.map((cause) => new Annotated(cause, annotation))
    )
}
