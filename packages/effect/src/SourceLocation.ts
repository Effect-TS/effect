/**
 * Source location metadata for build-time instrumentation.
 *
 * This module provides types and utilities for tracking source code locations
 * through the Effect runtime. It enables automatic log prefixing, OpenTelemetry
 * code attributes, and DevTools integration.
 *
 * @since 3.20.0
 */

/**
 * @since 3.20.0
 * @category symbols
 */
export const SourceLocationTypeId: unique symbol = Symbol.for("effect/SourceLocation")

/**
 * @since 3.20.0
 * @category symbols
 */
export type SourceLocationTypeId = typeof SourceLocationTypeId

/**
 * Represents a source code location, typically injected at build time.
 *
 * @example
 * ```ts
 * const trace: SourceLocation = {
 *   [SourceLocationTypeId]: SourceLocationTypeId,
 *   path: "src/services/UserRepo.ts",
 *   line: 42,
 *   column: 12,
 *   label: "fetchUser"
 * }
 * ```
 *
 * @since 3.20.0
 * @category models
 */
export interface SourceLocation {
  readonly [SourceLocationTypeId]: SourceLocationTypeId
  /**
   * The relative file path from the project root.
   * Example: "src/services/UserRepo.ts"
   */
  readonly path: string
  /**
   * The 1-based line number in the source file.
   */
  readonly line: number
  /**
   * The 0-based column number in the source file.
   */
  readonly column: number
  /**
   * An optional label for this location, typically the variable name
   * or function name associated with the effect.
   */
  readonly label?: string | undefined
}

/**
 * Constructs a SourceLocation object.
 *
 * @since 3.20.0
 * @category constructors
 */
export const make = (
  path: string,
  line: number,
  column: number,
  label?: string | undefined
): SourceLocation => ({
  [SourceLocationTypeId]: SourceLocationTypeId,
  path,
  line,
  column,
  label
})

/**
 * Formats a SourceLocation as a string for display.
 *
 * @example
 * ```ts
 * import { SourceLocation } from "effect"
 *
 * const trace = SourceLocation.make("src/UserRepo.ts", 42, 12, "fetchUser")
 * console.log(SourceLocation.format(trace))
 * // Output: "src/UserRepo.ts:42"
 * ```
 *
 * @since 3.20.0
 * @category formatting
 */
export const format = (location: SourceLocation): string =>
  location.label
    ? `${location.path}:${location.line} (${location.label})`
    : `${location.path}:${location.line}`

/**
 * Type guard to check if a value is a SourceLocation.
 *
 * @since 3.20.0
 * @category guards
 */
export const isSourceLocation = (u: unknown): u is SourceLocation =>
  typeof u === "object" && u !== null && SourceLocationTypeId in u
