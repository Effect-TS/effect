// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { sequential } from "../../Effect/ExecutionStrategy.js"
import { pipe } from "../../Function/index.js"
import { fold } from "../../Option/index.js"
import { map } from "../core.js"
import * as T from "../deps.js"
import * as Do from "../do.js"
import type { Managed } from "../managed.js"
import * as addIfOpen from "../ReleaseMap/addIfOpen.js"
import * as makeReleaseMap from "../ReleaseMap/makeReleaseMap.js"
import * as releaseAll from "../ReleaseMap/releaseAll.js"
import * as replace from "../ReleaseMap/replace.js"
import { releaseMap } from "./releaseMap.js"

/**
 * Returns a `Managed` value that represents a managed resource that can
 * be safely swapped within the scope of the `Managed`. The function provided
 * inside the `Managed` can be used to switch the resource currently in use.
 *
 * When the resource is switched, the finalizer for the previous finalizer will
 * be executed uninterruptibly. If the effect executing inside the `use`
 * is interrupted, the finalizer for the resource currently in use is guaranteed
 * to execute.
 *
 * This constructor can be used to create an expressive control flow that uses
 * several instances of a managed resource.
 */
export function switchable<R, E, A>(
  __trace?: string
): Managed<R, never, (x: Managed<R, E, A>) => T.Effect<R, E, A>> {
  return pipe(
    Do.do,
    Do.bind("releaseMap", () => releaseMap),
    Do.bind("key", ({ releaseMap }) =>
      pipe(
        releaseMap,
        addIfOpen.addIfOpen((_) => T.unit),
        T.chain(fold(() => T.interrupt, T.succeed)),
        T.toManaged
      )
    ),
    map(
      ({ key, releaseMap }) =>
        (newResource) =>
          T.uninterruptibleMask(({ restore }) =>
            pipe(
              releaseMap,
              replace.replace(key, (_) => T.unit),
              T.chain(
                fold(
                  () => T.unit,
                  (fin) => fin(T.exitUnit)
                )
              ),
              T.zipRight(T.do),
              T.bind("r", () => T.environment<R>()),
              T.bind("inner", () => makeReleaseMap.makeReleaseMap),
              T.bind("a", ({ inner, r }) =>
                restore(T.provideAll_(newResource.effect, Tp.tuple(r, inner)))
              ),
              T.tap(({ inner }) =>
                replace.replace(key, (exit) =>
                  releaseAll.releaseAll(exit, sequential)(inner)
                )(releaseMap)
              ),
              T.map(({ a }) => a.get(1))
            )
          ),
      __trace
    )
  )
}
