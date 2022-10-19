/**
 * @since 1.0.0
 */

import * as AR from "@effect/printer-ansi/internal/AnsiRender"

// -----------------------------------------------------------------------------
// Rendering Algorithms
// -----------------------------------------------------------------------------

/**
 * @category rendering algorithms
 * @since 1.0.0
 * @tsplus static effect/printer/DocStream.Ops renderAnsi
 * @tsplus getter effect/printer/DocStream renderAnsi
 */
export const renderAnsi: (self: DocStream<AnsiStyle>) => string = AR.renderAnsi

/**
 * @category rendering algorithms
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiDoc.Ops renderCompactAnsi
 * @tsplus getter effect/printer-ansi/AnsiDoc renderCompactAnsi
 */
export const renderCompactAnsi: (self: AnsiDoc) => string = AR.renderCompactAnsi

/**
 * @category rendering algorithms
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiDoc.Aspects renderPrettyAnsi
 * @tsplus pipeable effect/printer-ansi/AnsiDoc renderPrettyAnsi
 */
export const renderPrettyAnsi: (
  lineWidth: number,
  ribbonFraction?: number
) => (
  self: AnsiDoc
) => string = AR.renderPrettyAnsi

/**
 * @category rendering algorithms
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiDoc.Ops renderPrettyAnsiDefault
 * @tsplus getter effect/printer-ansi/AnsiDoc renderPrettyAnsiDefault
 */
export const renderPrettyAnsiDefault: (self: AnsiDoc) => string = AR.renderPrettyAnsiDefault

/**
 * @category rendering algorithms
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiDoc.Ops renderPrettyAnsiUnbounded
 * @tsplus getter effect/printer-ansi/AnsiDoc renderPrettyAnsiUnbounded
 */
export const renderPrettyAnsiUnbounded: (self: AnsiDoc) => string = AR.renderPrettyAnsiUnbounded

/**
 * @category rendering algorithms
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiDoc.Aspects renderSmartAnsi
 * @tsplus pipeable effect/printer-ansi/AnsiDoc renderSmartAnsi
 */
export const renderSmartAnsi: (
  lineWidth: number,
  ribbonFraction?: number
) => (
  self: AnsiDoc
) => string = AR.renderSmartAnsi

/**
 * @category rendering algorithms
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiDoc.Ops renderSmartAnsiDefault
 * @tsplus getter effect/printer-ansi/AnsiDoc renderSmartAnsiDefault
 */
export const renderSmartAnsiDefault: (self: AnsiDoc) => string = AR.renderSmartAnsiDefault

/**
 * @category rendering algorithms
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiDoc.Ops renderSmartAnsiUnbounded
 * @tsplus getter effect/printer-ansi/AnsiDoc renderSmartAnsiUnbounded
 */
export const renderSmartAnsiUnbounded = AR.renderSmartAnsiUnbounded
