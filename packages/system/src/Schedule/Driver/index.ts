import * as O from "../../Option"
import * as T from "../effect"

export class NoSuchElementException extends Error {
  constructor() {
    super("NoSuchElementException")
  }
}

export class Driver<S, Env, Inp, Out> {
  constructor(
    readonly next: (inp: Inp) => T.Effect<S, Env, O.Option<never>, Out>,
    readonly last: T.SyncE<NoSuchElementException, Out>,
    readonly reset: T.Sync<void>
  ) {}
}
