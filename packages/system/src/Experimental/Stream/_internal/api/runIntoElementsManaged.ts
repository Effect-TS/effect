// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Ex from "../../../../Exit/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import * as Q from "../../../../Queue/index.js"
import * as CH from "../../Channel/index.js"
import type * as C from "../core.js"

/*
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoElementsManaged_<R, R1, E, A>(
  self: C.Stream<R, E, A>,
  queue: Q.XQueue<R1, never, never, unknown, Ex.Exit<O.Option<E>, A>, any>
): M.Managed<R & R1, E, void> {
  const writer = (): CH.Channel<
    R1,
    E,
    CK.Chunk<A>,
    unknown,
    never,
    Ex.Exit<O.Option<E>, A>,
    any
  > =>
    CH.readWith(
      (in_) =>
        CH.zipRight_(
          CK.reduce_(
            in_,
            CH.unit as CH.Channel<
              R1,
              unknown,
              unknown,
              unknown,
              never,
              Ex.Exit<O.Option<E>, A>,
              any
            >,
            (channel, a) => CH.zipRight_(channel, CH.write(Ex.succeed(a)))
          ),
          writer()
        ),
      (err) => CH.write(Ex.fail(O.some(err))),
      (_) => CH.write(Ex.fail(O.none))
    )

  return pipe(
    self.channel[">>>"](writer()),
    CH.mapOutEffect((_) => Q.offer_(queue, _)),
    CH.drain,
    CH.runManaged,
    M.asUnit
  )
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 *
 * @ets_data_first runIntoElementsManaged_
 */
export function runIntoElementsManaged<R1, E, A>(
  queue: Q.XQueue<R1, never, never, unknown, Ex.Exit<O.Option<E>, A>, any>
) {
  return <R>(self: C.Stream<R, E, A>) => runIntoElementsManaged_(self, queue)
}
