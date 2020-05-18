import type { Eq } from "fp-ts/lib/Eq"

import { strictEqual } from "./eq"

export const eqStrict: Eq<unknown> = {
  equals: strictEqual
}
