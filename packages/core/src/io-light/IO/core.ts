/* eslint-disable prefer-const */

import { Tuple } from "../../collection/immutable/Tuple"
import type { Lazy, LazyArg } from "../../data/Function"
import { Stack } from "../../data/Stack"
import type * as UT from "../../data/Utils/types"
import { _A, _U } from "../../support/Symbols"

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

export const IoURI = Symbol.for("@effect-ts/core/io-light/IO")
export type IoURI = typeof IoURI

abstract class Base<A> {
  readonly [_U]!: "IO";
  readonly [_A]!: () => A
}

class Succeed<A> extends Base<A> {
  readonly _iotag = "Succeed"

  constructor(readonly a: A) {
    super()
  }
}

class Suspend<A> extends Base<A> {
  readonly _iotag = "Suspend"

  constructor(readonly f: Lazy<IO<A>>) {
    super()
  }
}

class FlatMap<A, B> extends Base<A> {
  readonly _iotag = "FlatMap"

  constructor(readonly value: IO<A>, readonly cont: (a: A) => IO<B>) {
    super()
  }
}

/**
 * Runs this computation.
 *
 * @tsplus fluent ets/IO run
 */
export function run<A>(self: IO<A>): A {
  let stack: Stack<(e: any) => IO<any>> | undefined = undefined
  let a = undefined
  let curIO = self as IO<any> | undefined

  while (curIO != null) {
    switch (curIO._iotag) {
      case "FlatMap": {
        switch (curIO.value._iotag) {
          case "Succeed": {
            curIO = curIO.cont(curIO.value.a)
            break
          }
          default: {
            stack = new Stack(curIO.cont, stack)
            curIO = curIO.value
          }
        }

        break
      }
      case "Suspend": {
        curIO = curIO.f()
        break
      }
      case "Succeed": {
        a = curIO.a
        if (stack) {
          curIO = stack.value(a)
          stack = stack.previous
        } else {
          curIO = undefined
        }
        break
      }
    }
  }

  return a
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/IO flatMap
 */
export function chain_<A, B>(self: IO<A>, f: (a: A) => IO<B>): IO<B> {
  return new FlatMap(self, f)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => IO<B>) {
  return (self: IO<A>): IO<B> => new FlatMap(self, f)
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 *
 * @tsplus fluent ets/IO tap
 */
export function tap_<A>(self: IO<A>, f: (a: A) => IO<any>): IO<A> {
  return self.flatMap((a) => f(a).map(() => a))
}

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 *
 * @ets_data_first tap_
 */
export function tap<A>(f: (a: A) => IO<any>) {
  return (self: IO<A>): IO<A> => tap_(self, f)
}

/**
 * Constructs a computation that always succeeds with the specified value.
 *
 * @tsplus static ets/IOOps succeedNow
 */
export function succeedNow<A>(a: A): IO<A> {
  return new Succeed(a)
}

/**
 * Lift a sync (non failable) computation.
 *
 * @tsplus static ets/IOOps succeed
 */
export function succeed<A>(f: LazyArg<A>) {
  return IO.suspend(succeedNow(f()))
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @tsplus fluent ets/IO map
 */
export function map_<A, B>(self: IO<A>, f: (a: A) => B) {
  return self.flatMap((a) => IO.succeedNow(f(a)))
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: IO<A>) => map_(self, f)
}

/**
 * Constructs a computation that always returns the `Unit` value.
 */
export const unit: IO<void> = new Succeed(undefined)

/**
 * Combines this computation with the specified computation combining the
 * results of both using the specified function.
 *
 * @tsplus fluent ets/IO zipWith
 */
export function zipWith_<A, B, C>(self: IO<A>, that: IO<B>, f: (a: A, b: B) => C) {
  return self.flatMap((a) => that.map((b) => f(a, b)))
}

/**
 * Combines this computation with the specified computation combining the
 * results of both using the specified function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<A, B, C>(that: IO<B>, f: (a: A, b: B) => C) {
  return (self: IO<A>): IO<C> => zipWith_(self, that, f)
}

/**
 * Combines this computation with the specified computation combining the
 * results of both into a tuple.
 *
 * @tsplus fluent ets/IO zip
 */
export function zip_<A, B>(self: IO<A>, that: IO<B>) {
  return self.zipWith(that, (a, b) => Tuple(a, b))
}

/**
 * Combines this computation with the specified computation, combining the
 * results of both into a tuple.
 *
 * @ets_data_first zip_
 */
export function zip<B>(that: IO<B>) {
  return <A>(self: IO<A>) => zip_(self, that)
}

/**
 * Suspend a computation, useful in recursion.
 *
 * @tsplus static ets/IOOps suspend
 */
export function suspend<A>(f: LazyArg<IO<A>>): IO<A> {
  return new Suspend(f)
}

export class GenIO<A> {
  readonly _A!: () => A

  constructor(readonly effect: IO<A>) {}

  *[Symbol.iterator](): Generator<GenIO<A>, A, any> {
    return yield this
  }
}

function adapter<A>(_: IO<A>): GenIO<A> {
  return new GenIO(_)
}

function run_<Eff extends GenIO<any>, AEff>(
  state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>,
  iterator: Generator<Eff, AEff, any>
): IO<AEff> {
  if (state.done) {
    return succeed(state.value)
  }
  return chain_(state.value["effect"], (val) => {
    const next = iterator.next(val)
    return run_(next, iterator)
  })
}

/**
 * Generator
 *
 * @tsplus static ets/IOOps gen
 */
export function gen<Eff extends GenIO<any>, AEff>(
  f: (i: { <A>(_: IO<A>): GenIO<A> }) => Generator<Eff, AEff, any>
): IO<AEff> {
  return IO.suspend(() => {
    const iterator = f(adapter)
    const state = iterator.next()

    return run_(state, iterator)
  })
}
