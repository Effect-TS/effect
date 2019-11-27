import * as T from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
import * as M from "@matechs/effect/lib/managed";
import * as Q from "@matechs/effect/lib/queue";
import * as O from "fp-ts/lib/Option";
import * as Rx from "rxjs";
import { left, right, Either } from "fp-ts/lib/Either";
import { Lazy } from "fp-ts/lib/function";

type Offer<A> = { _tag: "offer"; a: A };
type StreamError<E> = { _tag: "error"; e: E };
type Complete = { _tag: "complete" };
type Ops<E, A> = Offer<A> | StreamError<E> | Complete;

function waitFor(io: Lazy<boolean>): T.Effect<T.NoEnv, T.NoErr, void> {
  return io() ? T.unit : T.suspended(() => T.delay(waitFor(io), 1));
}

export function encaseObservable<E, A>(
  observable: Rx.Observable<A>,
  onError: (e: any) => E
): S.Stream<T.NoEnv, E, A> {
  return S.fromSource(
    M.chain(
      M.bracket(
        T.chain(Q.unboundedQueue<A>(), queue =>
          T.sync(() => {
            const ops: Ops<E, A>[] = [];

            return {
              s: observable.subscribe(
                a => {
                  ops.push({ _tag: "offer", a });
                },
                e => {
                  ops.push({ _tag: "error", e: onError(e) });
                },
                () => {
                  ops.push({ _tag: "complete" });
                }
              ),
              ops
            };
          })
        ),
        ({ s }) => T.sync(() => s.unsubscribe())
      ),
      ({ ops }) => {
        return M.pure(
          T.async(callback => {
            if (ops.length > 0) {
              return runFromQueue(ops, callback);
            } else {
              T.run(
                waitFor(() => ops.length > 0),
                () => runFromQueue(ops, callback)
              );
            }
            return () => {};
          })
        );
      }
    )
  );
}

function runFromQueue<E, A>(
  ops: Ops<E, A>[],
  callback: (r: Either<E, O.Option<A>>) => void
): () => void {
  const op = ops.splice(0, 1)[0];

  switch (op._tag) {
    case "error":
      callback(left(op.e));
      return () => {};
    case "complete":
      callback(right(O.none));
      return () => {};
    case "offer":
      callback(right(O.some(op.a)));
      return () => {};
  }
}
