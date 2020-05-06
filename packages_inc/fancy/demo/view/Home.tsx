import { T, pipe } from "@matechs/prelude"
import Link from "next/link"
import React from "react"

import { UI, accessP } from "../../src"
import { DT } from "../modules/date"
import { DisplayFlash } from "../modules/flash/view"
import { ORG } from "../modules/orgs"

import { MemoInput } from "./MemoInput"

// alpha
/* istanbul ignore file */

// note, rendering supports only sync effect
// you can chain, compose, do everything except
// any async op (same as for runSync)
export const Home = UI.of(
  pipe(
    T.sequenceS({
      UpdateOrganisations: ORG.UpdateOrganisations,
      ShowOrgs: ORG.ShowOrgs,
      MemoInput,
      UpdateDate: DT.UpdateDate,
      ShowDate: DT.ShowDate,
      LogDate: DT.LogDate,
      Flash: DisplayFlash,
      Foo: accessP((_: { foo: string }) => _.foo) // requires initial props
    }),
    T.map((v) => (_: { bar: string }) => (
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
)
