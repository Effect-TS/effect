import { pipe } from "../../Function"
import { environment, map } from "../deps"
import { Managed } from "../managed"
import type { ReleaseMap } from "../releaseMap"
import { noopFinalizer } from "../releaseMap"

/**
 * Provides access to the entire map of resources allocated by this {@link Managed}.
 */
export const releaseMap: <S>() => Managed<S, unknown, never, ReleaseMap<S>> = <S>() =>
  new Managed(
    pipe(
      environment<readonly [unknown, ReleaseMap<S>]>(),
      map((tp) => [noopFinalizer(), tp[1]])
    )
  )
