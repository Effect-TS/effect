import React from "react"

import * as R from "../../src"
import { DT } from "../modules/date"
import { dateStateURI } from "../modules/date/state"
import { flashInitialState, flashStateURI } from "../modules/flash/state"
import { ORG } from "../modules/orgs"
import { orgsStateURI } from "../modules/orgs/state"
import { Home } from "../view/Home"

import * as T from "@matechs/core/Effect"
import { combine } from "@matechs/core/Provider"

// alpha
/* istanbul ignore file */

const provider = combine().with(ORG.provide).with(DT.provide).done()

const PlainComponent = R.react(provider(Home))({
  [dateStateURI]: DT.initial,
  [orgsStateURI]: ORG.initial,
  [flashStateURI]: flashInitialState
})(
  // in react initial props can only be sync
  T.pure({
    foo: "ok"
  })
)

// tslint:disable-next-line: no-default-export
export default () => <PlainComponent bar={"ok"} />
