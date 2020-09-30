import { sequential } from "../../Effect/ExecutionStrategy"
import { pipe } from "../../Function"
import { fold } from "../../Option"
import { map } from "../core"
import * as T from "../deps"
import * as Do from "../do"
import type { Managed } from "../managed"
import * as RelMap from "../releaseMap"
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
export function switchable<R, E, A>(): Managed<
  R,
  never,
  (x: Managed<R, E, A>) => T.Effect<R, E, A>
> {
  return pipe(
    Do.do,
    Do.bind("releaseMap", () => releaseMap),
    Do.bind("key", ({ releaseMap }) =>
      pipe(
        releaseMap,
        RelMap.addIfOpen((_) => T.unit),
        T.chain(fold(() => T.interrupt, T.succeed)),
        T.toManaged()
      )
    ),
    map(({ key, releaseMap }) => (newResource) =>
      T.uninterruptibleMask(({ restore }) =>
        pipe(
          releaseMap,
          RelMap.replace(key, (_) => T.unit),
          T.chain(
            fold(
              () => T.unit,
              (fin) => fin(T.exitUnit)
            )
          ),
          T.andThen(T.do),
          T.bind("r", () => T.environment<R>()),
          T.bind("inner", () => RelMap.makeReleaseMap),
          T.bind("a", ({ inner, r }) =>
            restore(T.provideAll_(newResource.effect, [r, inner]))
          ),
          T.tap(({ inner }) =>
            RelMap.replace(key, (exit) => RelMap.releaseAll(exit, sequential)(inner))(
              releaseMap
            )
          ),
          T.map(({ a }) => a[1])
        )
      )
    )
  )
}
