import * as Rx from "rxjs";

import { effect as T, streameither as S, exit as EX } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "./";
import { fold } from "fp-ts/lib/Either";

/**
 * Chain an effect into an rxjs .pipe()
 * Errors are propagated and non final
 */

export function chainEffect<A, E, B>(
  f: (a: A) => T.TaskErr<E, B>
): (o: Rx.Observable<A>) => Rx.Observable<B> {
  return (o) =>
    pipe(
      R.encaseObservableEither<A>(o), // wrap an eventual observable error in stream either
      S.chain((a) => S.encaseEffect(T.result(f(a)))),
      S.toStream,
      R.toObservable, // convert to observable
      R.runToObservable // run effect as observable
    ).pipe(
      (seb) =>
        new Rx.Observable((sub) => {
          seb.subscribe(
            (exit) =>
              pipe(
                exit,
                fold(
                  (e) => sub.error(e), // this represent an error in source that we propagate
                  EX.fold(
                    (b) => sub.next(b), // all fine
                    (e) => sub.error(e), // error in effect
                    (x) => {
                      sub.error(x); // effect aborted, (i.e. via raiseAbort)
                    },
                    () => {
                      // if effect is interrupted we won't get here
                    }
                  )
                )
              ),
            /* istanbul ignore next */
            (_) => {
              // never
            },
            () => sub.complete()
          );
        })
    );
}
