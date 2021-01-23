import type { NoSuchElementException } from "../../GlobalExceptions"
import type * as O from "../../Option"
import type * as T from "../effect"

export class Driver<Env, Inp, Out> {
  constructor(
    readonly next: (inp: Inp) => T.Effect<Env, O.Option<never>, Out>,
    readonly last: T.IO<NoSuchElementException, Out>,
    readonly reset: T.UIO<void>
  ) {}
}
