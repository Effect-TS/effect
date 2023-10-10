/**
 * @since 1.0.0
 */

import type { CliConfig } from "./CliConfig"
import * as internal from "./internal/autoCorrect"

/**
 * @since 1.0.0
 * @category utilities
 */
export const levensteinDistance: (first: string, second: string, config: CliConfig) => number =
  internal.levensteinDistance
