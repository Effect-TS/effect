import { State } from "../../../src"
import { make } from "../../morphic"

import * as T from "@matechs/core/Effect"
import * as O from "@matechs/core/Option"
import * as M from "@matechs/morphic"

// alpha
/* istanbul ignore file */

export const OrgsState_ = make((F) =>
  F.interface(
    {
      found: F.nullable(F.string()),
      error: F.nullable(F.string())
    },
    "OrgsState"
  )
)

export interface OrgsState extends M.AType<typeof OrgsState_> {}
export interface OrgsStateR extends M.EType<typeof OrgsState_> {}

export const OrgsState = M.opaque<OrgsStateR, OrgsState>()(OrgsState_)

export const initialState = T.pure(OrgsState.build({ error: O.none, found: O.none }))

export const orgsStateURI = "@example/orgs"

export interface OrgsStateEnv
  extends State<{
    [orgsStateURI]: OrgsState
  }> {}
