import * as A from "../../Array"
import * as E from "../../Either"
import * as O from "../../Option"
import * as T from "../_internal/effect"

export type Push<S, R, E, I, L, Z> = (
  _: O.Option<A.Array<I>>
) => T.Effect<S, R, readonly [E.Either<E, Z>, A.Array<L>], void>

export const emit = <I, Z>(
  z: Z,
  leftover: A.Array<I>
): T.SyncE<[E.Either<never, Z>, A.Array<I>], never> => T.fail([E.right(z), leftover])

export const more = T.unit

export const fail = <E, I>(
  e: E,
  leftover: A.Array<I>
): T.SyncE<[E.Either<E, never>, A.Array<I>], never> => T.fail([E.left(e), leftover])
