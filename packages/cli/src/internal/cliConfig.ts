import * as Context from "effect/Context"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as CliConfig from "../CliConfig.js"

/** @internal */
export const make = (params: Partial<CliConfig.CliConfig> = {}): CliConfig.CliConfig => ({
  ...defaultConfig,
  ...params
})

/** @internal */
export const Tag = Context.Tag<CliConfig.CliConfig>()

/** @internal */
export const defaultConfig: CliConfig.CliConfig = {
  isCaseSensitive: false,
  autoCorrectLimit: 2,
  finalCheckBuiltIn: false,
  showAllNames: true,
  showBuiltIns: true,
  showTypes: true
}

/** @internal */
export const defaultLayer: Layer.Layer<never, never, CliConfig.CliConfig> = Layer.succeed(
  Tag,
  defaultConfig
)

/** @internal */
export const layer = (
  config: Partial<CliConfig.CliConfig> = {}
): Layer.Layer<never, never, CliConfig.CliConfig> => Layer.succeed(Tag, make(config))

/** @internal */
export const normalizeCase = dual<
  (text: string) => (self: CliConfig.CliConfig) => string,
  (self: CliConfig.CliConfig, text: string) => string
>(2, (self, text) => self.isCaseSensitive ? text : text.toLowerCase())
