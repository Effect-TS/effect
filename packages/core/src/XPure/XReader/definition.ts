// ets_tracing: off

import type { XPure } from "@effect-ts/system/XPure"

export interface XReader<R, A> extends XPure<unknown, unknown, unknown, R, never, A> {}
