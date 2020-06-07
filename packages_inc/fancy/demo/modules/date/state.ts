import { State } from "../../../src"
import { make } from "../../morphic"

import * as T from "@matechs/core/Effect"
import * as M from "@matechs/morphic"

// alpha
/* istanbul ignore file */

export const DateState_ = make((F) =>
  F.interface(
    {
      current: F.date({ [M.ModelURI]: (x, _) => x, [M.FastCheckURI]: (x, _) => x })
    },
    "DateState"
  )
)

export interface DateState extends M.AType<typeof DateState_> {}
export interface DateStateR extends M.EType<typeof DateState_> {}
export const DateState = M.opaque<DateStateR, DateState>()(DateState_)

export const initialState = T.sync(() => DateState.build({ current: new Date() }))

export const dateStateURI = "@example/date"

export interface DateStateEnv
  extends State<{
    [dateStateURI]: DateState
  }> {}
