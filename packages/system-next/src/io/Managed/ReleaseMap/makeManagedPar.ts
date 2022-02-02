import { ExecutionStrategy } from "../../ExecutionStrategy"
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
  Managed.parallelism.flatMap((parallelism) =>
    parallelism._tag === "None"
      ? ReleaseMap.makeManaged(ExecutionStrategy.Parallel)
      : ReleaseMap.makeManaged(ExecutionStrategy.ParallelN(parallelism.value))
  )
