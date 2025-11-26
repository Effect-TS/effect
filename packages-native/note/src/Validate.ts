/**
 * Argument validation utilities for the note CLI.
 *
 * @since 0.1.0
 */

import { slugify } from "@effect-native/schemas/Slug"
import * as Array from "effect/Array"
import * as Schema from "effect/Schema"

/**
 * Checks if an argument looks like a filename (has dot, no spaces).
 *
 * Returns true if the argument contains a dot AND has no spaces.
 * This catches cases like "file.md", "test.txt", "config.json".
 *
 * @example
 * import { looksLikeFilename } from "note/Validate"
 *
 * looksLikeFilename("file.md") // true
 * looksLikeFilename("test.txt") // true
 * looksLikeFilename("hello world") // false
 *
 * @since 0.1.0
 * @category Validation
 */
export const looksLikeFilename = (arg: string): boolean => arg.includes(".") && !arg.includes(" ")

/**
 * Checks if an argument looks like a flag (starts with - or --, or contains =).
 *
 * Returns true if the argument:
 * - Starts with "-" (short flag or long flag)
 * - Contains "=" (key=value syntax)
 *
 * @example
 * import { looksLikeFlag } from "note/Validate"
 *
 * looksLikeFlag("--help") // true
 * looksLikeFlag("-v") // true
 * looksLikeFlag("key=value") // true
 * looksLikeFlag("hello") // false
 *
 * @since 0.1.0
 * @category Validation
 */
export const looksLikeFlag = (arg: string): boolean => arg.startsWith("-") || arg.includes("=")

/**
 * Schema that validates a string is a plain title word.
 *
 * Rejects strings that look like:
 * - Flags (starting with `-` or `--`, or containing `=`)
 * - Filenames (containing `.` with no spaces)
 *
 * @example
 * import * as Schema from "effect/Schema"
 * import { TitleWord } from "note/Validate"
 *
 * // Valid title words pass through
 * Schema.decodeUnknownSync(TitleWord)("hello") // "hello"
 * Schema.decodeUnknownSync(TitleWord)("my-title") // "my-title"
 *
 * @since 0.1.0
 * @category Schema
 */
export const TitleWord = Schema.String.pipe(
  Schema.filter((s) => !looksLikeFlag(s), {
    message: (s) => ({
      message: `"${s.actual}" looks like a flag. This tool doesn't accept flags yet.\nUsage: note <title words...>`,
      override: true
    })
  }),
  Schema.filter((s) => !looksLikeFilename(s), {
    message: (s) => ({
      message:
        `"${s.actual}" looks like a filename. This tool creates filenames automatically.\nUsage: note <title words...>`,
      override: true
    })
  })
)

/**
 * Parsed title input containing all derived values.
 *
 * @since 0.1.0
 * @category Models
 */
export interface TitleInput {
  /** Original words as provided */
  readonly words: Array.NonEmptyReadonlyArray<string>
  /** Joined title with spaces preserved */
  readonly title: string
  /** URL-safe slug derived from title */
  readonly slug: string
}

/**
 * Schema for mutable non-empty tuple [string, ...string[]] for @effect/cli compatibility.
 *
 * @since 0.1.0
 * @category Schema
 */
const MutableNonEmptyTitleWords = Schema.mutable(
  Schema.Tuple([TitleWord], TitleWord)
)

/**
 * Schema that transforms a non-empty array of validated title words
 * into a TitleInput containing the derived title and slug.
 *
 * Uses mutable tuple type for compatibility with @effect/cli Args.atLeast(1).
 *
 * @example
 * import * as Schema from "effect/Schema"
 * import { TitleInput } from "note/Validate"
 *
 * const result = Schema.decodeUnknownSync(TitleInput)(["hello", "world"])
 * // result: { words: ["hello", "world"], title: "hello world", slug: "hello-world" }
 *
 * @since 0.1.0
 * @category Schema
 */
export const TitleInput: Schema.Schema<
  TitleInput,
  [string, ...Array<string>]
> = Schema.transform(
  MutableNonEmptyTitleWords,
  Schema.Struct({
    words: Schema.NonEmptyArray(Schema.String),
    title: Schema.String,
    slug: Schema.String
  }),
  {
    strict: true,
    decode: (words) => ({
      words,
      title: Array.join(words, " "),
      slug: slugify(Array.join(words, " "))
    }),
    encode: ({ words }) => words as [string, ...Array<string>]
  }
)
