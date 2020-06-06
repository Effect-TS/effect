import Link from "next/link"
import React from "react"

import { UI } from "../../src"
import { DT } from "../modules/date"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"

// alpha
/* istanbul ignore file */

export const Foo = UI.of(
  pipe(
    T.sequenceS({
      UpdateDate: DT.UpdateDate,
      ShowDate: DT.ShowDate
    }),
    T.map((v) => () => (
      <>
        <v.ShowDate foo={"foo"} />
        <v.UpdateDate />
        <Link href={"/"}>
          <a>home</a>
        </Link>
      </>
    ))
  )
)
