import type { Eq } from "fp-ts/lib/Eq"

import { eqStrict } from "./eqStrict"

export const eqNumber: Eq<number> = eqStrict
