import {
  ConditionsTarget,
  ExactExportRule,
  type ExportRule,
  type ExportTarget,
  FallbackTarget,
  NullTarget,
  PatternExportRule,
  Target
} from "../Model.ts"

export type DecodePackageExportsResult =
  | { readonly _tag: "Success"; readonly rules: ReadonlyArray<ExportRule> }
  | { readonly _tag: "Failure"; readonly message: string }

export type PackageTargetValidation =
  | { readonly _tag: "Valid" }
  | { readonly _tag: "Invalid"; readonly reason: string }
  | { readonly _tag: "Escape"; readonly reason: string }

export interface ReachableTargetLeaf {
  readonly target: string
  readonly conditionPath: ReadonlyArray<string>
  readonly fallbackPositions: ReadonlyArray<number>
}

const profileConditions = ["node", "node-addons", "module-sync"] as const

export const resolutionConditions = (
  conditionPath: ReadonlyArray<string>,
  mode: "Import" | "Require"
): ReadonlySet<string> => {
  const conditions = new Set<string>([...profileConditions, mode === "Import" ? "import" : "require"])
  for (const condition of conditionPath) {
    if (condition !== "default" && condition !== "import" && condition !== "require") conditions.add(condition)
  }
  return conditions
}

interface ResolvedTarget extends ReachableTargetLeaf {
  readonly _tag: "Resolved"
}

type TargetSelection =
  | ResolvedTarget
  | { readonly _tag: "Null" }
  | { readonly _tag: "NoMatch" }
  | { readonly _tag: "Invalid"; readonly target: string; readonly reason: string }

export type PackageExportSelection =
  | (ResolvedTarget & { readonly rule: ExportRule; readonly capture: string | undefined })
  | { readonly _tag: "Blocked"; readonly rule: ExportRule }
  | { readonly _tag: "NotFound"; readonly rule?: ExportRule }
  | { readonly _tag: "Invalid"; readonly rule: ExportRule; readonly target: string; readonly reason: string }

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const isArrayIndex = (key: string): boolean => {
  const number = +key
  return `${number}` === key && number >= 0 && number < 0xffff_ffff
}

const decodeTarget = (value: unknown, path: string): ExportTarget | string => {
  if (typeof value === "string") {
    return new Target({ value })
  }
  if (value === null) {
    return new NullTarget()
  }
  if (Array.isArray(value)) {
    const targets: Array<ExportTarget> = []
    for (let index = 0; index < value.length; index++) {
      const target = decodeTarget(value[index], `${path}[${index}]`)
      if (typeof target === "string") {
        return target
      }
      targets.push(target)
    }
    return new FallbackTarget({ targets })
  }
  if (!isRecord(value)) {
    return `${path} must be a string, null, condition object, or fallback array`
  }

  const entries = []
  for (const condition of Object.keys(value)) {
    if (isArrayIndex(condition)) {
      return `${path} contains invalid condition key ${JSON.stringify(condition)}`
    }
    const target = decodeTarget(value[condition], `${path}.${condition}`)
    if (typeof target === "string") {
      return target
    }
    entries.push({ condition, target })
  }
  return new ConditionsTarget({ entries })
}

export const decodePackageExports = (value: unknown): DecodePackageExportsResult => {
  if (value === null) {
    return { _tag: "Success", rules: [] }
  }
  if (typeof value === "string" || Array.isArray(value)) {
    const target = decodeTarget(value, "exports")
    return typeof target === "string"
      ? { _tag: "Failure", message: target }
      : { _tag: "Success", rules: [new ExactExportRule({ subpath: ".", target })] }
  }
  if (!isRecord(value)) {
    return {
      _tag: "Failure",
      message: "exports must be a string, null, condition object, fallback array, or subpath map"
    }
  }

  const keys = Object.keys(value)
  if (keys.length === 0) {
    return { _tag: "Success", rules: [] }
  }
  const isConditionMap = keys[0] === "" || !keys[0]!.startsWith(".")
  if (keys.some((key) => (key === "" || !key.startsWith(".")) !== isConditionMap)) {
    return { _tag: "Failure", message: "exports cannot mix condition keys and package subpath keys" }
  }
  if (isConditionMap) {
    const target = decodeTarget(value, "exports")
    return typeof target === "string"
      ? { _tag: "Failure", message: target }
      : { _tag: "Success", rules: [new ExactExportRule({ subpath: ".", target })] }
  }

  const rules: Array<ExportRule> = []
  for (const subpath of keys) {
    if (subpath !== "." && !subpath.startsWith("./")) {
      return { _tag: "Failure", message: `invalid package subpath key ${JSON.stringify(subpath)}` }
    }
    const target = decodeTarget(value[subpath], `exports.${subpath}`)
    if (typeof target === "string") {
      return { _tag: "Failure", message: target }
    }
    rules.push(
      subpath.includes("*")
        ? new PatternExportRule({ subpath, target })
        : new ExactExportRule({ subpath, target })
    )
  }
  return { _tag: "Success", rules }
}

const decodeSegment = (segment: string): string =>
  segment.replace(/%[0-9a-f]{2}/gi, (encoded) => String.fromCharCode(Number.parseInt(encoded.slice(1), 16)))

const inspectSegments = (path: string): PackageTargetValidation => {
  path = path.split(/[?#]/, 1)[0]!
  const hasBackslash = path.includes("\\")
  const segments = path.split(/[\\/]/)
  let depth = 0
  let invalidReason: string | undefined
  for (const rawSegment of segments) {
    const segment = decodeSegment(rawSegment).toLowerCase()
    if (segment === "..") {
      if (depth === 0) {
        return { _tag: "Escape", reason: "target escapes the package" }
      }
      depth--
      invalidReason ??= "target contains a prohibited '..' segment"
    } else if (segment === ".") {
      invalidReason ??= "target contains a prohibited '.' segment"
    } else if (segment === "node_modules") {
      invalidReason ??= "target contains a prohibited 'node_modules' segment"
      depth++
    } else if (segment.length > 0) {
      depth++
    }
  }
  if (hasBackslash) {
    return { _tag: "Invalid", reason: "target contains a backslash segment separator" }
  }
  if (/%2f|%5c/i.test(path)) {
    return { _tag: "Invalid", reason: "target contains an encoded path separator" }
  }
  return invalidReason === undefined ? { _tag: "Valid" } : { _tag: "Invalid", reason: invalidReason }
}

export const validatePackageTarget = (target: string): PackageTargetValidation => {
  if (!target.startsWith("./")) {
    return { _tag: "Invalid", reason: "exports target must start with './'" }
  }
  return inspectSegments(target.slice(2))
}

export const validatePatternCapture = (
  capture: string
): { readonly _tag: "Valid" } | { readonly _tag: "Invalid"; readonly reason: string } => {
  if (capture.length === 0) {
    return { _tag: "Invalid", reason: "pattern capture must not be empty" }
  }
  const validation = inspectSegments(capture)
  return validation._tag === "Valid"
    ? validation
    : { _tag: "Invalid", reason: `invalid pattern capture: ${validation.reason}` }
}

export const substitutePatternTarget = (
  target: string,
  capture: string
): { readonly _tag: "Valid"; readonly target: string } | { readonly _tag: "Invalid"; readonly reason: string } => {
  const captureValidation = validatePatternCapture(capture)
  if (captureValidation._tag === "Invalid") {
    return captureValidation
  }
  const substituted = target.replaceAll("*", capture)
  const targetValidation = validatePackageTarget(substituted)
  return targetValidation._tag === "Valid"
    ? { _tag: "Valid", target: substituted }
    : { _tag: "Invalid", reason: targetValidation.reason }
}

export const patternKeyCompare = (a: string, b: string): number => {
  const aPatternIndex = a.indexOf("*")
  const bPatternIndex = b.indexOf("*")
  const baseLengthA = aPatternIndex === -1 ? a.length : aPatternIndex + 1
  const baseLengthB = bPatternIndex === -1 ? b.length : bPatternIndex + 1
  if (baseLengthA > baseLengthB) return -1
  if (baseLengthB > baseLengthA) return 1
  if (aPatternIndex === -1) return 1
  if (bPatternIndex === -1) return -1
  if (a.length > b.length) return -1
  if (b.length > a.length) return 1
  return 0
}

const matchPattern = (pattern: string, subpath: string): string | undefined => {
  const star = pattern.indexOf("*")
  if (star === -1 || pattern.lastIndexOf("*") !== star) {
    return undefined
  }
  const prefix = pattern.slice(0, star)
  const trailer = pattern.slice(star + 1)
  if (!subpath.startsWith(prefix) || !subpath.endsWith(trailer) || subpath.length < pattern.length) {
    return undefined
  }
  const capture = subpath.slice(star, subpath.length - trailer.length)
  return capture.length === 0 ? undefined : capture
}

const selectTarget = (
  target: ExportTarget,
  conditions: ReadonlySet<string>,
  capture: string | undefined,
  conditionPath: ReadonlyArray<string> = [],
  fallbackPositions: ReadonlyArray<number> = []
): TargetSelection => {
  switch (target._tag) {
    case "Target": {
      if (capture !== undefined) {
        const substitution = substitutePatternTarget(target.value, capture)
        return substitution._tag === "Valid"
          ? { _tag: "Resolved", target: substitution.target, conditionPath, fallbackPositions }
          : { _tag: "Invalid", target: target.value, reason: substitution.reason }
      }
      const validation = validatePackageTarget(target.value)
      return validation._tag === "Valid"
        ? { _tag: "Resolved", target: target.value, conditionPath, fallbackPositions }
        : { _tag: "Invalid", target: target.value, reason: validation.reason }
    }
    case "Null":
      return { _tag: "Null" }
    case "Conditions":
      for (const entry of target.entries) {
        if (entry.condition === "default" || conditions.has(entry.condition)) {
          const result = selectTarget(
            entry.target,
            conditions,
            capture,
            [...conditionPath, entry.condition],
            fallbackPositions
          )
          if (result._tag !== "NoMatch") {
            return result
          }
        }
      }
      return { _tag: "NoMatch" }
    case "Fallback": {
      if (target.targets.length === 0) {
        return { _tag: "Null" }
      }
      let last: Extract<TargetSelection, { readonly _tag: "Null" | "Invalid" }> | undefined
      for (let index = 0; index < target.targets.length; index++) {
        const result = selectTarget(
          target.targets[index]!,
          conditions,
          capture,
          conditionPath,
          [...fallbackPositions, index]
        )
        if (result._tag === "Resolved") {
          return result
        }
        if (result._tag === "Null" || result._tag === "Invalid") {
          last = result
        }
      }
      return last ?? { _tag: "NoMatch" }
    }
  }
}

export const selectPackageExport = (
  rules: ReadonlyArray<ExportRule>,
  subpath: string,
  conditions: ReadonlySet<string>
): PackageExportSelection => {
  let rule = subpath.includes("*") || subpath.endsWith("/")
    ? undefined
    : rules.find((candidate) => candidate._tag === "ExactExportRule" && candidate.subpath === subpath)
  let capture: string | undefined
  if (rule === undefined) {
    const matches: Array<{ readonly rule: ExportRule; readonly capture: string }> = []
    for (const candidate of rules) {
      if (candidate._tag !== "PatternExportRule") continue
      const candidateCapture = matchPattern(candidate.subpath, subpath)
      if (candidateCapture !== undefined) {
        matches.push({ rule: candidate, capture: candidateCapture })
      }
    }
    matches.sort((a, b) => patternKeyCompare(a.rule.subpath, b.rule.subpath))
    rule = matches[0]?.rule
    capture = matches[0]?.capture
  }
  if (rule === undefined) {
    return { _tag: "NotFound" }
  }

  const result = selectTarget(rule.target, conditions, capture)
  switch (result._tag) {
    case "Resolved":
      return { ...result, rule, capture }
    case "Null":
      return { _tag: "Blocked", rule }
    case "NoMatch":
      return { _tag: "NotFound", rule }
    case "Invalid":
      return { ...result, rule }
  }
}

type SymbolicOutcome = "Resolved" | "Null" | "NoMatch" | "Invalid"

interface SymbolicResult {
  readonly leaves: ReadonlyArray<ReachableTargetLeaf>
  readonly outcomes: ReadonlySet<SymbolicOutcome>
}

const flattenSymbolic = (
  target: ExportTarget,
  conditionPath: ReadonlyArray<string>,
  fallbackPositions: ReadonlyArray<number>
): SymbolicResult => {
  switch (target._tag) {
    case "Target": {
      const validation = validatePackageTarget(target.value)
      return {
        leaves: [{ target: target.value, conditionPath, fallbackPositions }],
        outcomes: new Set([validation._tag === "Valid" ? "Resolved" : "Invalid"])
      }
    }
    case "Null":
      return { leaves: [], outcomes: new Set(["Null"]) }
    case "Conditions": {
      const leaves: Array<ReachableTargetLeaf> = []
      const terminal = new Set<SymbolicOutcome>()
      let canContinue = true
      for (const entry of target.entries) {
        if (!canContinue) break
        const result = flattenSymbolic(entry.target, [...conditionPath, entry.condition], fallbackPositions)
        leaves.push(...result.leaves)
        for (const outcome of result.outcomes) {
          if (outcome !== "NoMatch") terminal.add(outcome)
        }
        if (entry.condition === "default") {
          canContinue = result.outcomes.has("NoMatch")
        }
      }
      if (canContinue) terminal.add("NoMatch")
      return { leaves, outcomes: terminal }
    }
    case "Fallback": {
      if (target.targets.length === 0) {
        return { leaves: [], outcomes: new Set(["Null"]) }
      }
      const leaves: Array<ReachableTargetLeaf> = []
      const terminal = new Set<SymbolicOutcome>()
      let lastStates = new Set<"Unset" | "Null" | "Invalid">(["Unset"])
      for (let index = 0; index < target.targets.length && lastStates.size > 0; index++) {
        const result = flattenSymbolic(target.targets[index]!, conditionPath, [...fallbackPositions, index])
        leaves.push(...result.leaves)
        if (result.outcomes.has("Resolved")) terminal.add("Resolved")
        const nextStates = new Set<"Unset" | "Null" | "Invalid">()
        if (result.outcomes.has("NoMatch")) {
          for (const state of lastStates) nextStates.add(state)
        }
        if (result.outcomes.has("Null")) nextStates.add("Null")
        if (result.outcomes.has("Invalid")) nextStates.add("Invalid")
        lastStates = nextStates
      }
      for (const state of lastStates) {
        terminal.add(state === "Unset" ? "NoMatch" : state)
      }
      return { leaves, outcomes: terminal }
    }
  }
}

export const flattenReachableTargets = (target: ExportTarget): ReadonlyArray<ReachableTargetLeaf> =>
  flattenSymbolic(target, [], []).leaves
