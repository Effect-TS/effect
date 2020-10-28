import type { Runtime } from "../Fiber"
import { track } from "../Supervisor"
import { chain_, supervised } from "./core"
import { descriptor } from "./descriptor"
import type { Effect, UIO } from "./effect"
import { map_ } from "./map_"

/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 */
export function withChildren<R, E, A>(
  get: (_: UIO<readonly Runtime<any, any>[]>) => Effect<R, E, A>
) {
  chain_(track, (supervisor) =>
    supervised(supervisor)(
      get(
        chain_(supervisor.value, (children) =>
          map_(descriptor, (d) => children.filter((_) => _.id !== d.id))
        )
      )
    )
  )
}
