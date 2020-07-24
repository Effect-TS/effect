import { SyncRE, AsyncRE } from "./effect"
import { DefaultEnv } from "./runtime"

export type SUIO<A> = SyncRE<DefaultEnv, never, A>
export type SIO<E, A> = SyncRE<DefaultEnv, E, A>
export type SRIO<R, E, A> = SyncRE<DefaultEnv & R, E, A>
export type SRUIO<R, A> = SyncRE<DefaultEnv & R, never, A>

export type UIO<A> = AsyncRE<DefaultEnv, never, A>
export type IO<E, A> = AsyncRE<DefaultEnv, E, A>
export type RIO<R, E, A> = AsyncRE<DefaultEnv & R, E, A>
export type RUIO<R, A> = AsyncRE<DefaultEnv & R, never, A>
