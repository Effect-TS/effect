import * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { mapM_ } from "./mapM"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, E1, O2>(
  self: Stream<R, E, O.Option<O2>>,
  f: () => E1
): Stream<R, E | E1, O2> {
  return mapM_(
    self,
    O.fold(
      () => T.fail(f()),
      (_) => T.succeed(_)
    )
  )
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail<E1>(f: () => E1) {
  return <R, E, O2>(self: Stream<R, E, O.Option<O2>>) => someOrFail_(self, f)
}
