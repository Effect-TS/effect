/**
 * Decides which `/`-separated, root-relative paths to keep with an ordered
 * list of exclusion and inclusion rules, without accessing the file system.
 * Pass a `PathFilter`, a pattern or a list of patterns and rules to
 * `FileSystem.glob` to find the paths it keeps, or build one from ignore files
 * with `IgnoreFile`.
 *
 * **Details**
 *
 * Every rule applies to the paths strictly below its `scope` directory and
 * matches them relative to it. When several rules match a path, the last one
 * wins, except that nothing inside a directory decided by a `barrier`
 * exclusion can be included again. A rule's `subtree` says what matching a
 * directory means for the paths inside it:
 *
 * - `barrier`: if the rule decides the directory, every path inside is
 *   excluded by it, as with Git exclusions.
 * - `inherit`: if the match changed the directory's result at that point in
 *   rule order, it also counts for every path inside, and later rules can
 *   still override it, as with Docker rules. A match that repeats the result
 *   so far, such as the second `d` in `d`, `!d/keep`, `d`, does not.
 * - `self`: the paths inside are left to their own rules, as with Git `!`
 *   inclusions.
 *
 * A path no rule decides gets the filter's `default`. Filters built from
 * rules or ignore files keep such paths; {@link select} builds a selection,
 * which drops them. {@link restrict} combines a selection with ignore rules,
 * so that a path must pass both.
 *
 * **Gotchas**
 *
 * {@link match} treats every ancestor of a path as a directory. `FileSystem.glob`
 * uses each entry's own type instead, so there a link to a directory never
 * matches a `directoryOnly` rule.
 *
 * @stability unstable
 * @since 4.0.0
 */
import { format } from "./Formatter.ts"
import { dual } from "./Function.ts"
import { type Inspectable, NodeInspectSymbol } from "./Inspectable.ts"
import * as Glob from "./internal/glob.ts"
import * as Engine from "./internal/pathFilter.ts"
import { type Pipeable, pipeArguments } from "./Pipeable.ts"

const TypeId = Engine.TypeId

/**
 * An ordered list of rules that decides which paths to exclude.
 *
 * **Details**
 *
 * Later rules take precedence, subject to ancestor barriers, and `default`
 * decides the paths no rule matches. `restrictions` holds the further
 * filters added by {@link restrict}, which a path must also pass. Test paths
 * with {@link match} or {@link excludes}, or pass the filter to
 * `FileSystem.glob`.
 *
 * @see {@link make} for building a filter from rules
 * @see {@link select} for building a selection
 * @see {@link concat} for combining rules
 * @see {@link restrict} for intersecting filters
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface PathFilter extends Pipeable, Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly rules: ReadonlyArray<Rule>
  /** The result for a path no rule decides. */
  readonly default: "include" | "exclude"
  /** Further filters a path must also pass, added by {@link restrict}. */
  readonly restrictions: ReadonlyArray<PathFilter>
}

/**
 * Decides whether a rule matches a path relative to the rule's scope.
 *
 * **Details**
 *
 * `match` receives a `/`-separated path without empty or `.` segments, and
 * whether the path is a directory. `matchesBelow` is an optional hint for
 * skipping directories: returning `false` for a directory, given without a
 * trailing `/` and as `""` for the scope itself, promises that `match`
 * accepts no strict descendant of it, file or directory. Without the hint,
 * every directory may contain a match.
 *
 * **Gotchas**
 *
 * Both functions must be deterministic, and a hint must never return `false`
 * where a descendant matches; otherwise `FileSystem.glob` may skip results.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface PathMatcher {
  readonly match: (path: string, directory: boolean) => boolean
  readonly matchesBelow?: ((directory: string) => boolean) | undefined
}

/**
 * A rule that excludes the paths its matcher accepts.
 *
 * **Details**
 *
 * `directoryOnly` restricts the rule to directories, `scope` holds the
 * segments of the directory the rule applies below, and `subtree` says what
 * matching a directory means for the paths inside it.
 *
 * @see {@link exclude} for creating one
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ExcludeRule {
  readonly _tag: "Exclude"
  readonly matcher: PathMatcher
  readonly directoryOnly: boolean
  readonly scope: ReadonlyArray<string>
  readonly subtree: "barrier" | "inherit" | "self"
}

/**
 * A rule that includes the paths its matcher accepts, overriding earlier
 * rules.
 *
 * **Details**
 *
 * The fields mean the same as on {@link ExcludeRule}. An inclusion cannot be a
 * barrier.
 *
 * @see {@link include} for creating one
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface IncludeRule {
  readonly _tag: "Include"
  readonly matcher: PathMatcher
  readonly directoryOnly: boolean
  readonly scope: ReadonlyArray<string>
  readonly subtree: "inherit" | "self"
}

/**
 * An exclusion or inclusion rule of a {@link PathFilter}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Rule = ExcludeRule | IncludeRule

/**
 * The result of evaluating a path: `None` when no rule decides it, otherwise
 * the deciding `rule` as it was passed in.
 *
 * @see {@link match} for computing one
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Match =
  | { readonly _tag: "None" }
  | { readonly _tag: "Exclude"; readonly rule: Rule }
  | { readonly _tag: "Include"; readonly rule: Rule }

const PathFilterProto = {
  [TypeId]: TypeId,
  toJSON(this: PathFilter): unknown {
    return {
      _id: "PathFilter",
      rules: this.rules.map(({ _tag, directoryOnly, scope, subtree }) => ({ _tag, directoryOnly, scope, subtree })),
      default: this.default,
      restrictions: this.restrictions.map((restriction) => restriction.toJSON())
    }
  },
  toString(this: PathFilter) {
    return `PathFilter(${format(this.toJSON())})`
  },
  [NodeInspectSymbol](this: PathFilter) {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Checks whether a value is a {@link PathFilter}.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isPathFilter = (u: unknown): u is PathFilter => Engine.isFilter(u)

/**
 * Values accepted wherever a filter is expected: a filter, a pattern, or a
 * list of patterns and rules.
 *
 * **Details**
 *
 * A string is a pattern that includes paths, or excludes them after a leading
 * `!`. As soon as an input holds one including string it is a selection,
 * which drops the paths no rule decides; otherwise it keeps them.
 *
 * @see {@link fromInput} for converting inputs
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Input = PathFilter | string | Iterable<string | Rule>

/**
 * Creates a filter from rules, with later rules taking precedence.
 *
 * **Details**
 *
 * Paths no rule decides are kept.
 *
 * **Example** (Including a file inside an excluded directory)
 *
 * ```ts import.meta.vitest
 * import { PathFilter } from "effect"
 *
 * const filter = PathFilter.make([
 *   PathFilter.exclude("dist", { subtree: "inherit" }),
 *   PathFilter.include("dist/index.d.ts")
 * ])
 *
 * PathFilter.excludes(filter, "dist/index.js") // => true
 * PathFilter.excludes(filter, "dist/index.d.ts") // => false
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (rules: Iterable<Rule>): PathFilter => makeFilter(Array.from(rules), "include", [])

const makeFilter = (
  rules: ReadonlyArray<Rule>,
  defaultResult: "include" | "exclude",
  restrictions: ReadonlyArray<PathFilter>
): PathFilter => {
  const self = Object.create(PathFilterProto)
  self.rules = rules
  self.default = defaultResult
  self.restrictions = restrictions
  return self
}

/**
 * A filter without rules, which keeps every path.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const empty: PathFilter = make([])

/**
 * Converts an {@link Input} into a `PathFilter`.
 *
 * **Details**
 *
 * Filters are returned unchanged, keeping their default. Strings become
 * {@link include} rules, whose wildcards skip names that start with `.`, or
 * {@link exclude} rules after a leading `!`, which match those names; write
 * `\!` for a literal `!`. An input with at least one including string drops
 * the paths no rule decides, as with {@link select}. Any other input keeps
 * them, as with {@link make}.
 *
 * **Gotchas**
 *
 * An invalid pattern is a defect, as in {@link exclude}.
 *
 * **Example** (Converting patterns and rules)
 *
 * ```ts import.meta.vitest
 * import { PathFilter } from "effect"
 *
 * const sources = PathFilter.fromInput(["src/**\/*.ts", "!**\/*.test.ts"])
 * const ignored = PathFilter.fromInput([PathFilter.exclude("dist")])
 *
 * PathFilter.excludes(sources, "README.md") // => true
 * PathFilter.excludes(ignored, "README.md") // => false
 * PathFilter.fromInput(ignored) === ignored // => true
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromInput = (input: Input): PathFilter => {
  if (isPathFilter(input)) {
    return input
  }
  const items = typeof input === "string" ? [input] : Array.from(input)
  const selects = items.some((item) => typeof item === "string" && !item.startsWith("!"))
  return makeFilter(toRules(items, false), selects ? "exclude" : "include", [])
}

/**
 * Creates a filter that keeps only the paths its rules include.
 *
 * **Details**
 *
 * A path no rule decides is excluded. Strings are patterns that include
 * paths, or exclude them after a leading `!`; write `\!` for a literal `!`.
 * `dot` says whether the wildcards of include strings match names that start
 * with `.`, and defaults to `false`. `!` strings and rules match those names
 * unless built with `dot: false`.
 *
 * **Example** (Selecting source files)
 *
 * ```ts import.meta.vitest
 * import { PathFilter } from "effect"
 *
 * const sources = PathFilter.select(["src/**\/*.ts", "!**\/*.test.ts"])
 *
 * PathFilter.excludes(sources, "src/index.ts") // => false
 * PathFilter.excludes(sources, "src/index.test.ts") // => true
 * PathFilter.excludes(sources, "README.md") // => true
 * PathFilter.excludes(sources, "src/.cache/x.ts") // => true
 * ```
 *
 * @see {@link restrict} for removing ignored paths from a selection
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const select = (rules: string | Iterable<string | Rule>, options?: {
  /** Whether the wildcards of include strings match names that start with `.`. */
  readonly dot?: boolean | undefined
}): PathFilter =>
  makeFilter(toRules(typeof rules === "string" ? [rules] : Array.from(rules), options?.dot ?? false), "exclude", [])

const toRules = (items: ReadonlyArray<string | Rule>, dot: boolean): Array<Rule> =>
  items.map((item) =>
    typeof item !== "string" ? item : item.startsWith("!") ? exclude(item.slice(1)) : include(item, { dot })
  )

// The `PathMatcher` overload lets `{ match: (path) => ... }` infer `path`,
// which a `string | PathMatcher` parameter cannot, since `String` has `match`.
interface RuleOptions<Subtree> {
  /** Whether the rule only matches directories. */
  readonly directoryOnly?: boolean | undefined
  /** The directory the rule applies below, relative to the root. */
  readonly scope?: string | undefined
  /** What matching a directory means for the paths inside it. */
  readonly subtree?: Subtree | undefined
  /** Whether wildcards in a string pattern match names that start with `.`. */
  readonly dot?: boolean | undefined
}

const toMatcher = (pattern: string | PathMatcher, dot: boolean | undefined): PathMatcher => {
  if (typeof pattern !== "string") {
    return pattern
  }
  if (!Glob.isRelativePattern(pattern, false)) {
    throw new Error(`PathFilter patterns must be relative, without ".." segments or escaped "/": ${pattern}`)
  }
  return Glob.pathMatcher(Glob.compile([pattern], dot ?? true))
}

/**
 * Creates a rule that excludes the paths matching a pattern.
 *
 * **Details**
 *
 * A string pattern uses `Glob` syntax and is anchored at the scope, so
 * `*.log` matches only directly inside it and `**\/*.log` at any depth.
 * Wildcards match names that start with `.` unless `dot` is `false`. A
 * `PathMatcher` is used as is, and `dot` does not apply to it.
 *
 * `scope` is a `/`-separated directory relative to the root, defaulting to
 * the root. `subtree` defaults to `"barrier"`, so nothing inside an excluded
 * directory can be included again; use `"inherit"` to allow later inclusions
 * there, or `"self"` to leave the paths inside undecided.
 *
 * **Gotchas**
 *
 * An absolute pattern, a pattern with a `..` segment or an escaped `/`, and a
 * scope with an empty, `.` or `..` segment are defects. A pattern naming only
 * the root, such as `.`, never matches.
 *
 * **Example** (Choosing what an excluded directory means for its contents)
 *
 * ```ts import.meta.vitest
 * import { PathFilter } from "effect"
 *
 * const keep = PathFilter.include("logs/keep.log")
 * const barrier = PathFilter.make([PathFilter.exclude("logs"), keep])
 * const inherit = PathFilter.make([PathFilter.exclude("logs", { subtree: "inherit" }), keep])
 *
 * PathFilter.excludes(barrier, "logs/keep.log") // => true
 * PathFilter.excludes(inherit, "logs/keep.log") // => false
 * PathFilter.excludes(inherit, "logs/debug.log") // => true
 * ```
 *
 * @see {@link include} for the opposite rule
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const exclude: {
  (pattern: PathMatcher, options?: RuleOptions<ExcludeRule["subtree"]>): ExcludeRule
  (pattern: string | PathMatcher, options?: RuleOptions<ExcludeRule["subtree"]>): ExcludeRule
} = (pattern: string | PathMatcher, options?: RuleOptions<ExcludeRule["subtree"]>): ExcludeRule => ({
  _tag: "Exclude",
  matcher: toMatcher(pattern, options?.dot),
  directoryOnly: options?.directoryOnly ?? false,
  scope: Engine.splitScope(options?.scope ?? ""),
  subtree: options?.subtree ?? "barrier"
})

/**
 * Creates a rule that includes the paths matching a pattern, overriding
 * earlier rules.
 *
 * **Details**
 *
 * Patterns, `scope` and `dot` work as in {@link exclude}. `subtree` defaults
 * to `"self"`, so including a directory does not include the paths inside it.
 * With `"inherit"`, they are included too if the inclusion changed the
 * directory's result, unless a later rule overrides it; including a directory
 * that was already included passes nothing down.
 *
 * **Gotchas**
 *
 * An inclusion cannot override a `barrier` exclusion of an ancestor
 * directory. An absolute pattern, a pattern with a `..` segment or an escaped
 * `/`, and a scope with an empty, `.` or `..` segment are defects.
 *
 * @see {@link exclude} for the opposite rule
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const include: {
  (pattern: PathMatcher, options?: RuleOptions<IncludeRule["subtree"]>): IncludeRule
  (pattern: string | PathMatcher, options?: RuleOptions<IncludeRule["subtree"]>): IncludeRule
} = (pattern: string | PathMatcher, options?: RuleOptions<IncludeRule["subtree"]>): IncludeRule => ({
  _tag: "Include",
  matcher: toMatcher(pattern, options?.dot),
  directoryOnly: options?.directoryOnly ?? false,
  scope: Engine.splitScope(options?.scope ?? ""),
  subtree: options?.subtree ?? "self"
})

/**
 * Combines the rules of two filters, with the rules of `that` taking
 * precedence.
 *
 * **Details**
 *
 * Either side may be any {@link Input}. Both must have the same `default`,
 * which the result keeps, so two selections combine into one selection.
 *
 * **Gotchas**
 *
 * Combining filters with different defaults, or a filter that has
 * restrictions, is a defect. Use {@link restrict} to remove ignored paths from
 * a selection; in a single list, an ignore file's `!` lines would add paths to
 * it.
 *
 * **Example** (Layering a nested filter)
 *
 * ```ts import.meta.vitest
 * import { PathFilter } from "effect"
 *
 * const root = PathFilter.make([PathFilter.exclude("**\/*.log")])
 * const nested = PathFilter.make([PathFilter.include("keep.log", { scope: "logs" })])
 * const filter = PathFilter.concat(root, nested)
 *
 * PathFilter.excludes(filter, "logs/keep.log") // => false
 * PathFilter.excludes(filter, "keep.log") // => true
 * ```
 *
 * @stability unstable
 * @category combining
 * @since 4.0.0
 */
export const concat: {
  (that: Input): (self: Input) => PathFilter
  (self: Input, that: Input): PathFilter
} = dual(2, (self: Input, that: Input): PathFilter => {
  const left = fromInput(self)
  const right = fromInput(that)
  if (left.restrictions.length > 0 || right.restrictions.length > 0) {
    throw new Error("PathFilter.concat cannot combine restricted filters; restrict the combined rules instead")
  }
  if (left.default !== right.default) {
    throw new Error(
      `PathFilter.concat requires filters with the same default, not ${left.default} and ${right.default}`
    )
  }
  return makeFilter([...left.rules, ...right.rules], left.default, [])
})

/**
 * Keeps the paths that `self` keeps and `by` does not exclude.
 *
 * **Details**
 *
 * Either side may be any {@link Input}. The two are evaluated separately, so
 * an inclusion in `by`, such as a `!keep.log` line in an ignore file, cannot
 * add a path `self` drops. Restrictions nest: every one of them must keep a
 * path. The curried form is `restrict(by)(self)`.
 *
 * **Example** (Selecting files that are not ignored)
 *
 * ```ts import.meta.vitest
 * import { IgnoreFile, PathFilter } from "effect"
 *
 * const ignored = IgnoreFile.gitignore("*.log\n!keep.log\n")
 * const filter = PathFilter.restrict("**\/*.ts", ignored)
 *
 * PathFilter.excludes(filter, "src/index.ts") // => false
 * PathFilter.excludes(filter, "keep.log") // => true
 * ```
 *
 * @see {@link select} for building a selection
 *
 * @stability unstable
 * @category combining
 * @since 4.0.0
 */
export const restrict: {
  (by: Input): (self: Input) => PathFilter
  (self: Input, by: Input): PathFilter
} = dual(2, (self: Input, by: Input): PathFilter => {
  const left = fromInput(self)
  const right = fromInput(by)
  const head = right.restrictions.length === 0 ? right : makeFilter(right.rules, right.default, [])
  return makeFilter(left.rules, left.default, [...left.restrictions, head, ...right.restrictions])
})

const none: Match = { _tag: "None" }

const segmentsOf = (path: string): Array<string> => {
  const segments: Array<string> = []
  for (const segment of path.split("/")) {
    if (segment === "..") {
      throw new Error(`PathFilter paths must not contain ".." segments: ${path}`)
    }
    if (segment !== "" && segment !== ".") {
      segments.push(segment)
    }
  }
  return segments
}

/**
 * Evaluates a `/`-separated path relative to the root and returns the rule
 * that decides it.
 *
 * **Details**
 *
 * `None` means no rule decided the path, which then gets the filter's
 * `default`. For a restricted filter, the last restriction that excludes the
 * path decides it, even through its default, and otherwise the filter itself
 * does.
 *
 * Empty and `.` segments are dropped, so a trailing `/` does not mark a
 * directory; pass `directory: true` instead. Every ancestor of the path is
 * treated as a directory.
 *
 * **Gotchas**
 *
 * A path with a `..` segment is a defect.
 *
 * **Example** (Finding the deciding rule)
 *
 * ```ts import.meta.vitest
 * import { PathFilter } from "effect"
 *
 * const logs = PathFilter.exclude("**\/*.log")
 * const keep = PathFilter.include("logs/keep.log")
 * const filter = PathFilter.make([logs, keep])
 *
 * PathFilter.match(filter, "logs/debug.log") // => { _tag: "Exclude", rule: logs }
 * PathFilter.match(filter, "logs/keep.log") // => { _tag: "Include", rule: keep }
 * PathFilter.match(filter, "src/index.ts") // => { _tag: "None" }
 * ```
 *
 * @see {@link excludes} for a boolean result
 *
 * @stability unstable
 * @category getters
 * @since 4.0.0
 */
export const match: {
  (path: string, options?: {
    /** Whether the path is a directory. */
    readonly directory?: boolean | undefined
  }): (self: PathFilter) => Match
  (self: PathFilter, path: string, options?: {
    /** Whether the path is a directory. */
    readonly directory?: boolean | undefined
  }): Match
} = dual(
  (args) => isPathFilter(args[0]),
  (self: PathFilter, path: string, options?: { readonly directory?: boolean | undefined }): Match => {
    const segments = segmentsOf(path)
    const directory = options?.directory ?? false
    // the last restriction that excludes the path decides it, then `self`
    for (let i = self.restrictions.length - 1; i >= 0; i--) {
      const restriction = self.restrictions[i]
      const evaluator = Engine.evaluator(restriction)
      const decision = Engine.evaluate(evaluator, segments, directory)
      if (evaluator.excluded(decision)) {
        return toMatch(restriction, decision)
      }
    }
    return toMatch(self, Engine.evaluate(Engine.evaluator(self), segments, directory))
  }
)

const toMatch = (filter: PathFilter, decision: number): Match => {
  if (decision < 0) {
    return none
  }
  const rule = filter.rules[decision]
  return rule._tag === "Exclude" ? { _tag: "Exclude", rule } : { _tag: "Include", rule }
}

/**
 * Tests whether a filter excludes a `/`-separated path relative to the root.
 *
 * **Details**
 *
 * A path is excluded when the filter or one of its restrictions excludes it,
 * applying each one's `default` to paths no rule decides. Paths are read as
 * in {@link match}: pass `directory: true` for a directory, and every
 * ancestor is treated as a directory.
 *
 * **Example** (Testing directories)
 *
 * ```ts import.meta.vitest
 * import { PathFilter, pipe } from "effect"
 *
 * const filter = PathFilter.make([PathFilter.exclude("build", { directoryOnly: true })])
 *
 * PathFilter.excludes(filter, "build") // => false
 * PathFilter.excludes(filter, "build", { directory: true }) // => true
 * pipe(filter, PathFilter.excludes("build/out.js")) // => true
 * ```
 *
 * @see {@link match} for the deciding rule
 *
 * @stability unstable
 * @category predicates
 * @since 4.0.0
 */
export const excludes: {
  (path: string, options?: {
    /** Whether the path is a directory. */
    readonly directory?: boolean | undefined
  }): (self: PathFilter) => boolean
  (self: PathFilter, path: string, options?: {
    /** Whether the path is a directory. */
    readonly directory?: boolean | undefined
  }): boolean
} = dual(
  (args) => isPathFilter(args[0]),
  (self: PathFilter, path: string, options?: { readonly directory?: boolean | undefined }): boolean => {
    const segments = segmentsOf(path)
    const directory = options?.directory ?? false
    return Engine.leaves(self).some((leaf) => {
      const evaluator = Engine.evaluator(leaf)
      return evaluator.excluded(Engine.evaluate(evaluator, segments, directory))
    })
  }
)
