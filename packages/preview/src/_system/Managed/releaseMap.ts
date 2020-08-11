import { pipe } from "../../_system/Function"
import { ExecutionStrategy } from "../Effect/ExecutionStrategy"
import * as O from "../Option"
import * as R from "../Ref"

import * as T from "./deps"

export type Finalizer = (
  exit: T.Exit<any, any>
) => T.Effect<unknown, unknown, never, any>

export class Exited {
  readonly _tag = "Exited"
  constructor(readonly nextKey: number, readonly exit: T.Exit<any, any>) {}
}

export class Running {
  readonly _tag = "Running"
  constructor(
    readonly nextKey: number,
    readonly finalizers: ReadonlyMap<number, Finalizer>
  ) {}
}

export const insertMap = <K, V>(k: K, v: V) => (
  self: ReadonlyMap<K, V>
): ReadonlyMap<K, V> => {
  const m = copyMap<K, V>(self)

  m.set(k, v)

  return m
}

export const removeMap = <K>(k: K) => <V>(
  self: ReadonlyMap<K, V>
): ReadonlyMap<K, V> => {
  const m = copyMap(self)

  m.delete(k)

  return m
}

export const lookupMap = <K>(k: K) => <V>(m: ReadonlyMap<K, V>) =>
  O.fromNullable(m.get(k))

export type State = Exited | Running

export class ReleaseMap {
  constructor(readonly ref: R.Ref<State>) {}

  next(l: number) {
    return l + 1
  }

  add(finalizer: Finalizer): T.Async<Finalizer> {
    return T.map_(
      this.addIfOpen(finalizer),
      O.fold(
        () => () => T.unit,
        (k) => (e) => this.release(k, e)
      )
    )
  }

  release(key: number, exit: T.Exit<any, any>): T.Async<any> {
    return pipe(
      this.ref,
      R.modify((s) => {
        switch (s._tag) {
          case "Exited": {
            return [T.unit, s]
          }
          case "Running": {
            return [
              O.fold_(
                lookupMap(key)(s.finalizers),
                () => T.unit,
                (f) => f(exit)
              ),
              new Running(s.nextKey, removeMap(key)(s.finalizers))
            ]
          }
        }
      })
    )
  }

  releaseAll(exit: T.Exit<any, any>, execStrategy: ExecutionStrategy): T.Async<any> {
    return pipe(
      this.ref,
      R.modify((s): [T.Async<any>, State] => {
        switch (s._tag) {
          case "Exited": {
            return [T.unit, s]
          }
          case "Running": {
            switch (execStrategy._tag) {
              case "Sequential": {
                return [
                  T.chain_(
                    T.foreach_(Array.from(s.finalizers).reverse(), ([_, f]) =>
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
                    T.foreachPar_(Array.from(s.finalizers).reverse(), ([_, f]) =>
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
                      Array.from(s.finalizers).reverse(),
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

  addIfOpen(finalizer: Finalizer) {
    return pipe(
      this.ref,
      R.modify<T.Async<O.Option<number>>, State>((s) => {
        switch (s._tag) {
          case "Exited": {
            return [
              T.map_(finalizer(s.exit), () => O.none),
              new Exited(this.next(s.nextKey), s.exit)
            ]
          }
          case "Running": {
            return [
              T.succeedNow(O.some(s.nextKey)),
              new Running(
                this.next(s.nextKey),
                insertMap(s.nextKey, finalizer)(s.finalizers)
              )
            ]
          }
        }
      }),
      T.flatten
    )
  }
}

export const makeReleaseMap = T.map_(
  R.makeRef<State>(new Running(0, new Map())),
  (s) => new ReleaseMap(s)
)

export function copyMap<K, V>(self: ReadonlyMap<K, V>) {
  const m = new Map<K, V>()

  self.forEach((v, k) => {
    m.set(k, v)
  })

  return m
}
