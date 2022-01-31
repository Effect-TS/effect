// ets_tracing: off

import * as T from "../deps-core.js"

export type Finalizer = (exit: T.Exit<any, any>) => T.Effect<unknown, never, unknown>

export const noopFinalizer: Finalizer = () => T.unit
