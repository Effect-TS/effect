import type { Eq } from "./Eq"
import { eqStrict } from "./eqStrict"

/**
 * @since 2.0.0
 */
export const eqBoolean: Eq<boolean> = eqStrict
