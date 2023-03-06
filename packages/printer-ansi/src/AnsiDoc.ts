/**
 * @since 1.0.0
 */

import type { AnsiStyle } from "@effect/printer-ansi/AnsiStyle"
import type { Doc } from "@effect/printer/Doc"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export type AnsiDoc = Doc<AnsiStyle>
