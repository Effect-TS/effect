import { ExecutionStrategy } from "../../ExecutionStrategy"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, combining their results with the specified `f` function. If
 * either side fails, then the other side will be interrupted.
 *
 * @tsplus fluent ets/Managed zipWithPar
 */
export function zipWithPar_<R, E, A, R2, E2, A2, B>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, B> {
  return ReleaseMap.makeManaged(ExecutionStrategy.Parallel).mapEffect(
    (parallelReleaseMap) => {
      const innerMap = locally_(
        currentReleaseMap.value,
        parallelReleaseMap
      )(ReleaseMap.makeManaged(ExecutionStrategy.Sequential).effect)

      return innerMap.zip(innerMap).flatMap(
        ({
          tuple: [
            {
              tuple: [, l]
            },
            {
              tuple: [, r]
            }
          ]
        }) => {
          const left = locally_(currentReleaseMap.value, l)(self.effect)
          const right = locally_(currentReleaseMap.value, r)(that.effect)
          // We can safely discard the finalizers here because the resulting
          // Managed's early release will trigger the ReleaseMap, which would
          // release both finalizers in parallel
          return left.zipWithPar(right, ({ tuple: [, a] }, { tuple: [, b] }) => f(a, b))
        }
      )
    }
  )
}

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, combining their results with the specified `f` function. If
 * either side fails, then the other side will be interrupted.
 *
 * @ets_data_first zipWithPar_
 */
export function zipWithPar<R2, E2, A, A2, B>(
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B,
  __tsplusTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R2, E | E2, B> =>
    self.zipWithPar(that, f)
}
