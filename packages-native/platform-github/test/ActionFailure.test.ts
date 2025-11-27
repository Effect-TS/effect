import { describe, expect, it } from "@effect/vitest"
import { ActionFailed, InputValidationFailure, isActionFailure } from "../src/ActionError.js"

describe("ActionFailure", () => {
  describe("InputValidationFailure", () => {
    it("creates with all fields", () => {
      const failure = new InputValidationFailure({
        input: "count",
        reason: "InvalidType",
        value: "abc",
        message: "expected integer, got string"
      })

      expect(failure._tag).toBe("InputValidationFailure")
      expect(failure.input).toBe("count")
      expect(failure.reason).toBe("InvalidType")
      expect(failure.value).toBe("abc")
      expect(failure.message).toBe("expected integer, got string")
    })

    it("formats displayMessage correctly", () => {
      const failure = new InputValidationFailure({
        input: "count",
        reason: "InvalidType",
        value: "abc",
        message: "expected integer, got string"
      })

      expect(failure.displayMessage).toBe("Input 'count' is invalid: expected integer, got string")
    })

    it("handles MissingRequired reason", () => {
      const failure = new InputValidationFailure({
        input: "token",
        reason: "MissingRequired",
        value: "",
        message: "required input was not provided"
      })

      expect(failure.displayMessage).toBe("Input 'token' is invalid: required input was not provided")
    })

    it("handles SchemaValidation reason with cause", () => {
      const cause = new Error("parse error details")
      const failure = new InputValidationFailure({
        input: "config",
        reason: "SchemaValidation",
        value: '{"invalid": json}',
        message: "failed to parse JSON",
        cause
      })

      expect(failure.cause).toBe(cause)
    })
  })

  describe("ActionFailed", () => {
    it("creates with message", () => {
      const failure = new ActionFailed({
        message: "Cannot merge draft PRs"
      })

      expect(failure._tag).toBe("ActionFailed")
      expect(failure.message).toBe("Cannot merge draft PRs")
    })

    it("formats displayMessage correctly", () => {
      const failure = new ActionFailed({
        message: "Build failed with 5 errors"
      })

      expect(failure.displayMessage).toBe("Build failed with 5 errors")
    })

    it("can include cause", () => {
      const cause = new Error("underlying error")
      const failure = new ActionFailed({
        message: "Operation failed",
        cause
      })

      expect(failure.cause).toBe(cause)
    })
  })

  describe("isActionFailure", () => {
    it("returns true for InputValidationFailure", () => {
      const failure = new InputValidationFailure({
        input: "x",
        reason: "InvalidType",
        value: "",
        message: "test"
      })

      expect(isActionFailure(failure)).toBe(true)
    })

    it("returns true for ActionFailed", () => {
      const failure = new ActionFailed({ message: "test" })

      expect(isActionFailure(failure)).toBe(true)
    })

    it("returns false for other errors", () => {
      expect(isActionFailure(new Error("test"))).toBe(false)
      expect(isActionFailure({ _tag: "SomeOtherError" })).toBe(false)
      expect(isActionFailure(null)).toBe(false)
      expect(isActionFailure(undefined)).toBe(false)
    })
  })
})
