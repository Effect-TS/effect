import type { Input, PathMatcher, Rule } from "../PathFilter.ts"
import { hasProperty } from "../Predicate.ts"

/** @internal */
export const TypeId = "~effect/PathFilter"

/** @internal */
export const isFilter = (u: unknown): u is { readonly [TypeId]: typeof TypeId; readonly rules: ReadonlyArray<Rule> } =>
  hasProperty(u, TypeId)

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
  readonly accepts: (state: S, directory: boolean) => boolean
  /** `false` when no strict descendant of the state's directory can match. */
  readonly matchesBelow: (state: S) => boolean
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

// Disjoint from the scope: the rule can never apply below.
const outside = new Pending(-1)

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
   * children, or -1.
   */
  readonly inherited: number
  /** The barrier exclusion that decided this directory or an ancestor, or -1. */
  readonly barrier: number
}

/**
 * The evaluation of one entry.
 *
 * @internal
 */
export interface Visit {
  /** The state for the entry's children. */
  readonly state: State
  /** The index of the deciding rule, or -1. */
  readonly decision: number
  readonly excluded: boolean
  /** Whether no strict descendant can be anything but excluded. */
  readonly prune: boolean
}

/** @internal */
export interface Evaluator {
  readonly initial: State
  /** Whether any rule depends on whether an entry is a directory. */
  readonly needsDirectory: boolean
  readonly step: (state: State, name: string, directory: boolean) => Visit
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

const advance = (rule: CompiledRule, state: unknown, name: string): unknown => {
  if (!(state instanceof Pending)) {
    return rule.incremental.step(state, name)
  }
  if (state === outside) {
    return outside
  }
  if (state.depth < rule.scope.length) {
    return rule.scope[state.depth] === name ? rule.pending[state.depth + 1] : outside
  }
  return rule.incremental.step(rule.incremental.initial, name)
}

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

const make = (rules: ReadonlyArray<Rule>): Evaluator => {
  const compiled = rules.map(compileRule)
  const isExcluded = (index: number): boolean => index !== -1 && !compiled[index].include
  const step = (state: State, name: string, directory: boolean): Visit => {
    if (state.barrier !== -1) {
      return { state, decision: state.barrier, excluded: true, prune: true }
    }
    const next = new Array<unknown>(compiled.length)
    let decision = state.inherited
    let inherited = state.inherited
    for (let i = 0; i < compiled.length; i++) {
      const rule = compiled[i]
      const value = advance(rule, state.rules[i], name)
      next[i] = value
      if (
        !(value instanceof Pending) && (directory || !rule.directoryOnly) &&
        rule.incremental.accepts(value, directory)
      ) {
        // A fresh `inherit` hit passes down only if it changes the running
        // decision, as BuildKit's `MatchesUsingParentResults` does. Here
        // `decision` is the highest hit below `i`.
        if (rule.inherit && i > inherited && rule.include === isExcluded(decision)) {
          inherited = i
        }
        // `i` only grows, but an inherited hit may outrank it
        if (i > decision) {
          decision = i
        }
      }
    }
    const rule = compiled[decision]
    const excluded = rule !== undefined && !rule.include
    let prune = false
    if (excluded && !rule.barrier && isExcluded(inherited)) {
      // The children start from the inherited exclusion, which stays decisive
      // unless a later inclusion can match below
      prune = true
      for (let i = inherited + 1; i < compiled.length && prune; i++) {
        prune = !compiled[i].include || !reachable(compiled[i], next[i])
      }
    }
    return {
      state: { rules: next, inherited, barrier: excluded && rule.barrier ? decision : -1 },
      decision,
      excluded,
      prune: prune || (excluded && rule.barrier)
    }
  }
  return {
    initial: { rules: compiled.map((rule) => rule.pending[0]), inherited: -1, barrier: -1 },
    needsDirectory: compiled.some((rule) => rule.directoryOnly || rule.incremental.directory),
    step
  }
}

const evaluators = new WeakMap<object, Evaluator>()

/**
 * The evaluator for a filter, built once per filter, or for a list of rules.
 *
 * @internal
 */
export const evaluator = (filter: Input): Evaluator => {
  if (!isFilter(filter)) {
    return make(Array.from(filter))
  }
  let evaluator = evaluators.get(filter)
  if (evaluator === undefined) {
    evaluator = make(filter.rules)
    evaluators.set(filter, evaluator)
  }
  return evaluator
}

/**
 * Evaluates root-relative segments, treating every ancestor as a directory.
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
    const visit = evaluator.step(state, segments[i], i < segments.length - 1 || directory)
    decision = visit.decision
    if (visit.state.barrier !== -1) {
      return decision
    }
    state = visit.state
  }
  return decision
}
