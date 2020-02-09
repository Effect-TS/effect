import { effect as T } from "@matechs/effect";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/pipeable";
import Link from "next/link";
import { App, DATE, ORGS } from "../src/app";
import { MemoInput } from "./MemoInput";

// alpha
/* istanbul ignore file */

export const Home = App.ui.of(
  pipe(
    sequenceS(T.effect)({
      UpdateDate: DATE.UpdateDate,
      UpdateOrganisations: ORGS.UpdateOrganisations,
      ShowDate: DATE.ShowDate,
      ShowOrgs: ORGS.ShowOrgs,
      MemoInput,
      LogDate: DATE.LogDate
    }),
    T.map(v => () => (
      <>
        <v.ShowDate foo={"foo"} />
        <v.UpdateDate />
        <v.UpdateOrganisations />
        <v.ShowOrgs />
        <v.MemoInput />
        <Link href={"/foo"}>
          <a>foo</a>
        </Link>
        <v.LogDate />
      </>
    ))
  )
);
