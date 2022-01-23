import * as Map from "../Collections/Immutable/Map"
import * as Tp from "../Collections/Immutable/Tuple"
import type { IO, UIO } from "../Effect/definition/base"
import { chain } from "../Effect/operations/chain"
import * as DoEffect from "../Effect/operations/do"
import * as ExecutionStrategy from "../Effect/operations/ExecutionStrategy"
import { exit } from "../Effect/operations/exit"
import { failCause } from "../Effect/operations/failCause"
import { flatten } from "../Effect/operations/flatten"
import { uninterruptibleMask } from "../Effect/operations/interruption"
import { map } from "../Effect/operations/map"
import { onExit_ } from "../Effect/operations/onExit"
import { succeed } from "../Effect/operations/succeed"
import { succeedNow } from "../Effect/operations/succeedNow"
import { tap } from "../Effect/operations/tap"
import { unit } from "../Effect/operations/unit"
import { whenEffect_ } from "../Effect/operations/whenEffect"
import type { Exit } from "../Exit"
import { currentReleaseMap } from "../FiberRef/definition/data"
import { get } from "../FiberRef/operations/get"
import { locally_ } from "../FiberRef/operations/locally"
import { pipe } from "../Function"
import type { Managed } from "../Managed/definition"
import { managedApply } from "../Managed/definition"
import {
  chain as chainManaged,
  chain_ as chainManaged_
} from "../Managed/operations/chain"
import * as DoManaged from "../Managed/operations/do"
import { foldCauseManaged } from "../Managed/operations/foldCauseManaged"
import { fromEffect as fromEffectManaged } from "../Managed/operations/fromEffect"
import { provideEnvironment_ as provideEnvironmentManaged_ } from "../Managed/operations/provideEnvironment"
import { succeed as succeedManaged } from "../Managed/operations/succeed"
import { zipWith as zipWithManaged } from "../Managed/operations/zipWith"
import { zipWithPar as zipWithParManaged } from "../Managed/operations/zipWithPar"
import * as ReleaseMap from "../Managed/ReleaseMap"
import * as Finalizer from "../Managed/ReleaseMap/finalizer"
import * as Promise from "../Promise"
import * as Ref from "../Ref/Synchronized"
import { matchTag_ } from "../Utils"
import type { Layer } from "./definition"
import { instruction, LayerHashSym } from "./definition"

/**
 * A `MemoMap` memoizes layers.
 */
export class MemoMap {
  constructor(
    readonly ref: Ref.Synchronized<
      Map.Map<PropertyKey, Tp.Tuple<[IO<any, any>, Finalizer.Finalizer]>>
    >
  ) {}

  /**
   * Checks the memo map to see if a layer exists. If it is, immediately
   * returns it. Otherwise, obtains the layer, stores it in the memo map, and
   * adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize<R, E, A>(layer: Layer<R, E, A>): Managed<R, E, A> {
    return managedApply(
      pipe(
        this.ref,
        Ref.modifyEffect((m) => {
          const inMap = Map.lookup_(m, layer[LayerHashSym].get)

          switch (inMap._tag) {
            case "Some": {
              const {
                tuple: [acquire, release]
              } = inMap.value

              const cached = pipe(
                get(currentReleaseMap.value),
                chain((releaseMap) =>
                  pipe(
                    onExit_(acquire as IO<E, A>, (exit) => {
                      switch (exit._tag) {
                        case "Success": {
                          return ReleaseMap.add_(releaseMap, release)
                        }
                        case "Failure": {
                          return unit
                        }
                      }
                    }),
                    map((x) => Tp.tuple(release, x))
                  )
                )
              )

              return succeedNow(Tp.tuple(cached, m))
            }
            case "None": {
              return pipe(
                DoEffect.Do(),
                DoEffect.bind("observers", () => Ref.make(0)),
                DoEffect.bind("promise", () => Promise.make<E, A>()),
                DoEffect.bind("finalizerRef", () => Ref.make(Finalizer.noopFinalizer)),
                DoEffect.bindValue("resource", ({ finalizerRef, observers, promise }) =>
                  uninterruptibleMask(({ restore }) =>
                    pipe(
                      DoEffect.Do(),
                      DoEffect.bind("outerReleaseMap", () =>
                        get(currentReleaseMap.value)
                      ),
                      DoEffect.bind("innerReleaseMap", () => ReleaseMap.make),
                      DoEffect.bind("tp", ({ innerReleaseMap, outerReleaseMap }) =>
                        pipe(
                          restore(
                            locally_(
                              currentReleaseMap.value,
                              innerReleaseMap
                            )(chainManaged_(scope(layer), (_) => _(this)).effect)
                          ),
                          exit,
                          chain((exit) => {
                            switch (exit._tag) {
                              case "Failure": {
                                return pipe(
                                  Promise.failCause_(promise, exit.cause),
                                  chain(() =>
                                    ReleaseMap.releaseAll_(
                                      innerReleaseMap,
                                      exit,
                                      ExecutionStrategy.sequential
                                    )
                                  ),
                                  chain(() => failCause(exit.cause))
                                )
                              }
                              case "Success": {
                                return pipe(
                                  DoEffect.Do(),
                                  tap(() =>
                                    Ref.set_(finalizerRef, (exit) =>
                                      whenEffect_(
                                        ReleaseMap.releaseAll_(
                                          innerReleaseMap,
                                          exit,
                                          ExecutionStrategy.sequential
                                        ),
                                        Ref.modify_(observers, (n) =>
                                          Tp.tuple(n === 1, n - 1)
                                        )
                                      )
                                    )
                                  ),
                                  tap(() => Ref.update_(observers, (n) => n + 1)),
                                  DoEffect.bind("outerFinalizer", () =>
                                    ReleaseMap.add_(outerReleaseMap, (e) =>
                                      pipe(
                                        Ref.get(finalizerRef),
                                        chain((_) => _(e))
                                      )
                                    )
                                  ),
                                  tap(() =>
                                    Promise.succeed_(promise, exit.value.get(1))
                                  ),
                                  map(({ outerFinalizer }) =>
                                    Tp.tuple(outerFinalizer, exit.value.get(1))
                                  )
                                )
                              }
                            }
                          })
                        )
                      ),
                      map(({ tp }) => tp)
                    )
                  )
                ),
                DoEffect.bindValue("memoized", ({ finalizerRef, observers, promise }) =>
                  Tp.tuple(
                    onExit_(Promise.await(promise) as IO<E, A>, (exit) => {
                      switch (exit._tag) {
                        case "Failure": {
                          return unit
                        }
                        case "Success": {
                          return Ref.update_(observers, (n) => n + 1)
                        }
                      }
                    }),
                    (e: Exit<any, any>) =>
                      pipe(
                        Ref.get(finalizerRef),
                        chain((_) => _(e))
                      )
                  )
                ),
                map(({ memoized, resource }) =>
                  Tp.tuple(
                    resource,
                    isFresh(layer)
                      ? m
                      : Map.insert_(m, layer[LayerHashSym].get, memoized)
                  )
                )
              )
            }
          }
        }),
        flatten
      )
    )
  }
}

/**
 * Creates an empty `MemoMap`.
 */
export function makeMemoMap(): UIO<MemoMap> {
  return pipe(
    Ref.make<ReadonlyMap<PropertyKey, Tp.Tuple<[IO<any, any>, Finalizer.Finalizer]>>>(
      Map.empty
    ),
    chain((r) => succeed(() => new MemoMap(r)))
  )
}

/**
 * Builds a layer into a managed value.
 */
export function build<R, E, A>(
  self: Layer<R, E, A>,
  __trace?: string
): Managed<R, E, A> {
  return pipe(
    DoManaged.Do(),
    DoManaged.bind("memoMap", () => fromEffectManaged(makeMemoMap())),
    DoManaged.bind("run", () => scope(self)),
    chainManaged(({ memoMap, run }) => run(memoMap))
  )
}

export function scope<R, E, A>(
  self: Layer<R, E, A>,
  __trace?: string
): Managed<unknown, never, (_: MemoMap) => Managed<R, E, A>> {
  return matchTag_(instruction(self), {
    LayerFold: (_) =>
      succeedManaged(
        () => (memoMap: MemoMap) =>
          pipe(
            memoMap.getOrElseMemoize(_.self),
            foldCauseManaged(
              (e) => memoMap.getOrElseMemoize(_.failure(e)),
              (r) => memoMap.getOrElseMemoize(_.success(r))
            )
          )
      ),
    LayerFresh: (_) => succeedManaged(() => () => build(_.self)),
    LayerManaged: (_) => succeedManaged(() => () => _.self),
    LayerSuspend: (_) =>
      succeedManaged(() => (memoMap: MemoMap) => memoMap.getOrElseMemoize(_.self())),
    LayerTo: (_) =>
      succeedManaged(
        () => (memoMap: MemoMap) =>
          pipe(
            memoMap.getOrElseMemoize(_.self),
            chainManaged((r) =>
              provideEnvironmentManaged_(memoMap.getOrElseMemoize(_.that), r)
            )
          )
      ),
    LayerZipWith: (_) =>
      succeedManaged(
        () => (memoMap: MemoMap) =>
          pipe(
            memoMap.getOrElseMemoize(_.self),
            zipWithManaged(memoMap.getOrElseMemoize(_.that), _.f)
          )
      ),
    LayerZipWithPar: (_) =>
      succeedManaged(
        () => (memoMap: MemoMap) =>
          pipe(
            memoMap.getOrElseMemoize(_.self),
            zipWithParManaged(memoMap.getOrElseMemoize(_.that), _.f)
          )
      )
  })
}

/**
 * Returns whether this layer is a fresh version that will not be shared.
 */
export function isFresh<R, E, A>(self: Layer<R, E, A>): boolean {
  return instruction(self)._tag === "LayerFresh"
}
