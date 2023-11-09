/**
 * @since 1.0.0
 */

import type { CliConfig } from "./CliConfig"
import * as InternalAutoCorrect from "./internal/autoCorrect"

/**
 * @since 1.0.0
 * @category utilities
 */
export const levensteinDistance: (first: string, second: string, config: CliConfig) => number =
  InternalAutoCorrect.levensteinDistance
