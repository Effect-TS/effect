import * as Rx from "rxjs";
import { T, SE, Ex, pipe, E } from "@matechs/prelude";
import * as R from "./";

/**
 * Chain an effect into an rxjs .pipe()
 * Errors are propagated and non final
 */

export function chainEffect<A, E, B>(
  f: (a: A) => T.AsyncE<E, B>
): (o: Rx.Observable<A>) => Rx.Observable<B> {
  return (o) =>
    pipe(
      R.encaseObservableEither<A>(o), // wrap an eventual observable error in stream either
      SE.chain((a) => SE.encaseEffect(T.result(f(a)))),
      SE.toStream,
      R.toObservable, // convert to observable
      R.runToObservable // run effect as observable
    ).pipe(
      (seb) =>
        new Rx.Observable((sub) => {
          seb.subscribe(
            (exit) =>
              pipe(
                exit,
                E.fold(
                  (e) => sub.error(e), // this represent an error in source that we propagate
                  Ex.fold(
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
