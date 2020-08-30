import { pipe } from "../../Function"
import { environment, map } from "../deps"
import type { Sync } from "../managed"
import { Managed } from "../managed"
import type { ReleaseMap } from "../releaseMap"
import { noopFinalizer } from "../releaseMap"

export const releaseMap: Sync<ReleaseMap> = new Managed(
  pipe(
    environment<readonly [unknown, ReleaseMap]>(),
    map((tp) => [noopFinalizer, tp[1]])
  )
)
