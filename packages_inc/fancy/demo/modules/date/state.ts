import { T } from "@matechs/prelude"
import { AsOpaque } from "@morphic-ts/batteries/lib/summoner-ESBST"
import { AType, EType } from "@morphic-ts/batteries/lib/usage/utils"
import { FastCheckURI } from "@morphic-ts/fastcheck-interpreters/lib/config"
import { IoTsURI } from "@morphic-ts/io-ts-interpreters/lib/config"

import { State } from "../../../src"
import { summon } from "../../morphic"

// alpha
/* istanbul ignore file */

export const DateState_ = summon((F) =>
  F.interface(
    {
      current: F.date({ [IoTsURI]: (x, _) => x, [FastCheckURI]: (x, _) => x })
    },
    "DateState"
  )
)

export interface DateState extends AType<typeof DateState_> {}
export interface DateStateR extends EType<typeof DateState_> {}
export const DateState = AsOpaque<DateStateR, DateState>()(DateState_)

export const initialState = T.sync(() => DateState.build({ current: new Date() }))

export const dateStateURI = "@example/date"

export interface DateStateEnv
  extends State<{
    [dateStateURI]: DateState
  }> {}
