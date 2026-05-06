/**
 * Commit Classifier - Classifies commit messages by intent using
 * conventional commit prefixes and keyword detection.
 *
 * Enables Vajra's fix_ratio scoring dimension.
 *
 * @internal
 */

/** @internal */
export type CommitIntent = "feat" | "fix" | "refactor" | "test" | "docs" | "chore" | "unknown"

const CONVENTIONAL_PATTERNS: Array<[RegExp, CommitIntent]> = [
  [/^fix(\(|:|!)/i, "fix"],
  [/^feat(\(|:|!)/i, "feat"],
  [/^refactor(\(|:|!)/i, "refactor"],
  [/^test(\(|:|!)/i, "test"],
  [/^docs(\(|:|!)/i, "docs"],
  [/^chore(\(|:|!)/i, "chore"],
  [/^perf(\(|:|!)/i, "feat"],
  [/^ci(\(|:|!)/i, "chore"],
  [/^build(\(|:|!)/i, "chore"],
  [/^style(\(|:|!)/i, "chore"],
  [/^revert(\(|:|!)/i, "fix"],
]

const KEYWORD_PATTERNS: Array<[RegExp, CommitIntent]> = [
  [/\bfix(es|ed|ing)?\b/i, "fix"],
  [/\bbug(fix)?\b/i, "fix"],
  [/\brepair(s|ed|ing)?\b/i, "fix"],
  [/\bresolve[sd]?\b/i, "fix"],
  [/\bpatch(es|ed|ing)?\b/i, "fix"],
  [/\bcorrect(s|ed|ing)?\b/i, "fix"],
  [/\badd(s|ed|ing)?\b/i, "feat"],
  [/\bimplement(s|ed|ing)?\b/i, "feat"],
  [/\bintroduc(e|es|ed|ing)\b/i, "feat"],
  [/\bsupport(s|ed|ing)?\b/i, "feat"],
  [/\brefactor(s|ed|ing)?\b/i, "refactor"],
  [/\brenam(e|es|ed|ing)\b/i, "refactor"],
  [/\brestructur(e|es|ed|ing)\b/i, "refactor"],
  [/\btest(s|ed|ing)?\b/i, "test"],
  [/\bdoc(s|umentation|umented)?\b/i, "docs"],
  [/\breadme\b/i, "docs"],
  [/\bchangelog\b/i, "docs"],
  [/\bbump(s|ed|ing)?\b/i, "chore"],
  [/\bversion\s+packages\b/i, "chore"],
  [/\bupgrade(s|d)?\b/i, "chore"],
  [/\bdep(s|endenc(y|ies))?\b/i, "chore"],
]

/**
 * Classify a commit message by intent.
 *
 * First tries conventional commit prefix matching, then falls back
 * to keyword detection in the message body.
 *
 * @internal
 */
export const classifyCommit = (message: string): CommitIntent => {
  const trimmed = message.trim()

  for (const [pattern, intent] of CONVENTIONAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return intent
    }
  }

  for (const [pattern, intent] of KEYWORD_PATTERNS) {
    if (pattern.test(trimmed)) {
      return intent
    }
  }

  return "unknown"
}

/**
 * Classify an array of commit messages and compute the fix ratio.
 *
 * @internal
 */
export const computeFixRatio = (messages: ReadonlyArray<string>): {
  readonly fixCount: number
  readonly totalClassified: number
  readonly fixRatio: number
  readonly breakdown: Record<CommitIntent, number>
} => {
  const breakdown: Record<CommitIntent, number> = {
    feat: 0, fix: 0, refactor: 0, test: 0, docs: 0, chore: 0, unknown: 0
  }

  for (const msg of messages) {
    const intent = classifyCommit(msg)
    breakdown[intent]++
  }

  const totalClassified = messages.length - breakdown.unknown
  const fixRatio = totalClassified > 0 ? breakdown.fix / totalClassified : 0

  return { fixCount: breakdown.fix, totalClassified, fixRatio, breakdown }
}
