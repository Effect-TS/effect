// ets_tracing: off

import * as CS from "../../../../Cause"
import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import * as E from "../../../../Either"
import { pipe } from "../../../../Function"
import * as M from "../../../../Managed"
import * as O from "../../../../Option"
import * as Q from "../../../../Queue"
import * as CH from "../../Channel"
import * as TK from "../../Take"
import * as C from "../core"
import type { Canceler, Emit } from "./_internal/Emit"
import { toEmit } from "./_internal/Emit"
import * as Ensuring from "./ensuring"
import * as Unwrap from "./unwrap"
import * as UnwrapManaged from "./unwrapManaged"

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
