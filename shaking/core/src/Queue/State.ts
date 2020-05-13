import type { Deferred } from "../Deferred"
import type { Either } from "../Either"
import type { Dequeue } from "../Support/Dequeue"

export type State<A> = Either<Dequeue<Deferred<unknown, unknown, never, A>>, Dequeue<A>>
