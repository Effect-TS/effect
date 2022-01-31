import { parallel, parallelN } from "../../Effect/operations/ExecutionStrategy"
import { Managed } from "../definition"
import { ReleaseMap } from "./definition"

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap`
 * will be released with the in parallel as the release action for the
 * resulting `Managed`.
 *
 * @tsplus static ets/ReleaseMapOps makeManagedPar
 */
export const makeManagedPar: Managed<unknown, never, ReleaseMap> =
  Managed.parallelism.flatMap((p) =>
    p._tag === "None"
      ? ReleaseMap.makeManaged(parallel)
      : ReleaseMap.makeManaged(parallelN(p.value))
  )
