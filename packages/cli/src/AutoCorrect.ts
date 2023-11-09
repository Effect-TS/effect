/**
 * @since 1.0.0
 */

import type { CliConfig } from "./CliConfig.js"
import * as InternalAutoCorrect from "./internal/autoCorrect.js"

/**
 * @since 1.0.0
 * @category utilities
 */
export const levensteinDistance: (first: string, second: string, config: CliConfig) => number =
  InternalAutoCorrect.levensteinDistance
