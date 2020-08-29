import type { XPure } from "@effect-ts/system/XPure"

import type * as P from "../../Prelude"

export type V = P.V<"S", "_">

export interface XState<S, A> extends XPure<S, S, unknown, never, A> {}
