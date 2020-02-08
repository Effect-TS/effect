import { effect as T } from "@matechs/effect";
import { sequenceS } from "fp-ts/lib/Apply";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import Link from "next/link";
import { App } from "../src/app";
import { MemoInput } from "./MemoInput";
import { UpdateDate, ShowDate } from "../modules/date/views";
import { UpdateOrganisations } from "../modules/orgs/views";

// alpha
/* istanbul ignore file */

export const Home = App.ui.of(
  pipe(
    sequenceS(T.effect)({
      UpdateDate: UpdateDate(App),
      UpdateOrganisations: UpdateOrganisations(App),
      ShowDate: ShowDate(App, "date"),
      MemoInput
    }),
    T.chain(({ UpdateDate, ShowDate, UpdateOrganisations, MemoInput }) =>
      App.withState(["orgs"])()(
        T.pure(({ orgs: { found, error } }) => (
          <>
            <ShowDate />
            <UpdateDate />
            <UpdateOrganisations />
            {pipe(
              found,
              O.map(orgs => <div>{orgs}</div>),
              O.toNullable
            )}
            {pipe(
              error,
              O.map(error => <div>{error}</div>),
              O.toNullable
            )}
            <MemoInput />
            <Link href={"/foo"}>
              <a>foo</a>
            </Link>
          </>
        ))
      )
    )
  )
);
