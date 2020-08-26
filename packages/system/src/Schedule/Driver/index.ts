import type { NoSuchElementException } from "../../GlobalExceptions"
import type * as O from "../../Option"
import type * as T from "../effect"

export class Driver<S, Env, Inp, Out> {
  constructor(
    readonly next: (inp: Inp) => T.Effect<S, Env, O.Option<never>, Out>,
    readonly last: T.SyncE<NoSuchElementException, Out>,
    readonly reset: T.Sync<void>
  ) {}
}
