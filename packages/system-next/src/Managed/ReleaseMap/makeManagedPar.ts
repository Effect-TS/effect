// ets_tracing: off

import type { Managed } from "../definition"
import * as T from "../operations/_internal/effect"
import { chain_ } from "../operations/chain"
import { parallelism } from "../operations/parallelism"
import type { ReleaseMap } from "./definition"
import { makeManaged } from "./makeManaged"

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap`
 * will be released with the in parallel as the release action for the
 * resulting `Managed`.
 */
export const makeManagedPar: Managed<unknown, never, ReleaseMap> = chain_(
  parallelism,
  (p) =>
    p._tag === "None" ? makeManaged(T.parallel) : makeManaged(T.parallelN(p.value))
)
