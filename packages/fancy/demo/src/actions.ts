import { summon, tagged } from "morphic-ts/lib/batteries/summoner-no-union";

export const UpdateDate = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("UpdateDate")
    },
    "UpdateDate"
  )
);

export const AppActions = tagged("type")({ UpdateDate });
