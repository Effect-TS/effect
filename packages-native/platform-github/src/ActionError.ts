/**
 * Error types for GitHub Actions platform.
 *
 * @since 1.0.0
 */
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = Symbol.for("@effect-native/platform-github/ActionError")

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isActionError = (u: unknown): u is ActionError => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category errors
 */
export class ActionInputError extends Schema.TaggedError<ActionInputError>()(
  "ActionInputError",
  {
    reason: Schema.Literal("Missing", "InvalidType", "ParseError"),
    name: Schema.String,
    value: Schema.optional(Schema.Unknown),
    cause: Schema.optional(Schema.Defect)
  }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: typeof TypeId = TypeId

  /**
   * @since 1.0.0
   */
  get message(): string {
    switch (this.reason) {
      case "Missing":
        return `Input required and not supplied: ${this.name}`
      case "InvalidType":
        return `Input "${this.name}" has invalid type`
      case "ParseError":
        return `Failed to parse input "${this.name}"`
    }
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export class ActionContextError extends Schema.TaggedError<ActionContextError>()(
  "ActionContextError",
  {
    reason: Schema.Literal("MissingEnv", "InvalidPayload", "InvalidRepo"),
    description: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Defect)
  }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: typeof TypeId = TypeId

  /**
   * @since 1.0.0
   */
  get message(): string {
    return this.description ?? `Context error: ${this.reason}`
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export class ActionApiError extends Schema.TaggedError<ActionApiError>()(
  "ActionApiError",
  {
    method: Schema.String,
    status: Schema.optional(Schema.Number),
    description: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Defect)
  }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: typeof TypeId = TypeId

  /**
   * @since 1.0.0
   */
  get message(): string {
    const statusPart = this.status !== undefined ? ` (${this.status})` : ""
    return `GitHub API error${statusPart}: ${this.method}${this.description ? ` - ${this.description}` : ""}`
  }

  /**
   * @since 1.0.0
   */
  get isRateLimited(): boolean {
    return this.status === 403 || this.status === 429
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export class ActionOIDCError extends Schema.TaggedError<ActionOIDCError>()(
  "ActionOIDCError",
  {
    reason: Schema.Literal("NotAvailable", "RequestFailed"),
    description: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Defect)
  }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: typeof TypeId = TypeId

  /**
   * @since 1.0.0
   */
  get message(): string {
    switch (this.reason) {
      case "NotAvailable":
        return "OIDC token is not available in this environment"
      case "RequestFailed":
        return `OIDC token request failed${this.description ? `: ${this.description}` : ""}`
    }
  }
}

/**
 * @since 1.0.0
 * @category errors
 */
export class ActionSummaryError extends Schema.TaggedError<ActionSummaryError>()(
  "ActionSummaryError",
  {
    reason: Schema.Literal("NotAvailable", "WriteFailed"),
    description: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Defect)
  }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: typeof TypeId = TypeId

  /**
   * @since 1.0.0
   */
  get message(): string {
    switch (this.reason) {
      case "NotAvailable":
        return "Job summary is not available in this environment"
      case "WriteFailed":
        return `Failed to write job summary${this.description ? `: ${this.description}` : ""}`
    }
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export type ActionError =
  | ActionInputError
  | ActionContextError
  | ActionApiError
  | ActionOIDCError
  | ActionSummaryError
