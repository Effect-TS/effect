import { effect as T, freeEnv as F } from "@matechs/effect";
import { App } from "./app";
import { summon, AsOpaque } from "morphic-ts/lib/batteries/summoner-no-union";
import { AType, EType } from "morphic-ts/lib/usage/utils";

// alpha
/* istanbul ignore file */

export const dateOpsURI = Symbol();

export interface DateOps extends F.ModuleShape<DateOps> {
  [dateOpsURI]: {
    updateDate: T.UIO<Date>;
    accessDate: T.UIO<Date>;
  };
}

export const dateOpsSpec = F.define<DateOps>({
  [dateOpsURI]: {
    updateDate: F.cn(),
    accessDate: F.cn()
  }
});

export const provideDateOps = F.implement(dateOpsSpec)({
  [dateOpsURI]: {
    updateDate: App.accessS(["date"])(({ date }) => {
      date.current = new Date();
      return date.current;
    }),
    accessDate: App.accessS(["date"])(({ date }) => date.current)
  }
});

export const { updateDate, accessDate } = F.access(dateOpsSpec)[dateOpsURI];

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
