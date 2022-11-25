/**
 * @since 2.0.0
 *
 * ```md
 * - Docs: https://effect-ts.github.io/io/modules/Logger.ts.html
 * - Module: "@effect/io/Logger"
 * ```
 */

import * as Span from "@effect/io/Logger/Span"
import * as LogLevel from "effect/Logger/LogLevel"

export * from "@effect/io/Logger"

export {
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Logger/Level.ts.html
   * - Module: "@effect/io/Logger/Level"
   * ```
   */
  LogLevel,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Logger/Span.ts.html
   * - Module: "@effect/io/Logger/Span"
   * ```
   */
  Span as LogSpan
}
