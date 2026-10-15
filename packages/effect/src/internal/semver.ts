import * as Data from "../Data.ts"
import { hasProperty } from "../Predicate.ts"
import * as Result from "../Result.ts"

export const SemVerErrorTypeId = "~effect/SemVer/SemVerError"

export class SemVerError extends Data.TaggedError("SemVerError")<{
  readonly message: string
  readonly input?: string | undefined
}> {
  readonly [SemVerErrorTypeId]: typeof SemVerErrorTypeId = SemVerErrorTypeId
}

export const isSemVerError = (u: unknown): u is SemVerError => hasProperty(u, SemVerErrorTypeId)

export const fail = (message: string): never => {
  throw new SemVerError({ message })
}

/** Runs `f`, returning thrown `SemVerError`s as failures and rethrowing anything else. */
export const attempt = <A>(f: () => A): Result.Result<A, SemVerError> => {
  try {
    return Result.succeed(f())
  } catch (error) {
    if (isSemVerError(error)) return Result.fail(error)
    throw error
  }
}

export const tryParse = <A>(
  label: string,
  input: string,
  parse: (input: string) => A
): Result.Result<A, SemVerError> =>
  Result.mapError(
    attempt(() => parse(input)),
    (error) => new SemVerError({ message: `Invalid ${label} ${JSON.stringify(input)}: ${error.message}`, input })
  )

const numericPattern = /^(?:0|[1-9]\d*)$/
const digitsPattern = /^\d+$/
const identifierPattern = /^[0-9A-Za-z-]+$/

export const checkComponent = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    return fail(`${label} must be a non-negative safe integer, received ${value}`)
  }
  return value
}

export const parseComponent = (value: string, label: string): number => {
  if (!numericPattern.test(value)) {
    return fail(`${label} must be a non-negative integer without leading zeros, received ${JSON.stringify(value)}`)
  }
  return checkComponent(Number(value), label)
}

export const prereleaseIdentifier = (identifier: string | number): string | number => {
  if (typeof identifier === "number") return checkComponent(identifier, "numeric pre-release identifier")
  if (!identifierPattern.test(identifier)) {
    return fail(`pre-release identifier must be non-empty [0-9A-Za-z-], received ${JSON.stringify(identifier)}`)
  }
  return digitsPattern.test(identifier) ? parseComponent(identifier, "numeric pre-release identifier") : identifier
}

export const buildIdentifier = (identifier: string): string => {
  if (!identifierPattern.test(identifier)) {
    return fail(`build identifier must be non-empty [0-9A-Za-z-], received ${JSON.stringify(identifier)}`)
  }
  return identifier
}

/** The precedence-relevant part of a version, shared by versions and range bounds. */
export interface Core {
  readonly major: number
  readonly minor: number
  readonly patch: number
  readonly prerelease: ReadonlyArray<string | number>
}

const compareNumbers = (self: number, that: number): -1 | 0 | 1 => self < that ? -1 : self > that ? 1 : 0

const comparePrerelease = (
  self: ReadonlyArray<string | number>,
  that: ReadonlyArray<string | number>
): -1 | 0 | 1 => {
  if (self.length === 0) return that.length === 0 ? 0 : 1
  if (that.length === 0) return -1
  const length = Math.min(self.length, that.length)
  for (let i = 0; i < length; i++) {
    const a = self[i]
    const b = that[i]
    if (a === b) continue
    if (typeof a === "number") return typeof b === "number" ? compareNumbers(a, b) : -1
    if (typeof b === "number") return 1
    return a < b ? -1 : 1
  }
  return compareNumbers(self.length, that.length)
}

export const sameCore = (self: Core, that: Core): boolean =>
  self.major === that.major && self.minor === that.minor && self.patch === that.patch

export const compareCore = (self: Core, that: Core): -1 | 0 | 1 =>
  compareNumbers(self.major, that.major) ||
  compareNumbers(self.minor, that.minor) ||
  compareNumbers(self.patch, that.patch) ||
  comparePrerelease(self.prerelease, that.prerelease)
