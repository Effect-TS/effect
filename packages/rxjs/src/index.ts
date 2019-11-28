import * as T from "@matechs/effect";
import * as E from "@matechs/effect/lib/exit";
import * as M from "@matechs/effect/lib/managed";
import * as S from "@matechs/effect/lib/stream";
import { Either, left, right } from "fp-ts/lib/Either";
import * as list from "@matechs/effect/lib/list";
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
          const ops: list.List<Ops<E, A>> = list.empty();
          const hasCB: { cb?: (o: Ops<E, A>) => void } = {};

          function callCB(o: Ops<E, A>) {
            if (hasCB.cb) {
              const cb = hasCB.cb;
              hasCB.cb = undefined;
              cb(o);
            } else {
              list.push(ops, o);
            }
          }

          return {
            s: observable.subscribe(
              a => callCB({ _tag: "offer", a }),
              e => callCB({ _tag: "error", e: onError(e) }),
              () => callCB({ _tag: "complete" })
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
            const op = list.popUnsafe(ops);
            if (op !== null) {
              return runFromQueue(op, callback);
            } else {
              hasCB.cb = o => {
                if (list.isNotEmpty(ops)) {
                  list.push(ops, o);
                  const op = list.popUnsafe(ops);
                  if (op !== null) {
                    runFromQueue(op, callback)();
                  }
                } else {
                  runFromQueue(o, callback)();
                }
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
  op: Ops<E, A>,
  callback: (r: Either<E, O.Option<A>>) => void
): () => void {
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
