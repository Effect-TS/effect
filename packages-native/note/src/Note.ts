/**
 * Core note creation logic.
 *
 * @since 0.1.0
 */

import { slugify } from "@effect-native/schemas/Slug"

/**
 * Generates the note filename from title and date.
 *
 * Format: `note-YYYY-MM-DD-<slug>.md`
 *
 * @example
 * import { makeFilename } from "note/Note"
 *
 * const date = new Date("2025-11-26T14:30:56.886Z")
 * makeFilename("Hello World", date) // "note-2025-11-26-hello-world.md"
 *
 * @since 0.1.0
 * @category Note
 */
export const makeFilename = (title: string, date: Date): string => {
  const dateStr = date.toISOString().slice(0, 10)
  const slug = slugify(title)
  return `note-${dateStr}-${slug}.md`
}

/**
 * Generates the note markdown content.
 *
 * Format:
 * ```
 * # <title>
 *
 * Created: <ISO-8601-timestamp>
 * ```
 *
 * @example
 * import { makeContent } from "note/Note"
 *
 * const timestamp = new Date("2025-11-26T14:30:56.886Z")
 * makeContent("My Note Title", timestamp)
 * // Returns:
 * // "# My Note Title\n\nCreated: 2025-11-26T14:30:56.886Z\n"
 *
 * @since 0.1.0
 * @category Note
 */
export const makeContent = (title: string, timestamp: Date): string =>
  `# ${title}\n\nCreated: ${timestamp.toISOString()}\n`
