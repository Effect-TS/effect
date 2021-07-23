// ets_tracing: off

import * as SS from "../Collections/Immutable/SortedSet"
import type { Runtime } from "../Fiber"
import { track } from "../Supervisor"
import { chain_, supervised } from "./core"
import { descriptor } from "./descriptor"
import type { Effect, UIO } from "./effect"
import { map_ } from "./map"

/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 */
export function withChildren<R, E, A>(
  get: (_: UIO<SS.SortedSet<Runtime<any, any>>>) => Effect<R, E, A>,
  __trace?: string
) {
  return chain_(
    track,
    (supervisor) =>
      supervised(supervisor)(
        get(
          chain_(supervisor.value, (children) =>
            map_(descriptor, (d) => SS.filter_(children, (_) => _.id !== d.id))
          )
        )
      ),
    __trace
  )
}
