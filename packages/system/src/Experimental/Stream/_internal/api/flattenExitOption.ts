// ets_tracing: off

import * as CS from "../../../../Cause"
import * as CK from "../../../../Collections/Immutable/Chunk"
import * as Ex from "../../../../Exit"
import * as O from "../../../../Option"
import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 *
 * For `Exit<E, A>` values that do not signal end-of-stream, prefer:
 */
export function flattenExitOption<R, E, E1, A>(
  self: C.Stream<R, E, Ex.Exit<O.Option<E1>, A>>
): C.Stream<R, E | E1, A> {
  const processChunk = (
    chunk: CK.Chunk<Ex.Exit<O.Option<E1>, A>>,
    cont: CH.Channel<
      R,
      E,
      CK.Chunk<Ex.Exit<O.Option<E1>, A>>,
      unknown,
      E | E1,
      CK.Chunk<A>,
      any
    >
  ): CH.Channel<
    R,
    E,
    CK.Chunk<Ex.Exit<O.Option<E1>, A>>,
    unknown,
    E | E1,
    CK.Chunk<A>,
    any
  > => {
    const {
      tuple: [toEmit, rest]
    } = CK.splitWhere_(chunk, (_) => !Ex.succeeded(_))
    const next = O.fold_(
      CK.head(rest),
      () => cont,
      Ex.fold(
        (cause) =>
          O.fold_(
            CS.flipCauseOption(cause),
            () => CH.end<void>(undefined),
            (cause) => CH.failCause(cause)
          ),
        () => CH.end<void>(undefined)
      )
    )

    return CH.zipRight_(
      CH.write(
        CK.collectChunk_(
          toEmit,
          Ex.fold(
            () => O.none,
            (a) => O.some(a)
          )
        )
      ),
      next
    )
  }

  const process: CH.Channel<
    R,
    E,
    CK.Chunk<Ex.Exit<O.Option<E1>, A>>,
    unknown,
    E | E1,
    CK.Chunk<A>,
    any
  > = CH.readWithCause(
    (chunk) => processChunk(chunk, process),
    (cause) => CH.failCause(cause),
    (_) => CH.end(undefined)
  )

  return new C.Stream(self.channel[">>>"](process))
}
