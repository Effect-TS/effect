/**
 * @since 2.0.0
 */
import { Context } from "./exports/Context.js"

import type { TestConfig } from "./exports/TestConfig.js"

/**
 * @since 2.0.0
 */
export const Tag: Context.Tag<TestConfig, TestConfig> = Context.Tag<TestConfig>(
  Symbol.for("effect/TestConfig")
)

/**
 * @since 2.0.0
 */
export const make = (params: {
  readonly repeats: number
  readonly retries: number
  readonly samples: number
  readonly shrinks: number
}): TestConfig => params
