import { effect as T } from "@matechs/effect";
import { summon, AsOpaque } from "@morphic-ts/batteries/lib/summoner-no-union";
import { AType, EType } from "@morphic-ts/batteries/lib/usage/utils";
import { none } from "fp-ts/lib/Option";
import * as R from "../../../lib";

// alpha
/* istanbul ignore file */

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

export const initialState = T.pure(
  OrgsState.build({ error: none, found: none })
);

export const orgsSURI = "@example/orgs";
export const orgsS = R.atom({
  [orgsSURI]: OrgsState.type
});
