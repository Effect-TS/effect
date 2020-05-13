import type { ModuleShape } from "./ModuleShape"

export type ExtractShape<M> = M extends ModuleShape<infer A> ? A : never
