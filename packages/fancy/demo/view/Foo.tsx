import { effect as T } from "@matechs/effect";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/pipeable";
import Link from "next/link";
import { App } from "../src/app";
import { UpdateDate, ShowDate } from "../modules/date/views";

// alpha
/* istanbul ignore file */

export const Foo = App.ui.of(
  pipe(
    sequenceS(T.effect)({
      UpdateDate: UpdateDate(App),
      ShowDate: ShowDate(App, "date")
    }),
    T.map(({ UpdateDate, ShowDate }) => () => (
      <>
        <ShowDate />
        <UpdateDate />
        <Link href={"/"}>
          <a>home</a>
        </Link>
      </>
    ))
  )
);
