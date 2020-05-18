import { Deferred } from "../Deferred"

export type Reservation = readonly [number, Deferred<unknown, unknown, never, void>]
