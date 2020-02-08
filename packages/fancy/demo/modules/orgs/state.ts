import { effect as T } from "@matechs/effect";
import { summon, AsOpaque } from "morphic-ts/lib/batteries/summoner-no-union";
import { AType, EType } from "morphic-ts/lib/usage/utils";
import { none } from "fp-ts/lib/Option";

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
