// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import * as Q from "../../../../Queue/index.js"
import * as CH from "../../Channel/index.js"
import * as TK from "../../Take/index.js"
import * as C from "../core.js"
import type { Emit } from "./_internal/Emit.js"
import { toEmit } from "./_internal/Emit.js"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times
 * The registration of the callback itself returns an effect. The optionality of the
 * error type `E` can be used to signal the end of the stream, by setting it to `None`.
 */
export function asyncEffect<R, E, A, Z>(
  register: (emit: Emit<R, E, A, void>) => T.Effect<R, E, Z>,
  outputBuffer = 16
): C.Stream<R, E, A> {
  return new C.Stream(
    CH.unwrapManaged(
      pipe(
        M.do,
        M.bind("output", () =>
          T.toManagedRelease_(Q.makeBounded<TK.Take<E, A>>(outputBuffer), Q.shutdown)
        ),
        M.bind("runtime", () => M.runtime<R>()),
        M.tap(({ output, runtime }) =>
          T.toManaged(
            register(
              toEmit((k) => {
                try {
                  runtime.run(T.chain_(TK.fromPull(k), (_) => Q.offer_(output, _)))
                } catch (e: unknown) {
                  if (CS.isFiberFailure(e)) {
                    if (!CS.interrupted(e.cause)) {
                      throw e
                    }
                  }
                }
              })
            )
          )
        ),
        M.map(({ output }) => {
          const loop: CH.Channel<
            unknown,
            unknown,
            unknown,
            unknown,
            E,
            CK.Chunk<A>,
            void
          > = CH.unwrap(
            pipe(
              Q.take(output),
              T.chain((_) => TK.done(_)),
              T.foldCauseM(
                (maybeError) => {
                  return T.as_(
                    Q.shutdown(output),
                    E.fold_(
                      CS.failureOrCause(maybeError),
                      (l) =>
                        O.fold_(
                          l,
                          () => CH.end(undefined),
                          (failure) => CH.fail(failure)
                        ),
                      (cause) => CH.failCause(cause)
                    )
                  )
                },
                (a) => T.succeed(CH.zipRight_(CH.write(a), loop))
              )
            )
          )

          return loop
        })
      )
    )
  )
}
