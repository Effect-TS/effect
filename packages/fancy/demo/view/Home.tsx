import React from "react"
import { effect as T } from "@matechs/effect";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/pipeable";
import Link from "next/link";
import { MemoInput } from "./MemoInput";
import { DT } from "../modules/date";
import { ORG } from "../modules/orgs";
import { UI, accessP } from "../../lib";
import { DisplayFlash } from "../modules/flash/view";

// alpha
/* istanbul ignore file */

// note, rendering supports only sync effect
// you can chain, compose, do everything except
// any async op (same as for runSync)
export const Home = UI.of(
  pipe(
    sequenceS(T.effect)({
      UpdateOrganisations: ORG.UpdateOrganisations,
      ShowOrgs: ORG.ShowOrgs,
      MemoInput,
      UpdateDate: DT.UpdateDate,
      ShowDate: DT.ShowDate,
      LogDate: DT.LogDate,
      Flash: DisplayFlash,
      Foo: accessP((_: { foo: string }) => _.foo) // requires initial props
    }),
    T.map(v => (_: { bar: string }) => (
      <>
        <v.MemoInput />
        <br />
        <v.ShowDate foo={v.Foo} />
        <v.UpdateDate />
        <v.UpdateOrganisations />
        <v.ShowOrgs />
        <v.LogDate />
        <v.Flash>{({ message }) => <div>{message}</div>}</v.Flash>
        <br />
        <Link href={"/"}>
          <a>home</a>
        </Link>
      </>
    ))
  )
);
