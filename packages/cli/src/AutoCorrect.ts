/**
 * @since 1.0.0
 */

import type { CliConfig } from "@effect/cli/CliConfig"
import * as internal from "@effect/cli/internal_effect_untraced/autoCorrect"

/**
 * @since 1.0.0
 * @category utilities
 */
export const levensteinDistance: (first: string, second: string, config: CliConfig) => number =
  internal.levensteinDistance
