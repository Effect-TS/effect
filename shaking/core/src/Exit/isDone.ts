import type { Done, Exit } from "./Exit"

export const isDone = <E, A>(e: Exit<E, A>): e is Done<A> => e._tag === "Done"
