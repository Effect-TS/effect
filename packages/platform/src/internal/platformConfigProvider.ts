import * as ConfigProvider from "effect/ConfigProvider"
import * as Context from "effect/Context"
import * as DefaultServices from "effect/DefaultServices"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import * as Layer from "effect/Layer"
import type { PlatformError } from "../Error.js"
import * as FileSystem from "../FileSystem.js"

/**
 * dot env ConfigProvider
 *
 * Based on
 * - https://github.com/motdotla/dotenv
 * - https://github.com/motdotla/dotenv-expand
 */

/** @internal */
export const fromDotEnv = (
  path: string,
  config?: Partial<ConfigProvider.ConfigProvider.FromMapConfig>
): Effect.Effect<ConfigProvider.ConfigProvider, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const content = yield* fs.readFileString(path)
    const obj = parseDotEnv(content)
    return ConfigProvider.fromMap(
      new Map(Object.entries(obj)),
      Object.assign({}, { pathDelim: "_", seqDelim: "," }, config)
    )
  })

/** @internal */
export const layerDotEnv = (path: string): Layer.Layer<never, PlatformError, FileSystem.FileSystem> =>
  fromDotEnv(path).pipe(
    Effect.map(Layer.setConfigProvider),
    Layer.unwrapEffect
  )

/** @internal */
export const layerDotEnvAdd = (path: string): Layer.Layer<never, never, FileSystem.FileSystem> =>
  Effect.gen(function*() {
    const dotEnvConfigProvider = yield* Effect.orElseSucceed(fromDotEnv(path), () => null)

    if (dotEnvConfigProvider === null) {
      yield* Effect.logDebug(`File '${path}' not found, skipping dotenv ConfigProvider.`)
      return Layer.empty
    }

    const currentConfigProvider = yield* FiberRef.get(DefaultServices.currentServices).pipe(
      Effect.map((services) => Context.get(services, ConfigProvider.ConfigProvider))
    )
    const configProvider = ConfigProvider.orElse(currentConfigProvider, () => dotEnvConfigProvider)
    return Layer.setConfigProvider(configProvider)
  }).pipe(Layer.unwrapEffect)

/** @internal */
const DOT_ENV_LINE =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg

/** @internal */
const parseDotEnv = (lines: string): Record<string, string> => {
  const obj: Record<string, string> = {}

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/gm, "\n")

  let match: RegExpExecArray | null
  while ((match = DOT_ENV_LINE.exec(lines)) != null) {
    const key = match[1]

    // Default undefined or null to empty string
    let value = match[2] || ""

    // Remove whitespace
    value = value.trim()

    // Check if double quoted
    const maybeQuote = value[0]

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2")

    // Expand newlines if double quoted
    if (maybeQuote === "\"") {
      value = value.replace(/\\n/g, "\n")
      value = value.replace(/\\r/g, "\r")
    }

    // Add to object
    obj[key] = value
  }

  return expand(obj)
}

/** @internal */
const expand = (parsed: Record<string, string>) => {
  const newParsed: Record<string, string> = {}

  for (const configKey in parsed) {
    // resolve escape sequences
    newParsed[configKey] = interpolate(parsed[configKey], parsed).replace(/\\\$/g, "$")
  }

  return newParsed
}

/** @internal */
const interpolate = (envValue: string, parsed: Record<string, string>) => {
  // find the last unescaped dollar sign in the
  // value so that we can evaluate it
  const lastUnescapedDollarSignIndex = searchLast(envValue, /(?!(?<=\\))\$/g)

  // If we couldn't match any unescaped dollar sign
  // let's return the string as is
  if (lastUnescapedDollarSignIndex === -1) return envValue

  // This is the right-most group of variables in the string
  const rightMostGroup = envValue.slice(lastUnescapedDollarSignIndex)

  /**
   * This finds the inner most variable/group divided
   * by variable name and default value (if present)
   * (
   *   (?!(?<=\\))\$        // only match dollar signs that are not escaped
   *   {?                   // optional opening curly brace
   *     ([\w]+)            // match the variable name
   *     (?::-([^}\\]*))?   // match an optional default value
   *   }?                   // optional closing curly brace
   * )
   */
  const matchGroup = /((?!(?<=\\))\${?([\w]+)(?::-([^}\\]*))?}?)/
  const match = rightMostGroup.match(matchGroup)

  if (match !== null) {
    const [_, group, variableName, defaultValue] = match

    return interpolate(
      envValue.replace(group, defaultValue || parsed[variableName] || ""),
      parsed
    )
  }

  return envValue
}

/** @internal */
const searchLast = (str: string, rgx: RegExp) => {
  const matches = Array.from(str.matchAll(rgx))
  return matches.length > 0 ? matches.slice(-1)[0].index : -1
}
