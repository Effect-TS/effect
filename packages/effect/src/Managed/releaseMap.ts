import type { ExecutionStrategy, Sequential } from "../Effect/ExecutionStrategy"
import { absurd, pipe } from "../Function"
import { insert, lookup, remove } from "../Map/core"
import * as O from "../Option"
import * as R from "../Ref"
import * as T from "./deps"

export type Finalizer = (
  exit: T.Exit<any, any>
) => T.Effect<unknown, unknown, never, any>

export type FinalizerS<S> = (exit: T.Exit<any, any>) => T.Effect<S, unknown, never, any>

export const noopFinalizer: <S>() => FinalizerS<S> = () => () => T.unit

export class Exited {
  readonly _tag = "Exited"
  constructor(readonly nextKey: number, readonly exit: T.Exit<any, any>) {}
}

export class Running<S> {
  readonly _tag = "Running"
  constructor(
    readonly nextKey: number,
    readonly _finalizers: ReadonlyMap<number, Finalizer>
  ) {}

  finalizers<S1 extends S>(): ReadonlyMap<number, FinalizerS<S1>>
  finalizers(): ReadonlyMap<number, Finalizer> {
    return this._finalizers as any
  }
}

export type State<S> = Exited | Running<S>

export function next(l: number) {
  return l + 1
}

export function add<S>(finalizer: FinalizerS<S>) {
  return (_: ReleaseMap<S>) =>
    T.map_(
      addIfOpen(finalizer)(_),
      O.fold(
        (): FinalizerS<S> => () => T.unit,
        (k): FinalizerS<S> => (e) => release(k, e)(_)
      )
    )
}

export function release(
  key: number,
  exit: T.Exit<any, any>
): <S>(_: ReleaseMap<S>) => T.Effect<S, unknown, never, any>
export function release(key: number, exit: T.Exit<any, any>) {
  return <S>(_: ReleaseMap<S>) =>
    pipe(
      _.ref,
      R.modify((s) => {
        switch (s._tag) {
          case "Exited": {
            return [T.unit, s]
          }
          case "Running": {
            return [
              O.fold_(
                lookup(key)(s.finalizers()),
                () => T.unit,
                (f) => f(exit)
              ),
              new Running(s.nextKey, remove(key)(s.finalizers()))
            ]
          }
        }
      })
    )
}

export function releaseAll(
  exit: T.Exit<any, any>,
  execStrategy: Sequential
): <S>(_: ReleaseMap<S>) => T.Effect<S, unknown, never, any>
export function releaseAll(
  exit: T.Exit<any, any>,
  execStrategy: ExecutionStrategy
): <S>(_: ReleaseMap<S>) => T.Async<any>
export function releaseAll(
  exit: T.Exit<any, any>,
  execStrategy: ExecutionStrategy
): <S>(_: ReleaseMap<S>) => T.Async<any> {
  return <S>(_: ReleaseMap<S>) =>
    pipe(
      _.ref,
      R.modify((s): [T.Async<any>, State<S>] => {
        switch (s._tag) {
          case "Exited": {
            return [T.unit, s]
          }
          case "Running": {
            switch (execStrategy._tag) {
              case "Sequential": {
                return [
                  T.chain_(
                    T.foreach_(Array.from(s.finalizers()).reverse(), ([_, f]) =>
                      T.result(f(exit))
                    ),
                    (e) =>
                      T.done(
                        O.getOrElse_(T.exitCollectAll(...e), () => T.exitSucceed([]))
                      )
                  ),
                  new Exited(s.nextKey, exit)
                ]
              }
              case "Parallel": {
                return [
                  T.chain_(
                    T.foreachPar_(Array.from(s.finalizers()).reverse(), ([_, f]) =>
                      T.result(f(exit))
                    ),
                    (e) =>
                      T.done(
                        O.getOrElse_(T.exitCollectAllPar(...e), () => T.exitSucceed([]))
                      )
                  ),
                  new Exited(s.nextKey, exit)
                ]
              }
              case "ParallelN": {
                return [
                  T.chain_(
                    T.foreachParN_(execStrategy.n)(
                      Array.from(s.finalizers()).reverse(),
                      ([_, f]) => T.result(f(exit))
                    ),
                    (e) =>
                      T.done(
                        O.getOrElse_(T.exitCollectAllPar(...e), () => T.exitSucceed([]))
                      )
                  ),
                  new Exited(s.nextKey, exit)
                ]
              }
            }
          }
        }
      }),
      T.flatten
    )
}

export function addIfOpen<S>(finalizer: FinalizerS<S>) {
  return (_: ReleaseMap<S>): T.Effect<S, unknown, never, O.Option<number>> =>
    pipe(
      _.ref,
      R.modify<T.Effect<S, unknown, never, O.Option<number>>, State<S>>((s) => {
        switch (s._tag) {
          case "Exited": {
            return [
              T.map_(finalizer(s.exit), () => O.none),
              new Exited(next(s.nextKey), s.exit)
            ]
          }
          case "Running": {
            return [
              T.succeedNow(O.some(s.nextKey)),
              new Running(next(s.nextKey), insert(s.nextKey, finalizer)(s.finalizers()))
            ]
          }
        }
      }),
      T.flatten
    )
}

export function replace<S>(key: number, finalizer: FinalizerS<S>) {
  return (_: ReleaseMap<S>): T.Effect<S, unknown, never, O.Option<FinalizerS<S>>> =>
    pipe(
      _.ref,
      R.modify<T.Effect<S, unknown, never, O.Option<FinalizerS<S>>>, State<S>>((s) => {
        switch (s._tag) {
          case "Exited":
            return [
              T.map_(finalizer(s.exit), () => O.none),
              new Exited(s.nextKey, s.exit)
            ]
          case "Running":
            return [
              T.succeedNow(lookup(key)(s.finalizers())),
              new Running(s.nextKey, insert(key, finalizer)(s.finalizers()))
            ]
          default:
            return absurd(s)
        }
      }),
      T.flatten
    )
}

export class ReleaseMap<S> {
  constructor(readonly ref: R.Ref<State<S>>) {}
}

export const makeReleaseMap = <S>() =>
  T.map_(R.makeRef<State<S>>(new Running(0, new Map())), (s) => new ReleaseMap<S>(s))
