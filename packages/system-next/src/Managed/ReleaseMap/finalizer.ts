// ets_tracing: off

import * as T from "../operations/_internal/effect"
import type { Exit } from "../operations/_internal/exit"

/**
 * A finalizer used in a `ReleaseMap`. The `Exit` value passed to it is
 * the result of executing `Managed#use` or an arbitrary value passed into
 * `ReleaseMap#release`.
 */
export type Finalizer = (exit: Exit<any, any>) => T.UIO<any>

export const noopFinalizer: Finalizer = () => T.unit
