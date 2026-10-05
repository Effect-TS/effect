import { describe, it } from "@effect/vitest"
import { Formatter, Redactable } from "effect"
import { strictEqual } from "../utils/assert.ts"

describe("audit cause-exit-01", () => {
  // Formatter.ts:257-260 (formatJson): "`Redactable` values are automatically redacted before
  // serialization." Formatter.test.ts verifies redaction takes precedence over toJSON at the root and
  // in data properties; the replacer at Formatter.ts:311 only recovers the pre-toJSON value for own
  // data properties, so a getter-returned Redactable is serialized via its unredacted toJSON.
  it("formatJson redacts a Redactable with toJSON returned from a getter", () => {
    const secret = {
      toJSON: () => ({ secret: "raw-api-token" }),
      [Redactable.symbolRedactable]: () => ({ secret: "[REDACTED]" })
    }
    strictEqual(
      Formatter.formatJson({
        get sensitive() {
          return secret
        }
      }),
      `{"sensitive":{"secret":"[REDACTED]"}}`
    )
  })
})
