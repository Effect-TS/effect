import { Effect } from "../../Effect"
import { sequential } from "../../Effect/operations/ExecutionStrategy"
import { Exit } from "../../Exit"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

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
 *
 * @tsplus static ets/ManagedOps switchable
 */
export function switchable<R, E, A>(
  __etsTrace?: string
): Managed<R, never, (x: Managed<R, E, A>) => Effect<R, E, A>> {
  return Managed.Do()
    .bind("releaseMap", () => Managed.releaseMap)
    .bind("key", ({ releaseMap }) =>
      Managed.fromEffect(
        releaseMap
          .addIfOpen(() => Effect.unit)
          .flatMap((_) => _.fold(() => Effect.interrupt, Effect.succeedNow))
      )
    )
    .map(
      ({ key, releaseMap }) =>
        (newResource) =>
          Effect.uninterruptibleMask(({ restore }) =>
            releaseMap
              .replace(key, () => Effect.unit)
              .flatMap((_) =>
                _.fold(
                  () => Effect.unit,
                  (fin) => fin(Exit.unit)
                )
              )
              .zipRight(Effect.Do())
              .bind("r", () => Effect.environment<R>())
              .bind("inner", () => ReleaseMap.make)
              .bind("a", ({ inner, r }) =>
                restore(locally_(currentReleaseMap.value, inner)(newResource.effect))
              )
              .tap(({ inner }) =>
                releaseMap.replace(key, (exit) => inner.releaseAll(exit, sequential))
              )
              .map(({ a }) => a.get(1))
          )
    )
}
