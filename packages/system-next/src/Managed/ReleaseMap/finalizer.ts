import type { UIO } from "../../Effect/definition"
import { unit } from "../../Effect/operations/unit"
import type { Exit } from "../operations/_internal/exit"

/**
 * A finalizer used in a `ReleaseMap`. The `Exit` value passed to it is
 * the result of executing `Managed#use` or an arbitrary value passed into
 * `ReleaseMap#release`.
 */
export type Finalizer = (exit: Exit<any, any>) => UIO<any>

export const noopFinalizer: Finalizer = () => unit
