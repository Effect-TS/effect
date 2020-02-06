import { effect as T } from "@matechs/effect";
import { sequenceS } from "fp-ts/lib/Apply";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import Link from "next/link";
import { App } from "../src/app";
import * as S from "../src/state";
import { ShowDate } from "./ShowDate";
import { UpdateDate } from "./UpdateDate";

// alpha
/* istanbul ignore file */

export const Foo = App.view(() =>
  pipe(
    sequenceS(T.effect)({
      UpdateDate,
      ShowDate
    }),
    T.map(({ UpdateDate, ShowDate }) =>
      App.withState(({ state }) => (
        <>
          <ShowDate />
          <UpdateDate />
          {pipe(
            state,
            S.orgsL.get,
            O.map(orgs => <div>{orgs}</div>),
            O.toNullable
          )}
          <Link href={"/"}>
            <a>home</a>
          </Link>
        </>
      ))
    )
  )
);
