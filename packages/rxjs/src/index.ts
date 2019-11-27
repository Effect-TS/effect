import * as T from "@matechs/effect";
import * as E from "@matechs/effect/lib/exit";
import * as M from "@matechs/effect/lib/managed";
import * as S from "@matechs/effect/lib/stream";
import { Either, left, right } from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as Rx from "rxjs";

type Offer<A> = { _tag: "offer"; a: A };
type StreamError<E> = { _tag: "error"; e: E };
type Complete = { _tag: "complete" };
type Ops<E, A> = Offer<A> | StreamError<E> | Complete;

export function encaseObservable<E, A>(
  observable: Rx.Observable<A>,
  onError: (e: any) => E
): S.Stream<T.NoEnv, E, A> {
  return S.fromSource(
    M.chain(
      M.bracket(
        T.sync(() => {
          const ops: Ops<E, A>[] = [];
          const hasCB: { cb?: () => void } = {};

          function callCB() {
            if (hasCB.cb) {
              const cb = hasCB.cb;
              hasCB.cb = undefined;
              cb();
            }
          }

          return {
            s: observable.subscribe(
              a => {
                ops.push({ _tag: "offer", a });
                callCB();
              },
              e => {
                ops.push({ _tag: "error", e: onError(e) });
                callCB();
              },
              () => {
                ops.push({ _tag: "complete" });
                callCB();
              }
            ),
            ops,
            hasCB
          };
        }),
        ({ s }) => T.sync(() => s.unsubscribe())
      ),
      ({ ops, hasCB }) => {
        return M.pure(
          T.async(callback => {
            if (ops.length > 0) {
              return runFromQueue(ops, callback);
            } else {
              hasCB.cb = () => {
                runFromQueue(ops, callback)();
              };
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

export function runToObservable<E, A>(
  o: T.Effect<T.NoEnv, never, Rx.Observable<A>>
): Rx.Observable<A> {
  return new Rx.Observable(sub => {
    T.run(
      o,
      E.fold(
        ob => {
          const running = ob.subscribe(
            r => {
              sub.next(r);
            },
            e => {
              sub.error(e);
            },
            () => {
              sub.complete();
            }
          );

          sub.unsubscribe = () => {
            running.unsubscribe();
            sub.closed = true;
          };
        },
        e => {
          /* istanbul ignore next */
          sub.error(e);
        },
        u => {
          /* istanbul ignore next */
          sub.error(u);
        },
        () => {
          /* istanbul ignore next */
          sub.error(new Error("interrupted"));
        }
      )
    );
  });
}

export function toObservable<R, E, A>(
  s: S.Stream<R, E, A>
): T.Effect<R, T.NoErr, Rx.Observable<A>> {
  return T.access(
    (r: R) =>
      new Rx.Observable(sub => {
        const drainer = T.provideAll(r)(
          S.drain(
            S.mapM(s, a =>
              T.sync(() => {
                sub.next(a);
              })
            )
          )
        );
        const interruptDrain = T.run(
          drainer,
          E.fold(
            () => {
              sub.complete();
            },
            e => {
              sub.error(e);
              sub.unsubscribe();
            },
            u => {
              sub.error(u);
              sub.unsubscribe();
            },
            () => {}
          )
        );

        sub.unsubscribe = () => {
          sub.closed = true;
          interruptDrain();
        };
      })
  );
}
