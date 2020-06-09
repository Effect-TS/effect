import { State } from "../../../src"

import * as T from "@matechs/core/Effect"
import * as M from "@matechs/morphic"

// alpha
/* istanbul ignore file */

export const DateState_ = M.make((F) =>
  F.mutable(
    F.interface({
      current: F.date()
    })
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
