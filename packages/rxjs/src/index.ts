import { effect as T } from "@matechs/effect";
import * as E from "@matechs/effect/lib/exit";
import * as M from "@matechs/effect/lib/managed";
import * as S from "@matechs/effect/lib/stream";
import * as su from "@matechs/effect/lib/stream/support";
import * as Rx from "rxjs";
import { managed } from "@matechs/effect/lib/managed";

export function encaseObservable<E, A>(
  observable: Rx.Observable<A>,
  onError: (e: any) => E
): S.Stream<T.NoEnv, E, A> {
  return S.fromSource(
    managed.chain(
      M.bracket(
        T.sync(() => {
          const { next, ops, hasCB } = su.queueUtils<E, A>();

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
      ({ ops, hasCB }) => su.emitter(ops, hasCB)
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

/**
 * Evaluates a non failling Effect into an Observable
 * Note that the effect would be run for *each* subscriber
 */
export function fromEffect<A>(
  eff: T.Effect<T.NoEnv, never, A>
): Rx.Observable<A> {
  return Rx.defer(
    () =>
      new Rx.Observable<A>(subs =>
        T.run(
          eff,
          E.fold<never, A, T.NoEnv>(
            a => {
              subs.next(a);
              subs.complete();
            },
            /* istanbul ignore next */
            e => subs.error(e),
            ab => subs.error(ab),
            () => subs.complete()
          )
        )
      )
  );
}
