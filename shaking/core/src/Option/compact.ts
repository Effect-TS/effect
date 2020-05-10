import type { Option } from "fp-ts/lib/Option"

import { chain_ } from "./chain_"
import { identity } from "./common"

export const compact = <A>(fa: Option<Option<A>>): Option<A> => chain_(fa, identity)
