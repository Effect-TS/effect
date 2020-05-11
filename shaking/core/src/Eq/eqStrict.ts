import type { Eq } from "./Eq"
import { strictEqual } from "./strictEqual"

/**
 * @since 2.5.0
 */
export const eqStrict: Eq<unknown> = {
  // tslint:disable-next-line: deprecation
  equals: strictEqual
}
