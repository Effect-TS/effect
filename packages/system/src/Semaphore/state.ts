// ets_tracing: off

import type * as Tp from "../Collections/Immutable/Tuple/index.js"
import type * as E from "../Either/index.js"
import type { ImmutableQueue } from "../Support/ImmutableQueue/index.js"
import * as T from "./effect.js"
import type * as P from "./promise.js"

export type Entry = Tp.Tuple<[P.Promise<never, void>, number]>
export type State = E.Either<ImmutableQueue<Entry>, number>

export const assertNonNegative = (n: number) =>
  n < 0
    ? T.die(`Unexpected negative value ${n} passed to acquireN or releaseN.`)
    : T.unit

export class Acquisition {
  constructor(readonly waitAcquire: T.UIO<void>, readonly release: T.UIO<void>) {}
}
