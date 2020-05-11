import type { Abort, Exit } from "./Exit"

export const isAbort = <E, A>(e: Exit<E, A>): e is Abort => e._tag === "Abort"
