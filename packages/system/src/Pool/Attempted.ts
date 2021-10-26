// ets_tracing: off

import * as T from "../Effect"
import * as Ex from "../Exit"
import type * as M from "../Managed"

export class Attempted<E, A> {
  readonly [T._E]: () => E;
  readonly [T._A]: () => A

  constructor(readonly result: Ex.Exit<E, A>, readonly finalizer: T.UIO<void>) {}
}

export function isFailure<E, A>(self: Attempted<E, A>): boolean {
  return self.result._tag === "Failure"
}

export function forEach_<R, E, E1, A>(
  self: Attempted<E, A>,
  f: (a: A) => T.Effect<R, E1, void>
): T.Effect<R, E1, void> {
  return Ex.foldM_(
    self.result,
    (_) => T.unit,
    (a) => f(a)
  )
}

export function forEach<R, E1, A>(f: (a: A) => T.Effect<R, E1, void>) {
  return <E>(self: Attempted<E, A>) => forEach_(self, f)
}

export function toManaged<E, A>(self: Attempted<E, A>): M.IO<E, A> {
  return T.toManaged(T.done(self.result))
}
