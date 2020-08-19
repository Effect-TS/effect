import { Compact } from "../Compact"
import { Auto, URIS } from "../HKT"
import { Separate } from "../Separate"

export type Compactable<F extends URIS, C = Auto> = Compact<F, C> & Separate<F, C>
