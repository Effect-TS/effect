import * as Context from "effect/Context"
import type * as Storage from "../Storage.js"

const SymbolKey = "@effect/cluster/Storage"

/** @internal */
export const TypeId: Storage.TypeId = Symbol.for(SymbolKey) as Storage.TypeId

/** @internal */
export const Tag = Context.GenericTag<Storage.Storage>(SymbolKey)
