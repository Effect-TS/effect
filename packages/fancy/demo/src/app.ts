import * as R from "../../lib";
import { effect as T } from "@matechs/effect";
import { summon, AsOpaque } from "morphic-ts/lib/batteries/summoner-no-union";
import { none } from "fp-ts/lib/Option";
import { AType, EType } from "morphic-ts/lib/usage/utils";

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

export const OrgsState_ = summon(F =>
  F.interface(
    {
      found: F.nullable(F.string()),
      error: F.nullable(F.string())
    },
    "OrgsState"
  )
);

export interface OrgsState extends AType<typeof OrgsState_> {}
export interface OrgsStateR extends EType<typeof OrgsState_> {}
export const OrgsState = AsOpaque<OrgsStateR, OrgsState>(OrgsState_);

export const App = R.app({
  date: DateState.type,
  orgs: OrgsState.type
})({
  date: T.sync(() => DateState.build({ current: new Date() })),
  orgs: T.pure(OrgsState.build({ error: none, found: none }))
});
