import type { Auto, URIS } from "@effect-ts/hkt"

import type { Compact } from "../Compact"
import type { Separate } from "../Separate"

export interface Compactable<F extends URIS, C = Auto>
  extends Compact<F, C>,
    Separate<F, C> {}
