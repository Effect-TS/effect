import * as Redacted from "../../Redacted.ts"

/** @internal */
export const unwrap = (value: string | Redacted.Redacted): string =>
  typeof value === "string" ? value : Redacted.value(value)
