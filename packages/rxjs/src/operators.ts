import * as Rx from "rxjs";

import { effect as T, stream as S, exit as EX } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "./";
import { fold, right, left } from "fp-ts/lib/Either";
import { Exit } from "@matechs/effect/lib/original/exit";

export function chainEffect<A, E, B>(
  f: (a: A) => T.Effect<T.NoEnv, E, B>
): (o: Rx.Observable<A>) => Rx.Observable<B> {
  return o =>
    pipe(
      R.encaseObservableEither<unknown, A>(o),
      S.chain(
        fold(
          e => S.once(left<unknown, Exit<E, B>>(e)),
          a =>
            S.encaseEffect(
              // tslint:disable-next-line: no-unnecessary-callback-wrapper
              T.effect.map(T.result(f(a)), b => right<unknown, Exit<E, B>>(b))
            )
        )
      ),
      R.toObservable,
      R.runToObservable
    ).pipe(
      seb =>
        new Rx.Observable(sub => {
          seb.subscribe(
            exit =>
              pipe(
                exit,
                fold(
                  e => sub.error(e),
                  EX.fold(
                    b => sub.next(b),
                    e => sub.error(e),
                    x => {
                      sub.error(x);
                      sub.complete();
                    },
                    () => {
                      sub.error(new Error("interrupted"));
                      sub.complete();
                    }
                  )
                )
              ),
            _ => {
              // never
            },
            () => sub.complete()
          );
        })
    );
}
