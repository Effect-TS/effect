import * as S from "./stream";
import * as Sink from "./sink";
import * as Q from "../queue";
import * as T from "../effect";
import * as M from "../managed";
import { Option, isSome } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { Do } from "fp-ts-contrib/lib/Do";
import { queueUtils, emitter, Ops } from "./support";

export function subject<S, R, E, A>(_: S.Stream<S, R, E, A>) {
  const listeners: Map<any, (_: Ops<E, A>) => void> = new Map();

  function next(_: Ops<E, A>) {
    listeners.forEach((f) => {
      f(_);
    });
  }

  return Do(T.effect)
    .bind("q", Q.unboundedQueue<Option<A>>())
    .bindL("into", ({ q }) =>
      pipe(
        _,
        S.into(Sink.queueOptionSink(q)),
        T.chainError((e) =>
          pipe(
            T.sync(() => {
              next({ _tag: "error", e });
            }),
            T.chain(() => T.raiseError(e))
          )
        ),
        T.fork
      )
    )
    .bindL("extract", ({ q }) =>
      pipe(
        q.take,
        T.chainTap((_) =>
          T.sync(() => next(isSome(_) ? { _tag: "offer", a: _.value } : { _tag: "complete" }))
        ),
        T.forever,
        T.fork
      )
    )
    .return(({ into, extract }) => {
      const interrupt = pipe(
        T.sequenceT(
          into.interrupt,
          extract.interrupt,
          T.sync(() => {
            next({ _tag: "complete" });
          })
        ),
        T.asUnit
      );

      const subscribe = T.sync(() => {
        const { next, ops, hasCB } = queueUtils<E, A>();

        const push = (_: Ops<E, A>) => {
          next(_);
        };

        listeners.set(push, push);

        return S.fromSource(
          pipe(
            M.bracket(T.unit, () =>
              T.sync(() => {
                listeners.delete(push);
              })
            ),
            M.chain(() => emitter(ops, hasCB))
          )
        );
      });

      return {
        interrupt,
        subscribe
      };
    });
}
