import type { ModuleSpec } from "./ModuleSpec"

export type TypeOf<M> = M extends ModuleSpec<infer A> ? A : never
