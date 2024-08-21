import * as Context from "effect/Context"
import type * as ShardingConfig from "../ShardingConfig.js"

const SymbolKey = "@effect/cluster/ShardingConfig"

/** @internal */
export const TypeId: ShardingConfig.TypeId = Symbol.for(SymbolKey) as ShardingConfig.TypeId

/** @internal */
export const Tag = Context.GenericTag<ShardingConfig.ShardingConfig>(SymbolKey)
