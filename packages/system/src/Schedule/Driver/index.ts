// ets_tracing: off

import type { NoSuchElementException } from "../../GlobalExceptions/index.js"
import type * as O from "../../Option/index.js"
import type * as T from "../effect.js"

export class Driver<Env, Inp, Out> {
  constructor(
    readonly next: (inp: Inp) => T.Effect<Env, O.Option<never>, Out>,
    readonly last: T.IO<NoSuchElementException, Out>,
    readonly reset: T.UIO<void>
  ) {}
}
