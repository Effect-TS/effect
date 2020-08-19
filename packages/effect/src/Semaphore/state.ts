import * as E from "../Either"

import * as T from "./deps"

export type Entry = [T.Promise<never, void>, number]
export type State = E.Either<T.ImmutableQueue<Entry>, number>

export const assertNonNegative = (n: number) =>
  n < 0
    ? T.die(`Unexpected negative value ${n} passed to acquireN or releaseN.`)
    : T.unit

export class Acquisition {
  constructor(readonly waitAcquire: T.Async<void>, readonly release: T.Async<void>) {}
}
