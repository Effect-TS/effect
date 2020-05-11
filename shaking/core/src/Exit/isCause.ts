import type { Cause, Exit } from "./Exit"

export const isCause = <E, A>(e: Exit<E, A>): e is Cause<E> => e._tag !== "Done"
