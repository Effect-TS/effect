/**
 * Describes problems found while decoding, encoding, or checking data with
 * schemas.
 *
 * An `Issue` records what failed and, for nested data, where the failure
 * happened. The Schema system uses these values for missing keys, unexpected
 * keys, invalid types, invalid values, failed filters, failed transformations,
 * and alternatives that did not match. This module also formats issues.
 *
 * @since 4.0.0
 */
import type { StandardSchemaV1 } from "@standard-schema/spec"
import * as Arr from "./Array.ts"
import { formatPath, type Formatter as FormatterI } from "./Formatter.ts"
import * as InternalAnnotations from "./internal/schema/annotations.ts"
import { hasProperty } from "./Predicate.ts"
import type * as Schema from "./Schema.ts"
import type * as SchemaAST from "./SchemaAST.ts"

const TypeId = "~effect/SchemaIssue/Issue"

/**
 * Returns `true` if the given value is an {@link Issue}.
 *
 * **When to use**
 *
 * Use when you need to narrow an `unknown` value to `Issue` in error-handling
 * code, such as distinguishing an `Issue` from other error types in a catch-all
 * handler.
 *
 * **Details**
 *
 * - Checks for the internal `TypeId` brand on the value.
 *
 * **Example** (Type-guarding an unknown error)
 *
 * ```ts import.meta.vitest
 * import { SchemaIssue } from "effect"
 *
 * const issue = new SchemaIssue.MissingKey(undefined)
 * SchemaIssue.isIssue(issue) // => true
 * SchemaIssue.isIssue("not an issue") // => false
 * ```
 *
 * @see {@link Issue}
 *
 * @category guards
 * @since 4.0.0
 */
export function isIssue(u: unknown): u is Issue {
  return hasProperty(u, TypeId) && u[TypeId] === TypeId
}

/**
 * Union of all terminal (leaf) issue types that have no inner `Issue` children.
 *
 * **When to use**
 *
 * Use when constraining formatter hooks to only handle terminal nodes or when
 * pattern matching on the `_tag` of an issue and only leaf nodes matter.
 *
 * **Details**
 *
 * Members: {@link InvalidType}, {@link InvalidValue}, {@link MissingKey},
 * {@link UnexpectedKey}, {@link Forbidden}, {@link OneOf}.
 *
 * @see {@link Issue} — the full union including composite nodes
 * @see {@link LeafHook} — formatter hook that operates on `Leaf` values
 *
 * @category models
 * @since 4.0.0
 */
export type Leaf =
  | InvalidType
  | InvalidValue
  | MissingKey
  | UnexpectedKey
  | Forbidden
  | OneOf

/**
 * The root discriminated union of all validation error nodes.
 *
 * **When to use**
 *
 * Use when typing the error channel in `Effect<A, Issue, R>` results from
 * schema parsing, or when writing custom formatters or issue-tree walkers.
 *
 * **Details**
 *
 * Every node has a `_tag` field for pattern-matching. The union includes both
 * terminal {@link Leaf} types and composite types that wrap inner issues:
 * {@link Filter}, {@link Encoding}, {@link Pointer}, {@link Composite},
 * {@link AnyOf}. All `Issue` instances have a `toString()` that delegates to
 * the default formatter, so `String(issue)` produces a human-readable message.
 * Built-in issues have no `actual` field, and built-in messages do not include
 * the rejected value. This is not a general sanitization boundary: paths,
 * ASTs, union successes, and custom annotations or messages are preserved as
 * supplied and remain the caller's responsibility.
 *
 * @see {@link Leaf} — the terminal subset
 * @see {@link isIssue} — type guard
 * @category models
 * @since 4.0.0
 */
export type Issue =
  | Leaf
  // composite
  | Filter
  | Encoding
  | Pointer
  | Composite
  | AnyOf

class Base {
  readonly [TypeId] = TypeId
  toString(this: Issue): string {
    return defaultFormatter(this)
  }
}

/**
 * Represents a schema issue produced when a schema filter (refinement check) fails.
 *
 * **When to use**
 *
 * Use when you need to inspect a schema issue that records which refinement
 * check rejected the value.
 *
 * **Details**
 *
 * - `filter` is the AST filter node that produced this issue.
 * - `issue` is the inner issue describing the failure reason.
 *
 * **Example** (Matching a Filter issue)
 *
 * ```ts import.meta.vitest
 * import { SchemaAST, SchemaIssue } from "effect"
 *
 * function describe(issue: SchemaIssue.Issue): string {
 *   if (issue._tag === "Filter") {
 *     return `Filter failed: ${String(issue.issue)}`
 *   }
 *   return String(issue)
 * }
 *
 * const issue = new SchemaIssue.Filter(
 *   SchemaAST.isPattern(/^valid$/),
 *   new SchemaIssue.InvalidValue()
 * )
 * describe(issue) // => `Filter failed: Expected a valid value`
 * ```
 *
 * @see {@link Leaf} — terminal issue types that commonly appear as the inner `issue`
 * @see {@link CheckHook} — formatter hook for `Filter` issues
 *
 * @category models
 * @since 4.0.0
 */
export class Filter extends Base {
  readonly _tag = "Filter"
  /**
   * The filter that failed.
   */
  readonly filter: SchemaAST.Filter<unknown>
  /**
   * The issue that occurred.
   */
  readonly issue: Issue

  constructor(
    /**
     * The filter that failed.
     */
    filter: SchemaAST.Filter<any>,
    /**
     * The issue that occurred.
     */
    issue: Issue
  ) {
    super()
    this.filter = filter
    this.issue = issue
  }
}

/**
 * Represents a schema issue produced when a schema transformation (encode/decode step) fails.
 *
 * **When to use**
 *
 * Use when you need to inspect failures from `Schema.decodeTo` / `Schema.encodeTo`
 *   transformations.
 *
 * **Details**
 *
 * - `ast` is the AST node for the transformation that failed.
 * - `issue` is the inner issue describing the failure.
 *
 * @see {@link Filter} — failure from a refinement check (not a transformation)
 * @see {@link Composite} — multiple issues from a single schema node
 *
 * @category models
 * @since 4.0.0
 */
export class Encoding extends Base {
  readonly _tag = "Encoding"
  /**
   * The schema that caused the issue.
   */
  readonly ast: SchemaAST.AST
  /**
   * The issue that occurred.
   */
  readonly issue: Issue

  constructor(
    /**
     * The schema that caused the issue.
     */
    ast: SchemaAST.AST,
    /**
     * The issue that occurred.
     */
    issue: Issue
  ) {
    super()
    this.ast = ast
    this.issue = issue
  }
}

/**
 * Wraps an inner {@link Issue} with a property-key path, indicating *where* in
 * a nested structure the error occurred.
 *
 * **When to use**
 *
 * Use when you need to walk the issue tree to accumulate path segments for error
 * reporting.
 *
 * **Details**
 *
 * - `path` is an array of property keys (strings, numbers, or symbols).
 * - Formatters concatenate nested `Pointer` paths into a single path like
 *   `["a"]["b"][0]`.
 *
 * @see {@link Composite} — groups multiple issues under one schema node
 *
 * @category models
 * @since 3.10.0
 */
export class Pointer extends Base {
  readonly _tag = "Pointer"
  /**
   * The path to the location in the input that caused the issue.
   */
  readonly path: ReadonlyArray<PropertyKey>
  /**
   * The issue that occurred.
   */
  readonly issue: Issue

  constructor(
    /**
     * The path to the location in the input that caused the issue.
     */
    path: ReadonlyArray<PropertyKey>,
    /**
     * The issue that occurred.
     */
    issue: Issue
  ) {
    super()
    this.path = path
    this.issue = issue
  }
}

/**
 * Represents a schema issue produced when a required key or tuple index is missing from the input.
 *
 * **When to use**
 *
 * Use when you need to detect absent fields in struct/tuple validation.
 *
 * **Details**
 *
 * - `annotations` may contain a custom `messageMissingKey` for formatting.
 *
 * @see {@link Pointer} — wraps this issue with the missing key's path
 * @see {@link UnexpectedKey} — the opposite case (extra key present)
 *
 * @category models
 * @since 4.0.0
 */
export class MissingKey extends Base {
  readonly _tag = "MissingKey"
  /**
   * The metadata for the issue.
   */
  readonly annotations: Schema.Annotations.Key<unknown> | undefined

  constructor(
    /**
     * The metadata for the issue.
     */
    annotations: Schema.Annotations.Key<unknown> | undefined
  ) {
    super()
    this.annotations = annotations
  }
}

/**
 * Represents a schema issue produced when an input object or tuple contains a key/index not
 * declared by the schema.
 *
 * **When to use**
 *
 * Use when you need to detect excess properties during strict struct/tuple
 * validation.
 *
 * **Details**
 *
 * - `ast` is the schema that was being validated against.
 * - `annotations` on `ast` may contain a custom `messageUnexpectedKey`.
 * - The default formatter renders this as `"Expected no excess property"`.
 *
 * @see {@link MissingKey} — the opposite case (required key absent)
 * @see {@link Pointer} — wraps this issue with the unexpected key's path
 *
 * @category models
 * @since 4.0.0
 */
export class UnexpectedKey extends Base {
  readonly _tag = "UnexpectedKey"
  /**
   * The schema that caused the issue.
   */
  readonly ast: SchemaAST.AST
  constructor(
    /**
     * The schema that caused the issue.
     */
    ast: SchemaAST.AST
  ) {
    super()
    this.ast = ast
  }
}

/**
 * Represents a schema issue that groups multiple child issues under a single schema node.
 *
 * **When to use**
 *
 * Use when you need to walk the issue tree for struct/tuple schemas that collect
 * all field errors rather than failing on the first.
 *
 * **Details**
 *
 * - `issues` is a non-empty readonly array (at least one child).
 * - Formatters flatten `Composite` by recursing into each child.
 *
 * @see {@link AnyOf} — used for union no-match errors (similar but different semantics)
 * @see {@link Pointer} — adds path context to individual issues
 *
 * @category models
 * @since 3.10.0
 */
export class Composite extends Base {
  readonly _tag = "Composite"
  /**
   * The schema that caused the issue.
   */
  readonly ast: SchemaAST.AST
  /**
   * The issues that occurred.
   */
  readonly issues: readonly [Issue, ...Array<Issue>]

  constructor(
    /**
     * The schema that caused the issue.
     */
    ast: SchemaAST.AST,
    /**
     * The issues that occurred.
     */
    issues: readonly [Issue, ...Array<Issue>]
  ) {
    super()
    this.ast = ast
    this.issues = issues
  }
}

/**
 * Represents a schema issue produced when the runtime type of the input does not match the type
 * expected by the schema.
 *
 * **When to use**
 *
 * Use when you need to detect basic type mismatches, such as a wrong primitive
 * or `null` where an object was expected.
 *
 * **Details**
 *
 * - `ast` is the schema node that expected a different type.
 * - The default formatter renders this as `"Expected <type>"`.
 *
 * **Example** (Formatting a type mismatch)
 *
 * ```ts import.meta.vitest
 * import { Schema, SchemaIssue } from "effect"
 *
 * const issue = new SchemaIssue.InvalidType(Schema.String.ast)
 * String(issue) // => "Expected string"
 * ```
 *
 * @see {@link InvalidValue} — the input has the right type but fails a value constraint
 *
 * @category models
 * @since 4.0.0
 */
export class InvalidType extends Base {
  readonly _tag = "InvalidType"
  /**
   * The schema that caused the issue.
   */
  readonly ast: SchemaAST.AST
  constructor(
    /**
     * The schema that caused the issue.
     */
    ast: SchemaAST.AST
  ) {
    super()
    this.ast = ast
  }
}

/**
 * Represents a schema issue produced when the input has the correct type but its value violates a
 * constraint (e.g. a string that is too short, a number out of range).
 *
 * **When to use**
 *
 * Use when you need to detect constraint violations from `Schema.filter`,
 * `Schema.minLength`, `Schema.greaterThan`, or similar checks.
 *
 * **Details**
 *
 * - `annotations` optionally carries a `message` string for formatting.
 * - The default formatter renders this as `"Expected a valid value"` unless a
 *   custom `message` annotation is provided.
 *
 * **Example** (Returning InvalidValue from a custom filter)
 *
 * ```ts import.meta.vitest
 * import { SchemaIssue } from "effect"
 *
 * const issue = new SchemaIssue.InvalidValue({ message: "must not be empty" })
 * String(issue) // => "must not be empty"
 * ```
 *
 * @see {@link InvalidType} — the input has the wrong type entirely
 * @see {@link Filter} — composite wrapper when a schema filter produces this issue
 *
 * @category models
 * @since 4.0.0
 */
export class InvalidValue extends Base {
  readonly _tag = "InvalidValue"
  /**
   * The metadata for the issue.
   */
  readonly annotations: Schema.Annotations.Issue | undefined

  constructor(
    annotations?: Schema.Annotations.Issue | undefined
  ) {
    super()
    this.annotations = annotations
  }
}

/**
 * Represents a schema issue produced when a forbidden operation is encountered during parsing,
 * such as an asynchronous Effect running inside `Schema.decodeUnknownSync`.
 *
 * **When to use**
 *
 * Use when you need to detect that a schema requires async execution but was run
 * synchronously.
 *
 * **Details**
 *
 * - `annotations` optionally carries a `message` string.
 * - The default formatter renders this as `"Forbidden operation"`.
 *
 * **Example** (Creating a Forbidden issue)
 *
 * ```ts import.meta.vitest
 * import { SchemaIssue } from "effect"
 *
 * const issue = new SchemaIssue.Forbidden(
 *   { message: "async operation not allowed in sync context" }
 * )
 * String(issue) // => "async operation not allowed in sync context"
 * ```
 *
 * @see {@link InvalidValue} — for value-constraint failures (not operation failures)
 *
 * @category models
 * @since 3.10.0
 */
export class Forbidden extends Base {
  readonly _tag = "Forbidden"
  /**
   * The metadata for the issue.
   */
  readonly annotations: Schema.Annotations.Issue | undefined

  constructor(
    /**
     * The metadata for the issue.
     */
    annotations: Schema.Annotations.Issue | undefined
  ) {
    super()
    this.annotations = annotations
  }
}

/**
 * Represents a schema issue produced when a value does not match *any* member of a union schema.
 *
 * **When to use**
 *
 * Use when you need to inspect which union members were attempted and why each
 * failed.
 *
 * **Details**
 *
 * - `ast` is the `Union` AST node.
 * - `issues` contains the per-member failures.
 *
 * **Gotchas**
 *
 * `issues` is empty when no union member was applicable. In that case, the
 * default formatter reports the expected type for the union.
 *
 * @see {@link OneOf} — the opposite: *too many* members matched
 * @see {@link Composite} — groups multiple issues under a non-union schema
 *
 * @category models
 * @since 4.0.0
 */
export class AnyOf extends Base {
  readonly _tag = "AnyOf"
  /**
   * The schema that caused the issue.
   */
  readonly ast: SchemaAST.Union
  /**
   * The issues that occurred.
   */
  readonly issues: ReadonlyArray<Issue>

  constructor(
    /**
     * The schema that caused the issue.
     */
    ast: SchemaAST.Union,
    /**
     * The issues that occurred.
     */
    issues: ReadonlyArray<Issue>
  ) {
    super()
    this.ast = ast
    this.issues = issues
  }
}

/**
 * Represents a schema issue produced when a value matches *multiple* members of a union that is
 * configured to allow exactly one match (oneOf mode).
 *
 * **When to use**
 *
 * Use when you need to detect ambiguous union matches when `oneOf` validation is
 * enabled.
 *
 * **Details**
 *
 * - `ast` is the `Union` AST node.
 * - `successes` lists the AST nodes of each member that accepted the input.
 * - The default formatter renders this as
 *   `"Expected exactly one member to match"`.
 *
 * @see {@link AnyOf} — the opposite: *no* members matched
 *
 * @category models
 * @since 4.0.0
 */
export class OneOf extends Base {
  readonly _tag = "OneOf"
  /**
   * The schema that caused the issue.
   */
  readonly ast: SchemaAST.Union
  /**
   * The schemas that were successful.
   */
  readonly successes: ReadonlyArray<SchemaAST.AST>

  constructor(
    /**
     * The schema that caused the issue.
     */
    ast: SchemaAST.Union,
    /**
     * The schemas that were successful.
     */
    successes: ReadonlyArray<SchemaAST.AST>
  ) {
    super()
    this.ast = ast
    this.successes = successes
  }
}

function makeFilterIssue(entry: Schema.FilterIssue): Issue {
  if (isIssue(entry)) {
    return entry
  }
  if (typeof entry === "string") {
    return new InvalidValue({ message: entry })
  }
  const inner = typeof entry.issue === "string"
    ? new InvalidValue({ message: entry.issue })
    : entry.issue
  return new Pointer(entry.path, inner)
}

/** @internal */
export function makeSingle(out: undefined | boolean | Schema.FilterIssue): Issue | undefined {
  if (out === undefined) {
    return undefined
  }
  if (typeof out === "boolean") {
    return out ? undefined : new InvalidValue()
  }
  return makeFilterIssue(out)
}

/** @internal */
export function normalizeFilterOutput(
  ast: SchemaAST.AST,
  out: Schema.FilterOutput
): Issue | undefined {
  if (Array.isArray(out)) {
    if (!Arr.isReadonlyArrayNonEmpty(out)) {
      return undefined
    }
    return out.length === 1
      ? makeFilterIssue(out[0])
      : new Composite(ast, Arr.map(out, makeFilterIssue))
  }
  return makeSingle(out as undefined | boolean | Schema.FilterIssue)
}

/**
 * A function type that converts an {@link Issue} into a formatted
 * representation. Specialisation of the generic `Formatter` from
 * `Formatter.ts` with `Value` fixed to `Issue`.
 *
 * @see {@link makeFormatterDefault} — creates a `Formatter<string>`
 * @see {@link makeFormatterStandardSchemaV1} — creates a `Formatter<StandardSchemaV1.FailureResult>`
 *
 * @category formatting
 * @since 4.0.0
 */
export interface Formatter<out Format> extends FormatterI<Issue, Format> {}

/**
 * Callback type used to format {@link Leaf} issues into strings.
 *
 * **When to use**
 *
 * Use when customizing how {@link makeFormatterStandardSchemaV1} renders
 * terminal issues.
 *
 * @see {@link defaultLeafHook} — the built-in implementation
 * @see {@link Leaf} — the union of terminal issue types
 *
 * @category formatting
 * @since 4.0.0
 */
export type LeafHook = (issue: Leaf) => string

/**
 * Returns the built-in {@link LeafHook} used by default formatters.
 *
 * **When to use**
 *
 * Use as the default leaf renderer when customizing only the {@link CheckHook}.
 *
 * **Details**
 *
 * - Checks for a `message` annotation first; returns it if present.
 * - Otherwise generates a default message per `_tag`:
 *   - `InvalidType` → `"Expected <type>"`
 *   - `InvalidValue` → `"Expected a valid value"`
 *   - `MissingKey` → `"Missing key"`
 *   - `UnexpectedKey` → `"Expected no excess property"`
 *   - `Forbidden` → `"Forbidden operation"`
 *   - `OneOf` → `"Expected exactly one member to match"`
 *
 * **Example** (Formatting Standard Schema issues with defaultLeafHook)
 *
 * ```ts import.meta.vitest
 * import { SchemaIssue } from "effect"
 *
 * const formatter = SchemaIssue.makeFormatterStandardSchemaV1({
 *   leafHook: SchemaIssue.defaultLeafHook
 * })
 * formatter(new SchemaIssue.MissingKey(undefined)) // => { issues: [{ path: [], message: "Missing key" }] }
 * ```
 *
 * @see {@link LeafHook}
 * @see {@link makeFormatterStandardSchemaV1}
 *
 * @category formatting
 * @since 4.0.0
 */
export const defaultLeafHook: LeafHook = (issue): string => {
  const message = findMessage(issue)
  if (message !== undefined) return message
  switch (issue._tag) {
    case "InvalidType":
      return getExpectedMessage(InternalAnnotations.getExpected(issue.ast))
    case "InvalidValue":
      return "Expected a valid value"
    case "MissingKey":
      return "Missing key"
    case "UnexpectedKey":
      return "Expected no excess property"
    case "Forbidden":
      return "Forbidden operation"
    case "OneOf":
      return "Expected exactly one member to match"
  }
}

/**
 * Callback type used to format {@link Filter} issues into strings.
 *
 * **When to use**
 *
 * Use when customizing how {@link makeFormatterStandardSchemaV1} renders
 * filter failures.
 *
 * **Details**
 *
 * - Returns `string` to override the message, or `undefined` to fall back to
 *   the default formatting.
 * - Built-in issues have no `actual` field.
 *
 * @see {@link defaultCheckHook} — the built-in implementation
 * @see {@link Filter} — the issue type this hook formats
 *
 * @category formatting
 * @since 4.0.0
 */
export type CheckHook = (issue: Filter) => string | undefined

/**
 * Returns the built-in {@link CheckHook} used by default formatters.
 *
 * **When to use**
 *
 * Use as the default filter renderer when customizing only the {@link LeafHook}.
 *
 * **Details**
 *
 * - Looks for a `message` annotation on the inner issue first, then on the
 *   filter itself.
 * - Returns `undefined` when no annotation is found, causing the formatter to
 *   fall back to `"Expected <filter>"`.
 *
 * @see {@link CheckHook}
 * @see {@link makeFormatterStandardSchemaV1}
 *
 * @category formatting
 * @since 4.0.0
 */
export const defaultCheckHook: CheckHook = (issue): string | undefined => {
  return findMessage(issue.issue) ?? findMessage(issue)
}

/**
 * Creates a {@link Formatter} that produces a `StandardSchemaV1.FailureResult`.
 *
 * **When to use**
 *
 * Use when you need schema parse errors in
 * [Standard Schema V1](https://github.com/standard-schema/standard-schema)
 * format, optionally customizing leaf or check issue rendering.
 *
 * **Details**
 *
 * - Returns a `Formatter<StandardSchemaV1.FailureResult>`.
 * - Each leaf issue is flattened into `{ message, path }` entries.
 * - `Pointer` paths are accumulated to produce full property paths.
 * - Falls back to {@link defaultLeafHook} / {@link defaultCheckHook} when no
 *   hooks are provided.
 *
 * **Example** (Creating a Standard Schema V1 formatter)
 *
 * ```ts import.meta.vitest
 * import { SchemaIssue } from "effect"
 *
 * const formatter = SchemaIssue.makeFormatterStandardSchemaV1()
 * formatter(new SchemaIssue.MissingKey(undefined)).issues[0].message // => "Missing key"
 * ```
 *
 * @see {@link makeFormatterDefault} — produces a plain string instead
 * @see {@link LeafHook}
 * @see {@link CheckHook}
 *
 * @category formatting
 * @since 4.0.0
 */
export function makeFormatterStandardSchemaV1(options?: {
  readonly leafHook?: LeafHook | undefined
  readonly checkHook?: CheckHook | undefined
}): Formatter<StandardSchemaV1.FailureResult> {
  return (issue) => ({
    issues: toDefaultIssues(issue, [], options?.leafHook ?? defaultLeafHook, options?.checkHook ?? defaultCheckHook)
  })
}

// A subtype of StandardSchemaV1.Issue
type DefaultIssue = {
  readonly message: string
  readonly path: ReadonlyArray<PropertyKey>
}

function getExpectedMessage(expected: string): string {
  return `Expected ${expected}`
}

function toDefaultIssues(
  issue: Issue,
  path: ReadonlyArray<PropertyKey>,
  leafHook: LeafHook,
  checkHook: CheckHook
): Array<DefaultIssue> {
  switch (issue._tag) {
    case "Filter": {
      const message = checkHook(issue)
      if (message !== undefined) {
        return [{ path, message }]
      }
      switch (issue.issue._tag) {
        case "InvalidValue":
          return [{
            path,
            message: getExpectedMessage(formatCheck(issue.filter))
          }]
        default:
          return toDefaultIssues(issue.issue, path, leafHook, checkHook)
      }
    }
    case "Encoding":
      return toDefaultIssues(issue.issue, path, leafHook, checkHook)
    case "Pointer":
      return toDefaultIssues(issue.issue, [...path, ...issue.path], leafHook, checkHook)
    case "Composite":
      return issue.issues.flatMap((issue) => toDefaultIssues(issue, path, leafHook, checkHook))
    case "AnyOf": {
      if (issue.issues.length === 0) {
        return [{
          path,
          message: findMessage(issue) ?? getExpectedMessage(InternalAnnotations.getExpected(issue.ast))
        }]
      }
      return issue.issues.flatMap((issue) => toDefaultIssues(issue, path, leafHook, checkHook))
    }
    default:
      return [{ path, message: leafHook(issue) }]
  }
}

function formatCheck<T>(check: SchemaAST.Check<T>): string {
  const expected = check.annotations?.expected
  if (typeof expected === "string") return expected

  switch (check._tag) {
    case "Filter":
      return "<filter>"
    case "FilterGroup":
      return check.checks.map((check) => formatCheck(check)).join(" & ")
  }
}

/**
 * Creates a {@link Formatter} that converts an {@link Issue} into a
 * human-readable multi-line string.
 *
 * **When to use**
 *
 * Use when you need to format a `SchemaIssue.Issue` as error messages for
 * logging, CLI output, or developer-facing diagnostics.
 *
 * **Details**
 *
 * This is the default formatter used by `SchemaIssue.toString()`.
 *
 * - Flattens the issue tree into `{ message, path }` entries using
 *   {@link defaultLeafHook} and {@link defaultCheckHook}.
 * - Each entry is rendered as `"<message>"` or `"<message>\n  at <path>"`.
 * - Multiple entries are joined with newlines.
 *
 * **Example** (Formatting an issue as a string)
 *
 * ```ts import.meta.vitest
 * import { SchemaIssue } from "effect"
 *
 * const formatter = SchemaIssue.makeFormatterDefault()
 * formatter(new SchemaIssue.MissingKey(undefined)) // => "Missing key"
 * ```
 *
 * @see {@link makeFormatterStandardSchemaV1} — produces Standard Schema V1 format instead
 * @see {@link Formatter}
 *
 * @category formatting
 * @since 4.0.0
 */
export function makeFormatterDefault(): Formatter<string> {
  return (issue) =>
    toDefaultIssues(issue, [], defaultLeafHook, defaultCheckHook)
      .map(formatDefaultIssue)
      .join("\n")
}

/** @internal */
export const defaultFormatter = makeFormatterDefault()

function formatDefaultIssue(issue: DefaultIssue): string {
  let out = issue.message
  if (issue.path && issue.path.length > 0) {
    const path = formatPath(issue.path as ReadonlyArray<PropertyKey>)
    out += `\n  at ${path}`
  }
  return out
}

function findMessage(issue: Issue): string | undefined {
  switch (issue._tag) {
    case "InvalidType":
    case "OneOf":
    case "Composite":
    case "AnyOf":
      return getMessageAnnotation(issue.ast.annotations)
    case "InvalidValue":
    case "Forbidden":
      return getMessageAnnotation(issue.annotations)
    case "MissingKey":
      return getMessageAnnotation(issue.annotations, "messageMissingKey")
    case "UnexpectedKey":
      return getMessageAnnotation(issue.ast.annotations, "messageUnexpectedKey")
    case "Filter":
      return getMessageAnnotation(issue.filter.annotations)
    case "Encoding":
      return findMessage(issue.issue)
  }
}

function getMessageAnnotation(
  annotations: Schema.Annotations.Annotations | undefined,
  type: "message" | "messageMissingKey" | "messageUnexpectedKey" = "message"
): string | undefined {
  const message = annotations?.[type]
  if (typeof message === "string") return message
}
