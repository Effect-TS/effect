import { pipe } from "../../../data/Function"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import { fold } from "../../../data/Option"
import type { Managed } from "../definition"
import { addIfOpen } from "../ReleaseMap/addIfOpen"
import { make } from "../ReleaseMap/make"
import { releaseAll_ } from "../ReleaseMap/releaseAll"
import { replace, replace_ } from "../ReleaseMap/replace"
import * as T from "./_internal/effect-api"
import * as Ex from "./_internal/exit"
import * as Do from "./do"
import { fromEffect } from "./fromEffect"
import { map } from "./map"
import { releaseMap } from "./releaseMap"

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
    Do.Do(),
    Do.bind("releaseMap", () => releaseMap),
    Do.bind("key", ({ releaseMap }) =>
      pipe(
        releaseMap,
        addIfOpen((_) => T.unit),
        T.chain(fold(() => T.interrupt, T.succeedNow)),
        fromEffect
      )
    ),
    map(
      ({ key, releaseMap }) =>
        (newResource) =>
          T.uninterruptibleMask((status) =>
            pipe(
              releaseMap,
              replace(key, (_) => T.unit),
              T.chain(
                fold(
                  () => T.unit,
                  (fin) => fin(Ex.unit)
                )
              ),
              T.zipRight(T.Do()),
              T.bind("r", () => T.environment<R>()),
              T.bind("inner", () => make),
              T.bind("a", ({ inner, r }) =>
                status.restore(
                  locally_(currentReleaseMap.value, inner)(newResource.effect)
                )
              ),
              T.tap(({ inner }) =>
                replace_(releaseMap, key, (exit) =>
                  releaseAll_(inner, exit, T.sequential)
                )
              ),
              T.map(({ a }) => a.get(1))
            )
          ),
      __trace
    )
  )
}
