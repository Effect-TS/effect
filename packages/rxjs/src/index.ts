import { effect as T, managed as M, exit as E, stream as S } from "@matechs/effect";
import * as Rx from "rxjs";
import { Either, right, left } from "fp-ts/lib/Either";

export function encaseObservable<E, A>(
  observable: Rx.Observable<A>,
  onError: (e: any) => E
): S.Stream<T.NoEnv, E, A> {
  return S.fromSource(
    M.managed.chain(
      M.bracket(
        T.sync(() => {
          const { next, ops, hasCB } = S.su.queueUtils<E, A>();

          return {
            s: observable.subscribe(
              a => next({ _tag: "offer", a }),
              e => next({ _tag: "error", e: onError(e) }),
              () => next({ _tag: "complete" })
            ),
            ops,
            hasCB
          };
        }),
        ({ s }) => T.sync(() => s.unsubscribe())
      ),
      ({ ops, hasCB }) => S.su.emitter(ops, hasCB)
    )
  );
}

export function encaseObservableEither<E, A>(
  observable: Rx.Observable<A>
): S.Stream<T.NoEnv, never, Either<E, A>> {
  return S.fromSource(
    M.managed.chain(
      M.bracket(
        T.sync(() => {
          const { next, ops, hasCB } = S.su.queueUtils<never, Either<E, A>>();

          return {
            s: observable.subscribe(
              a => next({ _tag: "offer", a: right(a) }),
              e => next({ _tag: "offer", a: left(e) }),
              () => next({ _tag: "complete" })
            ),
            ops,
            hasCB
          };
        }),
        ({ s }) => T.sync(() => s.unsubscribe())
      ),
      ({ ops, hasCB }) => S.su.emitter(ops, hasCB)
    )
  );
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
            S.stream.mapM(s, a =>
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
            // tslint:disable-next-line: no-empty
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
