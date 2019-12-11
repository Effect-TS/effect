import * as Rx from "rxjs";

import { effect as T, stream as S, exit as EX } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "./";
import { fold, right, left } from "fp-ts/lib/Either";
import { Exit } from "@matechs/effect/lib/original/exit";

/**
 * Chain an effect into an rxjs .pipe()
 * Errors are propagated and non final
 */

export function chainEffect<A, E, B>(
  f: (a: A) => T.Effect<T.NoEnv, E, B>
): (o: Rx.Observable<A>) => Rx.Observable<B> {
  return o =>
    pipe(
      R.encaseObservableEither<unknown, A>(o), // wrap an eventual observable error in stream either
      S.chain(
        fold(
          e => S.once(left<unknown, Exit<E, B>>(e)), // propagate error
          a =>
            S.encaseEffect(
              // tslint:disable-next-line: no-unnecessary-callback-wrapper
              T.effect.map(T.result(T.uninterruptible(f(a))), b =>
                right<unknown, Exit<E, B>>(b)
              )
            ) // run effect and wrap result in Exit
        )
      ),
      R.toObservable, // convert to observable
      R.runToObservable // run effect as observable
    ).pipe(
      seb =>
        new Rx.Observable(sub => {
          seb.subscribe(
            exit =>
              pipe(
                exit,
                fold(
                  e => sub.error(e), // this represent an error in source that we propagate
                  EX.fold(
                    b => sub.next(b), // all fine
                    e => sub.error(e), // error in effect
                    x => {
                      sub.error(x); // effect aborted, (i.e. via raiseAbort)
                    },
                    () => {
                      // if effect is interrupted we won't get here
                    }
                  )
                )
              ),
            /* istanbul ignore next */
            _ => {
              // never
            },
            () => sub.complete()
          );
        })
    );
}
