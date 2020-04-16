import React from "react"
import { effect as T } from "@matechs/effect";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/pipeable";
import Link from "next/link";
import { DT } from "../modules/date";
import { UI } from "../../src";

// alpha
/* istanbul ignore file */

export const Foo = UI.of(
  pipe(
    sequenceS(T.effect)({
      UpdateDate: DT.UpdateDate,
      ShowDate: DT.ShowDate
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
