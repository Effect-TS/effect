import { ModuleSpec } from "./ModuleSpec"

export type MergeSpec<S> = {
  [k in keyof S]: ModuleSpec<any>
}
