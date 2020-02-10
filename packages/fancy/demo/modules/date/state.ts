import { effect as T } from "@matechs/effect";
import { summon, AsOpaque } from "@morphic-ts/batteries/lib/summoner-no-union";
import { AType, EType } from "@morphic-ts/batteries/lib/usage/utils";
import * as R from "../../../lib";

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

export const dateSURI = "@example/date";
export const dateS = R.atom({
  [dateSURI]: DateState.type
});
