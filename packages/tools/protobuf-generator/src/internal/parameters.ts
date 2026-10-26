/**
 * Plugin parameters: comma-separated `key=value` pairs, as protoc passes
 * `--effect_opt` and buf passes `opt`.
 */
import * as Schema from "effect/Schema"
import { GeneratorError, type Options } from "./generate.ts"

const Parameters = Schema.Struct({
  import_extension: Schema.optionalKey(Schema.Literals(["js", "ts", "none"])),
  timestamp: Schema.optionalKey(Schema.Literals(["datetime", "parts"])),
  duration: Schema.optionalKey(Schema.Literals(["duration", "parts"]))
})

const decodeParameters = Schema.decodeUnknownSync(Parameters)

export const parseParameters = (parameter: string): Options => {
  const entries: Record<string, string> = {}
  // `proto_map=<proto>=<specifier>` may be given more than once.
  const protoMap: Record<string, string> = {}
  for (const part of parameter.split(",")) {
    const trimmed = part.trim()
    if (trimmed === "") continue
    const eq = trimmed.indexOf("=")
    const key = eq === -1 ? trimmed : trimmed.slice(0, eq)
    const value = eq === -1 ? "" : trimmed.slice(eq + 1)
    if (key === "proto_map") {
      const separator = value.indexOf("=")
      if (separator <= 0) throw new GeneratorError(`plugin parameter proto_map=${value} is not <proto>=<specifier>`)
      const proto = value.slice(0, separator)
      const specifier = value.slice(separator + 1)
      if (proto.endsWith("/") !== specifier.endsWith("/")) {
        throw new GeneratorError(`proto map ${proto}=${specifier}: a directory maps to a specifier ending in /`)
      }
      protoMap[proto] = specifier
      continue
    }
    if (Object.hasOwn(entries, key)) throw new GeneratorError(`plugin parameter ${key} is set more than once`)
    entries[key] = value
  }
  let parameters: typeof Parameters.Type
  try {
    parameters = decodeParameters(entries, { onExcessProperty: "error" })
  } catch (e) {
    throw new GeneratorError(`invalid plugin parameters: ${e instanceof Error ? e.message : String(e)}`)
  }
  return {
    importExtension: parameters.import_extension ?? "js",
    timestamp: parameters.timestamp ?? "datetime",
    duration: parameters.duration ?? "duration",
    protoMap
  }
}
