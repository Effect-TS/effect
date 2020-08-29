import type { XPure } from "@effect-ts/system/XPure"

export interface XIO<A> extends XPure<unknown, unknown, unknown, never, A> {}
