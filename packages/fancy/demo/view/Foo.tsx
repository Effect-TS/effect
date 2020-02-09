import { effect as T } from "@matechs/effect";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/pipeable";
import Link from "next/link";
import { App, DATE } from "../src/app";

// alpha
/* istanbul ignore file */

export const Foo = App.ui.of(
  pipe(
    sequenceS(T.effect)({
      UpdateDate: DATE.UpdateDate,
      ShowDate: DATE.ShowDate
    }),
    T.map(v => () => (
      <>
        <v.ShowDate foo={"foo"} />
        <v.UpdateDate />
        <Link href={"/"}>
          <a>home</a>
        </Link>
      </>
    ))
  )
);
