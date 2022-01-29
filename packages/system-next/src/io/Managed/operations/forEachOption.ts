import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Applies the function `f` if the argument is non-empty and returns the
 * results in a new `Option<A2>`.
 *
 * @ets static ets/ManagedOps forEachOption
 */
export function forEachOption_<R, E, A, A2>(
  option: LazyArg<Option<A>>,
  f: (a: A) => Managed<R, E, A2>,
  __etsTrace?: string
): Managed<R, E, Option<A2>> {
  return Managed.suspend(
    option().fold(
      () => Managed.succeedNow(Option.none),
      (a) => f(a).map(Option.some)
    )
  )
}

/**
 * Applies the function `f` if the argument is non-empty and returns the
 * results in a new `Option<A2>`.
 *
 * @ets_data_first forEachOption_
 */
export function forEachOption<R, E, A, A2>(
  f: (a: A) => Managed<R, E, A2>,
  __etsTrace?: string
) {
  return (option: Option<A>): Managed<R, E, Option<A2>> => forEachOption_(option, f)
}
