import { eqNumber } from "../../Eq"
import * as M from "../../Map"
import * as O from "../../Option"
import { ExecutionStrategy } from "../Effect/ExecutionStrategy"
import { Ref, makeRef } from "../Ref"

import * as T from "./deps"

export type Finalizer = (exit: T.Exit<any, any>) => T.Effect<unknown, unknown, any, any>

export type FinalizerT<E> = (
  exit: T.Exit<any, any>
) => T.Effect<unknown, unknown, E, any>

export class Exited {
  readonly _tag = "Exited"
  constructor(readonly nextKey: number, readonly exit: T.Exit<any, any>) {}
}

export class Running {
  readonly _tag = "Running"
  constructor(
    readonly nextKey: number,
    readonly finalizers: M.Map<number, Finalizer>
  ) {}
}

const insert =
  /*#__PURE__*/
  M.insertAt(eqNumber)

const remove =
  /*#__PURE__*/
  M.deleteAt(eqNumber)

const lookup =
  /*#__PURE__*/
  M.lookup(eqNumber)

export type State = Exited | Running

export class ReleaseMap {
  constructor(readonly ref: Ref<State>) {}

  next(l: number) {
    return l + 1
  }

  add<E>(finalizer: FinalizerT<E>): T.AsyncE<E, Finalizer> {
    return T.map_(
      this.addIfOpen(finalizer),
      O.fold(
        () => () => T.unit,
        (k) => (e) => this.release(k, e)
      )
    )
  }

  release(key: number, exit: T.Exit<any, any>): T.Async<any> {
    return this.ref.modify((s) => {
      switch (s._tag) {
        case "Exited": {
          return [T.unit, s]
        }
        case "Running": {
          return [
            O.fold_(
              lookup(key)(s.finalizers),
              () => T.unit,
              (f) => f(exit)
            ),
            new Running(s.nextKey, remove(key)(s.finalizers))
          ]
        }
      }
    })
  }

  releaseAll(
    exit: T.Exit<any, any>,
    execStrategy: ExecutionStrategy
  ): T.AsyncE<any, any> {
    return T.flatten(
      this.ref.modify((s): [T.AsyncE<any, any>, State] => {
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
      })
    )
  }

  addIfOpen<E>(finalizer: FinalizerT<E>) {
    return T.flatten(
      this.ref.modify<T.AsyncE<E, O.Option<number>>>((s) => {
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
                insert(s.nextKey, finalizer)(s.finalizers)
              )
            ]
          }
        }
      })
    )
  }
}

export const makeReleaseMap =
  /*#__PURE__*/
  T.map_(makeRef<State>(new Running(0, new Map())), (s) => new ReleaseMap(s))
