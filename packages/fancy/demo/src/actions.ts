import { summon, tagged } from "morphic-ts/lib/batteries/summoner-no-union";

// alpha
/* istanbul ignore file */

export const UpdateDate = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("UpdateDate")
    },
    "UpdateDate"
  )
);

export const UpdateOrganisations = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("UpdateOrganisations")
    },
    "UpdateOrganisations"
  )
);

export const AppActions = tagged("type")({ UpdateDate, UpdateOrganisations });
