import { Effect } from "./types"

export type Async<A> = Effect<unknown, unknown, never, A>
export type AsyncE<E, A> = Effect<unknown, unknown, E, A>
export type AsyncR<R, A> = Effect<unknown, R, never, A>
export type AsyncRE<R, E, A> = Effect<unknown, R, E, A>

export type Sync<A> = Effect<never, unknown, never, A>
export type SyncE<E, A> = Effect<never, unknown, E, A>
export type SyncR<R, A> = Effect<never, R, never, A>
export type SyncRE<R, E, A> = Effect<never, R, E, A>
