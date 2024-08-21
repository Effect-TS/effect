import * as Context from "effect/Context"
import type * as Pods from "../Pods.js"

const SymbolKey = "@effect/cluster/Pods"

/** @internal */
export const Tag = Context.GenericTag<Pods.Pods>(SymbolKey)

/** @internal */
export const TypeId: Pods.TypeId = Symbol.for(SymbolKey) as Pods.TypeId
