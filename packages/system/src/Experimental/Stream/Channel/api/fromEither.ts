// ets_tracing: off

import * as E from "../../../../Either/index.js"
import * as C from "../core.js"
import * as Succeed from "./succeed.js"

export function fromEither<E, A>(
  either: E.Either<E, A>
): C.Channel<unknown, unknown, unknown, unknown, E, never, A> {
  return E.fold_(either, C.fail, Succeed.succeed)
}
