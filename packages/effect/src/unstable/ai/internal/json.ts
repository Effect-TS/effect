import { format, formatJson } from "../../../Formatter.ts"
import type * as Schema from "../../../Schema.ts"

/**
 * Normalizes an arbitrary runtime value into JSON.
 *
 * Tool call parameters are JSON when they come from a provider, but a custom
 * `LanguageModel` implementation can produce any value. A `tool-call-error`
 * part carries the parameters the model sent, so they must stay JSON-safe;
 * anything else is normalized with Effect's JSON formatter (the same fallback
 * `Schema.Defect` uses for non-error values), which handles bigints, circular
 * references, and redacted values, and falls back to a formatted string.
 *
 * @internal
 */
export const toJson = (value: unknown): Schema.Json => {
  try {
    const json = formatJson(value)
    return json === undefined ? format(value) : JSON.parse(json)
  } catch {
    return format(value)
  }
}
