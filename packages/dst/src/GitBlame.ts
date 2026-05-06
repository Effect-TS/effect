/**
 * Git Blame Attribution for Effect.
 *
 * Maps source file locations to developer attribution data using
 * `git blame --line-porcelain`. Useful for correlating performance
 * hotspots with the developer responsible for the code.
 *
 * @since 0.1.0
 */

export type {
  /**
   * A single git blame entry for a line of code.
   *
   * @since 0.1.0
   * @category models
   */
  BlameEntry,
  /**
   * A map from "file:line" keys to BlameEntry values.
   *
   * @since 0.1.0
   * @category models
   */
  BlameMap
} from "./internal/gitBlame.js"

export {
  /**
   * Run `git blame --line-porcelain` for an entire file.
   *
   * @since 0.1.0
   * @category git
   */
  blameFile,
  /**
   * Run `git blame` for specific line ranges in a file.
   *
   * @since 0.1.0
   * @category git
   */
  blameLines,
  /**
   * Auto-detect the git repository root.
   *
   * @since 0.1.0
   * @category git
   */
  findRepoRoot,
  /**
   * Parse git blame --line-porcelain output.
   *
   * @since 0.1.0
   * @category parsing
   */
  parseLinePorcelain
} from "./internal/gitBlame.js"
