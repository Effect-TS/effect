import { effect as T } from "@matechs/effect";
import { summon, AsOpaque } from "@morphic-ts/batteries/lib/summoner-ESBAST";
import { AType, EType } from "@morphic-ts/batteries/lib/usage/utils";
import { State } from "../../../src";

// alpha
/* istanbul ignore file */

export const DateState_ = summon(F =>
  F.interface(
    {
      current: F.date()
    },
    "DateState"
  )
);

export interface DateState extends AType<typeof DateState_> {}
export interface DateStateR extends EType<typeof DateState_> {}
export const DateState = AsOpaque<DateStateR, DateState>(DateState_);

export const initialState = T.sync(() =>
  DateState.build({ current: new Date() })
);

export const dateStateURI = "@example/date";

export interface DateStateEnv
  extends State<{
    [dateStateURI]: DateState;
  }> {}
