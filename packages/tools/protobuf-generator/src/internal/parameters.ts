/**
 * Plugin parameters: comma-separated `key=value` pairs, as protoc passes
 * `--effect_opt` and buf passes `opt`.
 */
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { GeneratorError, type Options } from "./generate.ts"

const Parameters = Schema.Struct({
  import_extension: Schema.optionalKey(Schema.Literals(["js", "ts", "none"]))
})

const decodeParameters = Schema.decodeUnknownResult(Parameters)

/** The options of a plugin parameter string. */
export const parseParameters = (parameter: string): Result.Result<Options, GeneratorError> => {
  const entries: Record<string, string> = {}
  for (const part of parameter.split(",")) {
    const trimmed = part.trim()
    if (trimmed === "") continue
    const eq = trimmed.indexOf("=")
    const key = eq === -1 ? trimmed : trimmed.slice(0, eq)
    if (Object.hasOwn(entries, key)) {
      return Result.fail(new GeneratorError({ message: `plugin parameter ${key} is set more than once` }))
    }
    entries[key] = eq === -1 ? "" : trimmed.slice(eq + 1)
  }
  return decodeParameters(entries, { onExcessProperty: "error" }).pipe(
    Result.map((parameters) => ({ importExtension: parameters.import_extension ?? "js" })),
    Result.mapError((error) => new GeneratorError({ message: `invalid plugin parameters: ${error.message}` }))
  )
}
