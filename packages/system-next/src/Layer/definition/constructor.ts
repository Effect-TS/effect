// ets_tracing: off

import * as Map from "../../Collections/Immutable/Map"
import * as Tp from "../../Collections/Immutable/Tuple"
import type { IO, UIO } from "../../Effect/definition/base"
import { chain } from "../../Effect/operations/chain"
import * as DoEffect from "../../Effect/operations/do"
import { environment } from "../../Effect/operations/environment"
import * as ExecutionStrategy from "../../Effect/operations/ExecutionStrategy"
import { exit } from "../../Effect/operations/exit"
import { failCause } from "../../Effect/operations/failCause"
import { flatten } from "../../Effect/operations/flatten"
import { uninterruptibleMask } from "../../Effect/operations/interruption"
import { map } from "../../Effect/operations/map"
import { onExit_ } from "../../Effect/operations/onExit"
import { succeed } from "../../Effect/operations/succeed"
import { tap } from "../../Effect/operations/tap"
import { unit } from "../../Effect/operations/unit"
import { whenEffect_ } from "../../Effect/operations/whenEffect"
import type { Exit } from "../../Exit"
import { currentReleaseMap } from "../../FiberRef/definition/concrete"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { pipe } from "../../Function"
import * as M from "../../Managed"
import * as ReleaseMap from "../../Managed/ReleaseMap"
import * as Finalizer from "../../Managed/ReleaseMap/finalizer"
import * as Promise from "../../Promise"
import * as Ref from "../../Ref/Synchronized"
import { matchTag_ } from "../../Utils"
import type { Layer } from "../definition"
import { LayerHashSym } from "../definition"
import { instruction } from "./primitives"

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
  getOrElseMemoize<R, E, A>(layer: Layer<R, E, A>): M.Managed<R, E, A> {
    return M.managedApply(
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

              return succeed(() => Tp.tuple(cached, m))
            }
            case "None": {
              return pipe(
                DoEffect.do,
                DoEffect.bind("observers", () => Ref.make(0)),
                DoEffect.bind("promise", () => Promise.make<E, A>()),
                DoEffect.bind("finalizerRef", () => Ref.make(Finalizer.noopFinalizer)),
                DoEffect.let("resource", ({ finalizerRef, observers, promise }) =>
                  uninterruptibleMask(({ restore }) =>
                    pipe(
                      DoEffect.do,
                      DoEffect.bind("r", () => environment<R>()),
                      DoEffect.bind("outerReleaseMap", () =>
                        get(currentReleaseMap.value)
                      ),
                      DoEffect.bind("innerReleaseMap", () => ReleaseMap.make),
                      DoEffect.bind("tp", ({ innerReleaseMap, outerReleaseMap }) =>
                        pipe(
                          restore(
                            locally_(
                              currentReleaseMap.value,
                              innerReleaseMap,
                              M.chain_(scope(layer), (_) => _(this)).effect
                            )
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
                                  DoEffect.do,
                                  tap(() =>
                                    Ref.set_(finalizerRef, (exit) =>
                                      whenEffect_(
                                        Ref.modify_(observers, (n) =>
                                          Tp.tuple(n === 1, n - 1)
                                        ),
                                        ReleaseMap.releaseAll_(
                                          innerReleaseMap,
                                          exit,
                                          ExecutionStrategy.sequential
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
                DoEffect.let("memoized", ({ finalizerRef, observers, promise }) =>
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
): M.Managed<R, E, A> {
  return pipe(
    M.do,
    M.bind("memoMap", () => M.fromEffect(makeMemoMap())),
    M.bind("run", () => scope(self)),
    M.chain(({ memoMap, run }) => run(memoMap))
  )
}

export function scope<R, E, A>(
  self: Layer<R, E, A>,
  __trace?: string
): M.Managed<unknown, never, (_: MemoMap) => M.Managed<R, E, A>> {
  return matchTag_(instruction(self), {
    LayerFold: (_) =>
      M.succeed(
        () => (memoMap: MemoMap) =>
          pipe(
            memoMap.getOrElseMemoize(_.self),
            M.foldCauseManaged(
              (e) => memoMap.getOrElseMemoize(_.failure(e)),
              (r) => memoMap.getOrElseMemoize(_.success(r))
            )
          )
      ),
    LayerFresh: (_) => M.succeed(() => () => build(_.self)),
    LayerManaged: (_) => M.succeed(() => () => _.self),
    LayerSuspend: (_) =>
      M.succeed(() => (memoMap: MemoMap) => memoMap.getOrElseMemoize(_.self())),
    LayerTo: (_) =>
      M.succeed(
        () => (memoMap: MemoMap) =>
          pipe(
            memoMap.getOrElseMemoize(_.self),
            M.chain((r) => M.provideEnvironment_(memoMap.getOrElseMemoize(_.that), r))
          )
      ),
    LayerZipWith: (_) =>
      M.succeed(
        () => (memoMap: MemoMap) =>
          pipe(
            memoMap.getOrElseMemoize(_.self),
            M.zipWith(memoMap.getOrElseMemoize(_.that), _.f)
          )
      ),
    LayerZipWithPar: (_) =>
      M.succeed(
        () => (memoMap: MemoMap) =>
          pipe(
            memoMap.getOrElseMemoize(_.self),
            M.zipWithPar(memoMap.getOrElseMemoize(_.that), _.f)
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
