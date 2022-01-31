// ets_tracing: off

import * as T from "../Effect/index.js"
import * as Ex from "../Exit/index.js"
import type * as M from "../Managed/index.js"

export class Attempted<E, A> {
  readonly [T._E]: () => E;
  readonly [T._A]: () => A

  constructor(readonly result: Ex.Exit<E, A>, readonly finalizer: T.UIO<void>) {}
}

export function isFailure<E, A>(self: Attempted<E, A>): boolean {
  return self.result._tag === "Failure"
}

export function forEachUnit_<R, E, E1, A, Z>(
  self: Attempted<E, A>,
  f: (a: A) => T.Effect<R, E1, Z>
): T.Effect<R, E1, void> {
  return Ex.foldM_(
    self.result,
    (_) => T.unit,
    (a) => f(a)
  )
}

export function forEachUnit<R, E1, A, Z>(f: (a: A) => T.Effect<R, E1, Z>) {
  return <E>(self: Attempted<E, A>) => forEachUnit_(self, f)
}

export function toManaged<E, A>(self: Attempted<E, A>): M.IO<E, A> {
  return T.toManaged(T.done(self.result))
}
