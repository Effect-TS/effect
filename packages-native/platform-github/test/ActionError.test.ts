import { describe, expect, it } from "@effect/vitest"
import {
  ActionApiError,
  ActionContextError,
  ActionInputError,
  ActionOIDCError,
  ActionSummaryError,
  isActionError,
  TypeId
} from "../src/ActionError.js"

describe("ActionError", () => {
  describe("ActionInputError", () => {
    it("constructs with Missing reason", () => {
      const error = new ActionInputError({
        reason: "Missing",
        name: "my-input"
      })
      expect(error._tag).toBe("ActionInputError")
      expect(error.reason).toBe("Missing")
      expect(error.name).toBe("my-input")
      expect(error.message).toBe("Input required and not supplied: my-input")
    })

    it("constructs with InvalidType reason", () => {
      const error = new ActionInputError({
        reason: "InvalidType",
        name: "boolean-input",
        value: "not-a-boolean"
      })
      expect(error.reason).toBe("InvalidType")
      expect(error.message).toBe("Input \"boolean-input\" has invalid type")
    })

    it("constructs with ParseError reason", () => {
      const error = new ActionInputError({
        reason: "ParseError",
        name: "json-input"
      })
      expect(error.reason).toBe("ParseError")
      expect(error.message).toBe("Failed to parse input \"json-input\"")
    })

    it("has TypeId", () => {
      const error = new ActionInputError({ reason: "Missing", name: "test" })
      expect(error[TypeId]).toBe(TypeId)
    })

    it("is recognized by isActionError", () => {
      const error = new ActionInputError({ reason: "Missing", name: "test" })
      expect(isActionError(error)).toBe(true)
    })
  })

  describe("ActionContextError", () => {
    it("constructs with MissingEnv reason", () => {
      const error = new ActionContextError({
        reason: "MissingEnv",
        description: "GITHUB_REPOSITORY not set"
      })
      expect(error._tag).toBe("ActionContextError")
      expect(error.reason).toBe("MissingEnv")
      expect(error.message).toBe("GITHUB_REPOSITORY not set")
    })

    it("constructs with InvalidPayload reason", () => {
      const error = new ActionContextError({
        reason: "InvalidPayload"
      })
      expect(error.message).toBe("Context error: InvalidPayload")
    })

    it("constructs with InvalidRepo reason", () => {
      const error = new ActionContextError({
        reason: "InvalidRepo",
        description: "Could not parse repository"
      })
      expect(error.message).toBe("Could not parse repository")
    })

    it("has TypeId", () => {
      const error = new ActionContextError({ reason: "MissingEnv" })
      expect(error[TypeId]).toBe(TypeId)
    })
  })

  describe("ActionApiError", () => {
    it("constructs with method and status", () => {
      const error = new ActionApiError({
        method: "GET /repos/{owner}/{repo}",
        status: 404,
        description: "Not Found"
      })
      expect(error._tag).toBe("ActionApiError")
      expect(error.method).toBe("GET /repos/{owner}/{repo}")
      expect(error.status).toBe(404)
      expect(error.message).toBe("GitHub API error (404): GET /repos/{owner}/{repo} - Not Found")
    })

    it("constructs without status", () => {
      const error = new ActionApiError({
        method: "POST /graphql"
      })
      expect(error.message).toBe("GitHub API error: POST /graphql")
    })

    it("isRateLimited returns true for 403", () => {
      const error = new ActionApiError({
        method: "GET /user",
        status: 403
      })
      expect(error.isRateLimited).toBe(true)
    })

    it("isRateLimited returns true for 429", () => {
      const error = new ActionApiError({
        method: "GET /user",
        status: 429
      })
      expect(error.isRateLimited).toBe(true)
    })

    it("isRateLimited returns false for other status", () => {
      const error = new ActionApiError({
        method: "GET /user",
        status: 500
      })
      expect(error.isRateLimited).toBe(false)
    })

    it("has TypeId", () => {
      const error = new ActionApiError({ method: "test" })
      expect(error[TypeId]).toBe(TypeId)
    })
  })

  describe("ActionOIDCError", () => {
    it("constructs with NotAvailable reason", () => {
      const error = new ActionOIDCError({
        reason: "NotAvailable"
      })
      expect(error._tag).toBe("ActionOIDCError")
      expect(error.reason).toBe("NotAvailable")
      expect(error.message).toBe("OIDC token is not available in this environment")
    })

    it("constructs with RequestFailed reason", () => {
      const error = new ActionOIDCError({
        reason: "RequestFailed",
        description: "Token expired"
      })
      expect(error.message).toBe("OIDC token request failed: Token expired")
    })

    it("has TypeId", () => {
      const error = new ActionOIDCError({ reason: "NotAvailable" })
      expect(error[TypeId]).toBe(TypeId)
    })
  })

  describe("ActionSummaryError", () => {
    it("constructs with NotAvailable reason", () => {
      const error = new ActionSummaryError({
        reason: "NotAvailable"
      })
      expect(error._tag).toBe("ActionSummaryError")
      expect(error.reason).toBe("NotAvailable")
      expect(error.message).toBe("Job summary is not available in this environment")
    })

    it("constructs with WriteFailed reason", () => {
      const error = new ActionSummaryError({
        reason: "WriteFailed",
        description: "Permission denied"
      })
      expect(error.message).toBe("Failed to write job summary: Permission denied")
    })

    it("has TypeId", () => {
      const error = new ActionSummaryError({ reason: "NotAvailable" })
      expect(error[TypeId]).toBe(TypeId)
    })
  })

  describe("isActionError", () => {
    it("returns false for non-errors", () => {
      expect(isActionError(null)).toBe(false)
      expect(isActionError(undefined)).toBe(false)
      expect(isActionError({})).toBe(false)
      expect(isActionError(new Error("test"))).toBe(false)
    })

    it("returns true for all action error types", () => {
      expect(isActionError(new ActionInputError({ reason: "Missing", name: "x" }))).toBe(true)
      expect(isActionError(new ActionContextError({ reason: "MissingEnv" }))).toBe(true)
      expect(isActionError(new ActionApiError({ method: "x" }))).toBe(true)
      expect(isActionError(new ActionOIDCError({ reason: "NotAvailable" }))).toBe(true)
      expect(isActionError(new ActionSummaryError({ reason: "NotAvailable" }))).toBe(true)
    })
  })
})
