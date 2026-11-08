import type { PathFilter, PathMatcher, Rule } from "../PathFilter.ts"
import { hasProperty } from "../Predicate.ts"

/** @internal */
export const TypeId = "~effect/PathFilter"

/** @internal */
export const isFilter = (u: unknown): u is PathFilter => hasProperty(u, TypeId)

/**
 * Incremental evaluation of one matcher: the walk steps each rule's state one
 * path segment at a time instead of rematching the whole path.
 *
 * @internal
 */
export interface Incremental<S> {
  /** The state at the rule's scope directory. */
  readonly initial: S
  readonly step: (state: S, name: string) => S
  /**
   * Like `step`, but only through explicit segments: the result never
   * reaches below a link to a directory through `**`. A matcher without it
   * never follows such links.
   */
  readonly stepExplicit?: ((state: S, name: string) => S) | undefined
  readonly accepts: (state: S, directory: boolean) => boolean
  /** `false` when no strict descendant of the state's directory can match. */
  readonly matchesBelow: (state: S) => boolean
  /**
   * The only child names that can lead to a match, when there are finitely
   * many, so the walk can probe them instead of listing the directory.
   */
  readonly literals?: ((state: S) => ReadonlyArray<string> | undefined) | undefined
  /** Whether `accepts` depends on `directory`. */
  readonly directory: boolean
}

/**
 * Splits a `/`-separated scope into segments; an empty, `.` or `..` segment
 * is a defect.
 *
 * @internal
 */
export const splitScope = (scope: string): Array<string> => {
  if (scope === "") {
    return []
  }
  const segments = scope.split("/")
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new Error(`PathFilter scope must not contain empty, "." or ".." segments: ${scope}`)
    }
  }
  return segments
}

const incrementals = new WeakMap<PathMatcher, Incremental<any>>()

/**
 * Registers how to evaluate `matcher` incrementally. The incremental form
 * must agree with `match` and `matchesBelow`.
 *
 * @internal
 */
export const register = <M extends PathMatcher, S>(matcher: M, incremental: Incremental<S>): M => {
  incrementals.set(matcher, incremental)
  return matcher
}

/**
 * Evaluates a matcher against scope-relative path strings.
 *
 * @internal
 */
export const fromMatcher = (matcher: PathMatcher, directory = true): Incremental<string> => ({
  initial: "",
  step: (path, name) => path === "" ? name : `${path}/${name}`,
  accepts: (path, isDirectory) => matcher.match(path, isDirectory),
  matchesBelow: (path) => matcher.matchesBelow === undefined || matcher.matchesBelow(path),
  directory
})

// A rule's position relative to its scope: `depth` scope segments entered,
// where `depth === scope.length` is the scope directory itself.
class Pending {
  readonly depth: number
  constructor(depth: number) {
    this.depth = depth
  }
}

// Disjoint from the scope, or below a link the rule may not follow: the rule
// can never apply below.
const outside = new Pending(-1)

// An inherited baseline dropped below a link: the children start excluded,
// whatever the filter's default.
const linkBaseline = -2

interface CompiledRule {
  readonly include: boolean
  readonly inherit: boolean
  readonly barrier: boolean
  readonly directoryOnly: boolean
  readonly scope: ReadonlyArray<string>
  readonly incremental: Incremental<any>
  readonly pending: ReadonlyArray<Pending>
}

/**
 * The evaluation state of one directory.
 *
 * @internal
 */
export interface State {
  /** Each rule's matcher state, or its position relative to its scope. */
  readonly rules: ReadonlyArray<unknown>
  /**
   * The highest-indexed `inherit` hit passed down to this directory's
   * children, -1 for the filter's default, or -2 for an exclusion.
   */
  readonly inherited: number
  /** The barrier exclusion that decided this directory or an ancestor, or -1. */
  readonly barrier: number
}

/**
 * What the rules allow below a directory.
 *
 * @internal
 */
export interface Below {
  /** Whether no strict descendant can be anything but excluded. */
  readonly prune: boolean
  /**
   * Whether a rule reaches below on its own, rather than the filter's default
   * keeping the descendants. Below a link, only such a rule follows it.
   */
  readonly reached: boolean
  /** The only child names that can be kept, or `undefined` to list. */
  readonly candidates: ReadonlyArray<string> | undefined
}

/**
 * The evaluation of one entry.
 *
 * @internal
 */
export interface Visit extends Below {
  /** The state for the entry's children. */
  readonly state: State
  /** The index of the deciding rule, or a negative number for none. */
  readonly decision: number
  readonly excluded: boolean
}

/** @internal */
export interface Evaluator {
  readonly initial: State
  /** What the rules allow below the root. */
  readonly root: Below
  /** Whether any rule depends on whether an entry is a directory. */
  readonly needsDirectory: boolean
  /**
   * Steps into `name`. `directory` is the entry's own kind; `link` marks a
   * link to a directory, whose children only rules reaching it through
   * explicit segments may keep.
   */
  readonly step: (state: State, name: string, directory: boolean, link: boolean) => Visit
  readonly excluded: (decision: number) => boolean
}

const compileRule = (rule: Rule): CompiledRule => {
  const pending: Array<Pending> = []
  for (let depth = 0; depth <= rule.scope.length; depth++) {
    pending.push(new Pending(depth))
  }
  return {
    include: rule._tag === "Include",
    inherit: rule.subtree === "inherit",
    barrier: rule.subtree === "barrier",
    directoryOnly: rule.directoryOnly,
    scope: rule.scope,
    incremental: incrementals.get(rule.matcher) ?? fromMatcher(rule.matcher),
    pending
  }
}

const advance = (rule: CompiledRule, state: unknown, name: string, explicit: boolean): unknown => {
  const step = explicit ? rule.incremental.stepExplicit : rule.incremental.step
  if (!(state instanceof Pending)) {
    return step === undefined ? outside : step(state, name)
  }
  if (state === outside) {
    return outside
  }
  if (state.depth < rule.scope.length) {
    return rule.scope[state.depth] === name ? rule.pending[state.depth + 1] : outside
  }
  return step === undefined ? outside : step(rule.incremental.initial, name)
}

const accepted = (rule: CompiledRule, state: unknown, directory: boolean): boolean =>
  !(state instanceof Pending) && (directory || !rule.directoryOnly) && rule.incremental.accepts(state, directory)

// Whether the rule may match a strict descendant of the state's directory
const reachable = (rule: CompiledRule, state: unknown): boolean => {
  if (!(state instanceof Pending)) {
    return rule.incremental.matchesBelow(state)
  }
  if (state === outside) {
    return false
  }
  return state.depth < rule.scope.length || rule.incremental.matchesBelow(rule.incremental.initial)
}

// The child names through which the rule can match, if finitely many
const literals = (rule: CompiledRule, state: unknown): ReadonlyArray<string> | undefined => {
  if (state instanceof Pending && state.depth < rule.scope.length) {
    return [rule.scope[state.depth]]
  }
  return rule.incremental.literals?.(state instanceof Pending ? rule.incremental.initial : state)
}

const isUnlisted = (name: string): boolean => name === "." || name === ".."

const prunedBelow: Below = { prune: true, reached: false, candidates: [] }

const make = (rules: ReadonlyArray<Rule>, defaultExcluded: boolean): Evaluator => {
  const compiled = rules.map(compileRule)
  const excluded = (decision: number): boolean =>
    decision >= 0 ? !compiled[decision].include : decision === linkBaseline || defaultExcluded

  // Descendants start from `inherited`. An included baseline keeps them, so
  // the directory must be listed; an excluded one only gives way to a later
  // inclusion that can match below.
  const below = (states: ReadonlyArray<unknown>, inherited: number): Below => {
    if (!excluded(inherited)) {
      return { prune: false, reached: inherited >= 0, candidates: undefined }
    }
    let reached = false
    let candidates: Array<string> | undefined = []
    for (let i = Math.max(inherited + 1, 0); i < compiled.length; i++) {
      const rule = compiled[i]
      if (!rule.include || !reachable(rule, states[i])) {
        continue
      }
      reached = true
      const names: ReadonlyArray<string> | undefined = candidates && literals(rule, states[i])
      candidates = names && candidates!.concat(names.filter((name) => !isUnlisted(name)))
    }
    return { prune: !reached, reached, candidates: reached ? candidates : [] }
  }

  const step = (state: State, name: string, directory: boolean, link: boolean): Visit => {
    if (state.barrier !== -1) {
      return { state, decision: state.barrier, excluded: true, ...prunedBelow }
    }
    const next = new Array<unknown>(compiled.length)
    let decision = state.inherited
    let inherited = state.inherited
    for (let i = 0; i < compiled.length; i++) {
      const rule = compiled[i]
      const value = advance(rule, state.rules[i], name, false)
      next[i] = value
      if (accepted(rule, value, directory)) {
        // A fresh `inherit` hit passes down only if it changes the running
        // decision, as BuildKit's `MatchesUsingParentResults` does. Here
        // `decision` is the highest hit below `i`.
        if (rule.inherit && i > inherited && rule.include === excluded(decision)) {
          inherited = i
        }
        // `i` only grows, but an inherited hit may outrank it
        if (i > decision) {
          decision = i
        }
      }
    }
    const rule = compiled[decision]
    const isExcluded = excluded(decision)
    if (isExcluded && rule?.barrier) {
      return { state: { rules: next, inherited, barrier: decision }, decision, excluded: true, ...prunedBelow }
    }
    let children: ReadonlyArray<unknown> = next
    if (link) {
      // Inclusions follow the link only through explicit segments, exclusions
      // keep applying to every path
      children = compiled.map((rule, i) => rule.include ? advance(rule, state.rules[i], name, true) : next[i])
      // An inherited inclusion passes into the link only from an explicit hit
      // on the link itself
      if (
        inherited >= 0 && compiled[inherited].include &&
        !(inherited !== state.inherited && accepted(compiled[inherited], children[inherited], directory))
      ) {
        inherited = linkBaseline
      }
    }
    return {
      state: { rules: children, inherited, barrier: -1 },
      decision,
      excluded: isExcluded,
      ...below(children, inherited)
    }
  }

  const initial: State = { rules: compiled.map((rule) => rule.pending[0]), inherited: -1, barrier: -1 }
  return {
    initial,
    root: below(initial.rules, -1),
    needsDirectory: compiled.some((rule) => rule.directoryOnly || rule.incremental.directory),
    step,
    excluded
  }
}

const evaluators = new WeakMap<object, Evaluator>()

/**
 * The evaluator for a rule filter, built once per filter. Restrictions are
 * evaluated as separate filters.
 *
 * @internal
 */
export const evaluator = (filter: PathFilter): Evaluator => {
  let evaluator = evaluators.get(filter)
  if (evaluator === undefined) {
    evaluator = make(filter.rules, filter.default === "exclude")
    evaluators.set(filter, evaluator)
  }
  return evaluator
}

/**
 * The rule filters a path must pass: the filter itself, then its
 * restrictions.
 *
 * @internal
 */
export const leaves = (filter: PathFilter): ReadonlyArray<PathFilter> => [filter, ...filter.restrictions]

/**
 * Evaluates root-relative segments, treating every ancestor as a directory,
 * and returns the deciding rule's index, or a negative number for none.
 *
 * @internal
 */
export const evaluate = (
  evaluator: Evaluator,
  segments: ReadonlyArray<string>,
  directory: boolean
): number => {
  let state = evaluator.initial
  let decision = -1
  for (let i = 0; i < segments.length; i++) {
    const visit = evaluator.step(state, segments[i], i < segments.length - 1 || directory, false)
    decision = visit.decision
    if (visit.state.barrier !== -1) {
      return decision
    }
    state = visit.state
  }
  return decision
}
