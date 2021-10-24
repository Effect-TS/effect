// ets_tracing: off

import * as O from "../../../../Option"
import * as C from "../core"
import * as Succeed from "./succeed"

export function fromOption<A>(
  option: O.Option<A>
): C.Channel<unknown, unknown, unknown, unknown, O.None, never, A> {
  return O.fold_(
    option,
    () => C.fail(O.none as O.None),
    (_) => Succeed.succeed(_)
  )
}
