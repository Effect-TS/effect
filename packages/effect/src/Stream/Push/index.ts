import * as T from "../_internal/effect"
import * as A from "../../Array"
import type { Cause } from "../../Cause"
import * as E from "../../Either"
import type * as O from "../../Option"

export type Push<R, E, I, L, Z> = (
  _: O.Option<A.Array<I>>
) => T.Effect<R, readonly [E.Either<E, Z>, A.Array<L>], void>

export const emit = <I, Z>(
  z: Z,
  leftover: A.Array<I>
): T.IO<[E.Either<never, Z>, A.Array<I>], never> => T.fail([E.right(z), leftover])

export const more = T.unit

export const fail = <E, I>(
  e: E,
  leftover: A.Array<I>
): T.IO<[E.Either<E, never>, A.Array<I>], never> => T.fail([E.left(e), leftover])

export const halt = <E>(
  c: Cause<E>
): T.IO<[E.Either<E, never>, A.Array<never>], never> =>
  T.mapError_(T.halt(c), (e) => [E.left(e), A.empty])
