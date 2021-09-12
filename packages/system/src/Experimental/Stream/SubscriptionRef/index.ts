import * as A from "../../../Collections/Immutable/Chunk"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import { pipe } from "../../../Function"
import * as H from "../../../Hub"
import * as M from "../../../Managed"
import * as RefM from "../../../RefM"
import * as S from ".."

/**
 * A `SubscriptionRef<A>` contains a `RefM` with a value of type
 * `A` and a `Stream` that can be subscribed to in order to receive the
 * current value as well as all changes to the value.
 */
export class SubscriptionRef<A> {
  constructor(public ref: RefM.RefM<A>, public changes: S.Stream<unknown, never, A>) {}
}

/**
 * Creates a new `SubscriptionRef` with the specified value.
 */
export function make<A>(a: A): T.UIO<SubscriptionRef<A>> {
  return pipe(
    T.do,
    T.bind("ref", () => RefM.makeRefM(a)),
    T.bind("hub", () => H.makeUnbounded<A>()),
    T.let("changes", ({ hub, ref }) =>
      S.unwrapManaged(
        M.managedApply(
          T.uninterruptible(
            RefM.modify_(ref, (a) =>
              T.zipWith_(
                T.succeed(a),
                H.subscribe(hub).effect,
                (a, { tuple: [finalizer, queue] }) =>
                  Tp.tuple(
                    Tp.tuple(
                      finalizer,
                      S.concat_(S.fromChunk(A.single(a)), S.fromQueue()(queue))
                    ),
                    a
                  )
              )
            )
          )
        )
      )
    ),
    T.map(
      ({ changes, hub, ref }) =>
        new SubscriptionRef(
          RefM.tapInput_(ref, (_) => H.publish_(hub, _)),
          changes
        )
    )
  )
}
