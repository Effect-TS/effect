import type { ExecutionStrategy } from "../../Effect/ExecutionStrategy"
import { absurd, pipe } from "../../Function"
import { insert, lookup, remove } from "../../Map/core"
import * as O from "../../Option"
import * as R from "../../Ref"
import * as T from "../deps"

export type Finalizer = (exit: T.Exit<any, any>) => T.Effect<unknown, never, any>

export const noopFinalizer: Finalizer = () => T.unit

export class Exited {
  readonly _tag = "Exited"
  constructor(readonly nextKey: number, readonly exit: T.Exit<any, any>) {}
}

export class Running {
  readonly _tag = "Running"
  constructor(
    readonly nextKey: number,
    readonly _finalizers: ReadonlyMap<number, Finalizer>
  ) {}

  finalizers(): ReadonlyMap<number, Finalizer> {
    return this._finalizers as any
  }
}

export type State = Exited | Running

export function next(l: number) {
  return l + 1
}

export function add(finalizer: Finalizer) {
  return (_: ReleaseMap) =>
    T.map_(
      addIfOpen(finalizer)(_),
      O.fold(
        (): Finalizer => () => T.unit,
        (k): Finalizer => (e) => release(k, e)(_)
      )
    )
}

export function release(key: number, exit: T.Exit<any, any>) {
  return (_: ReleaseMap) =>
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
  execStrategy: ExecutionStrategy
): (_: ReleaseMap) => T.UIO<any> {
  return (_: ReleaseMap) =>
    pipe(
      _.ref,
      R.modify((s): [T.UIO<any>, State] => {
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
                    T.foreachParN_(
                      Array.from(s.finalizers()).reverse(),
                      execStrategy.n,
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

export function addIfOpen(finalizer: Finalizer) {
  return (_: ReleaseMap): T.Effect<unknown, never, O.Option<number>> =>
    pipe(
      _.ref,
      R.modify<T.Effect<unknown, never, O.Option<number>>, State>((s) => {
        switch (s._tag) {
          case "Exited": {
            return [
              T.map_(finalizer(s.exit), () => O.none),
              new Exited(next(s.nextKey), s.exit)
            ]
          }
          case "Running": {
            return [
              T.succeed(O.some(s.nextKey)),
              new Running(next(s.nextKey), insert(s.nextKey, finalizer)(s.finalizers()))
            ]
          }
        }
      }),
      T.flatten
    )
}

export function replace(key: number, finalizer: Finalizer) {
  return (_: ReleaseMap): T.Effect<unknown, never, O.Option<Finalizer>> =>
    pipe(
      _.ref,
      R.modify<T.Effect<unknown, never, O.Option<Finalizer>>, State>((s) => {
        switch (s._tag) {
          case "Exited":
            return [
              T.map_(finalizer(s.exit), () => O.none),
              new Exited(s.nextKey, s.exit)
            ]
          case "Running":
            return [
              T.succeed(lookup(key)(s.finalizers())),
              new Running(s.nextKey, insert(key, finalizer)(s.finalizers()))
            ]
          default:
            return absurd(s)
        }
      }),
      T.flatten
    )
}

export class ReleaseMap {
  constructor(readonly ref: R.Ref<State>) {}
}

export const makeReleaseMap = T.map_(
  R.makeRef<State>(new Running(0, new Map())),
  (s) => new ReleaseMap(s)
)
