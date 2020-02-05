import { summon, AsOpaque } from "morphic-ts/lib/batteries/summoner-no-union";
import { AType, EType } from "morphic-ts/lib/usage/utils";

// alpha
/* istanbul ignore file */

const AppState_ = summon(F =>
  F.interface(
    {
      date: F.date(),
      orgs: F.nullable(F.string()),
      error: F.nullable(F.string())
    },
    "AppState"
  )
);

export interface AppState extends AType<typeof AppState_> {}
export interface AppStateR extends EType<typeof AppState_> {}

export const AppState = AsOpaque<AppStateR, AppState>(AppState_);

export const dateL = AppState.lenseFromProp("date");
export const errorL = AppState.lenseFromProp("error");
export const orgsL = AppState.lenseFromProp("orgs");
