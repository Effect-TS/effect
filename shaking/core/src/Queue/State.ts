import { Deferred } from "../Deferred"
import { Either } from "../Either"
import { Dequeue } from "../Support/Dequeue"

export type State<A> = Either<Dequeue<Deferred<unknown, unknown, never, A>>, Dequeue<A>>
