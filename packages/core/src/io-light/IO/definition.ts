import type { Lazy } from "../../data/Function"
import type * as UT from "../../data/Utils/types"
import { _A, _U } from "../../support/Symbols"

export const IoURI = Symbol.for("@effect-ts/core/io-light/IO")
export type IoURI = typeof IoURI

/**
 * `IO<A>` is a purely functional description of a computation.
 *
 * Note: while for general cases the `Sync` data type is preferrable,
 * this data type is designed for speed and low allocations,
 * it is internally used to suspend recursive procedures but can be
 * useful whenever you need a fast sync computation that cannot fail
 * and that doesn't require any environment.
 *
 * @tsplus type ets/IO
 */
export type IO<A> = Succeed<A> | FlatMap<any, A> | Suspend<A>

/**
 * @tsplus type ets/IOOps
 */
export interface IOOps {}
export const IO: IOOps = {}

/**
 * @tsplus unify ets/IO
 */
export function unify<X extends IO<any>>(self: X): IO<UT._A<X>> {
  return self
}

abstract class Base<A> {
  readonly [_U]!: IoURI;
  readonly [_A]!: () => A
}

export class Succeed<A> extends Base<A> {
  readonly _tag = "Succeed"

  constructor(readonly a: Lazy<A>) {
    super()
  }
}

export class Suspend<A> extends Base<A> {
  readonly _tag = "Suspend"

  constructor(readonly f: Lazy<IO<A>>) {
    super()
  }
}

export class FlatMap<A, B> extends Base<A> {
  readonly _tag = "FlatMap"

  constructor(readonly value: IO<A>, readonly cont: (a: A) => IO<B>) {
    super()
  }
}
