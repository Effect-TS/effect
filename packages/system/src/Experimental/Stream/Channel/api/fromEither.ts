// ets_tracing: off

import * as E from "../../../../Either"
import * as C from "../core"
import * as Succeed from "./succeed"

export function fromEither<E, A>(
  either: E.Either<E, A>
): C.Channel<unknown, unknown, unknown, unknown, E, never, A> {
  return E.fold_(either, C.fail, Succeed.succeed)
}
