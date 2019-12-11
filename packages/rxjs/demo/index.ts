import * as Rx from "rxjs";
import { filter } from "rxjs/operators";
import * as R from "../src";
import { fold } from "fp-ts/lib/Either";
import { stream as S, effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";

Rx.from([0, 1, 2, 3])
  .pipe(filter(n => n % 2 === 0))
  .pipe(s =>
    pipe(
      R.encaseObservableEither(s),
      S.chain(
        fold(
          e =>
            S.encaseEffect(
              T.sync(() => {
                console.error(e);
              })
            ),
          n =>
            S.encaseEffect(
              T.sync(() => {
                console.log(n);
              })
            )
        )
      ),
      R.toObservable,
      R.runToObservable
    )
  );
