import type * as CliConfig from "@effect/cli/CliConfig"
import * as Context from "@effect/data/Context"
import { dual } from "@effect/data/Function"
import * as Layer from "@effect/io/Layer"

/** @internal */
export const make = (isCaseSensitive: boolean, autoCorrectLimit: number): CliConfig.CliConfig => ({
  isCaseSensitive,
  autoCorrectLimit
})

/** @internal */
export const Tag = Context.Tag<CliConfig.CliConfig>()

/** @internal */
export const defaultConfig: CliConfig.CliConfig = {
  isCaseSensitive: true,
  autoCorrectLimit: 2
}

/** @internal */
export const defaultLayer: Layer.Layer<never, never, CliConfig.CliConfig> = Layer.succeed(Tag, defaultConfig)

/** @internal */
export const layer = (config: CliConfig.CliConfig): Layer.Layer<never, never, CliConfig.CliConfig> =>
  Layer.succeed(Tag, config)

/** @internal */
export const normalizeCase = dual<
  (text: string) => (self: CliConfig.CliConfig) => string,
  (self: CliConfig.CliConfig, text: string) => string
>(2, (self, text) => self.isCaseSensitive ? text : text.toLowerCase())
