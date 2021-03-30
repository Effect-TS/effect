// tracing: off

import type * as E from "../Either"
import type { ImmutableQueue } from "../Support/ImmutableQueue"
import * as T from "./effect"
import type * as P from "./promise"

export type Entry = [P.Promise<never, void>, number]
export type State = E.Either<ImmutableQueue<Entry>, number>

export const assertNonNegative = (n: number) =>
  n < 0
    ? T.die(`Unexpected negative value ${n} passed to acquireN or releaseN.`)
    : T.unit

export class Acquisition {
  constructor(readonly waitAcquire: T.UIO<void>, readonly release: T.UIO<void>) {}
}
