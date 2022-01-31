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
import type { Canceler, Emit } from "./_internal/Emit.js"
import { toEmit } from "./_internal/Emit.js"
import * as Ensuring from "./ensuring.js"
import * as Unwrap from "./unwrap.js"
import * as UnwrapManaged from "./unwrapManaged.js"

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export function asyncInterrupt<R, E, A>(
  register: (emit: Emit<R, E, A, void>) => E.Either<Canceler<R>, C.Stream<R, E, A>>,
  outputBuffer = 16
): C.Stream<R, E, A> {
  return UnwrapManaged.unwrapManaged(
    pipe(
      M.do,
      M.bind("output", () =>
        T.toManagedRelease_(Q.makeBounded<TK.Take<E, A>>(outputBuffer), Q.shutdown)
      ),
      M.bind("runtime", () => M.runtime<R>()),
      M.bind("eitherStream", ({ output, runtime }) =>
        M.succeed(
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
      M.map(({ eitherStream, output }) =>
        E.fold_(
          eitherStream,
          (canceler) => {
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
                T.fold(
                  (maybeError) =>
                    CH.zipRight_(
                      CH.fromEffect(Q.shutdown(output)),
                      O.fold_(
                        maybeError,
                        () => CH.end(undefined),
                        (_) => CH.fail(_)
                      )
                    ),
                  (a) => CH.zipRight_(CH.write(a), loop)
                )
              )
            )

            return Ensuring.ensuring_(new C.Stream(loop), canceler)
          },
          (value) => Unwrap.unwrap(T.as_(Q.shutdown(output), value))
        )
      )
    )
  )
}
