import * as Duration from "effect/Duration"
import type { ShardingConfig } from "../ShardingConfig.js"

/** @internal */
export const effectiveInterval = (config: ShardingConfig["Type"]): Duration.Duration =>
  Duration.min(
    config.shardLockRefreshInterval,
    Duration.unsafeDivide(config.shardLockExpiration, 3)
  )
