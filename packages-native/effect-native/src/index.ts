/**
 * Public surface for the `effect-native` CLI package. Everything is re-exported
 * from `./cli` so consumers can reuse the command tree, layers, or runtime
 * helpers when embedding the CLI.
 *
 * @since 0.0.1
 */
import {
  cli as cliBase,
  CliLayer as CliLayerBase,
  effectNativeCommand as effectNativeCommandBase,
  MainLayer as MainLayerBase,
  run as runBase,
  version as versionBase
} from "./cli.js"

/**
 * CLI configuration shared by the binary and tests.
 * @since 0.0.1
 */
export const CliLayer = CliLayerBase

/**
 * Baseline layer stack required by the CLI.
 * @since 0.0.1
 */
export const MainLayer = MainLayerBase

/**
 * Fully-configured CLI application ready to interpret `process.argv`.
 * @since 0.0.1
 */
export const cli = cliBase

/**
 * Root command exposed by the CLI.
 * @since 0.0.1
 */
export const effectNativeCommand = effectNativeCommandBase

/**
 * Convenience helper for executing the CLI with the default layer stack.
 * @since 0.0.1
 */
export const run = runBase

/**
 * Current `effect-native` package version.
 * @since 0.0.1
 */
export const version = versionBase
