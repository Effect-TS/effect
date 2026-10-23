import { Data } from "effect"
import { CliError } from "effect/cli"
import { describe, expect, it } from "tstyche"

describe("CliError", () => {
  describe("userMessage", () => {
    it("augments Error with an optional string annotation", () => {
      expect<Pick<Error, CliError.userMessage>>().type.toBe<{ readonly [CliError.userMessage]?: string }>()
    })

    it("rejects non-string annotations", () => {
      class NotFound extends Data.TaggedError("NotFound")<{}> {
        // @ts-expect-error is not assignable to type 'string'
        readonly [CliError.userMessage] = 404
      }
    })
  })
})
