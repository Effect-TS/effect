/**
 * @since 1.0.0
 */

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/AnsiDoc
 */
export type AnsiDoc = Doc<AnsiStyle>

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/AnsiDoc.Ops
 */
export interface AnsiDocOps {
  $: AnsiDocAspects
}
/**
 * @category instances
 * @since 1.0.0
 */
export const AnsiDoc: AnsiDocOps = {
  $: {}
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/AnsiDoc.Aspects
 */
export interface AnsiDocAspects {}
