// ets_tracing: off

import type { XPure } from "@effect-ts/system/XPure"

import type * as P from "../../Prelude/index.js"

export type V = P.V<"S", "_">

export interface XState<S, A> extends XPure<unknown, S, S, unknown, never, A> {}
