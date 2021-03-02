import * as T from "../deps-core"

export type Finalizer = (exit: T.Exit<any, any>) => T.Effect<unknown, never, any>

export const noopFinalizer: Finalizer = () => T.unit
