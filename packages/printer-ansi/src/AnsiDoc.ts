/**
 * @since 1.0.0
 */

import type { Doc } from "@effect/printer/Doc"
import type { AnsiStyle } from "./AnsiStyle.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export type AnsiDoc = Doc<AnsiStyle>
