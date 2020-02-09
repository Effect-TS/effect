import {
  summon,
  tagged,
  AsOpaque
} from "morphic-ts/lib/batteries/summoner-no-union";
import { AOfMorhpADT } from "morphic-ts/lib/usage/tagged-union";
import { AType, EType } from "morphic-ts/lib/usage/utils";

// alpha
/* istanbul ignore file */

export const UpdateDate_ = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("UpdateDate")
    },
    "UpdateDate"
  )
);
export interface UpdateDate extends AType<typeof UpdateDate_> {}
export interface UpdateDateR extends EType<typeof UpdateDate_> {}
export const UpdateDate = AsOpaque<UpdateDateR, UpdateDate>(UpdateDate_);

export const UpdateOrganisations_ = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("UpdateOrganisations")
    },
    "UpdateOrganisations"
  )
);

export interface UpdateOrganisations
  extends AType<typeof UpdateOrganisations_> {}
export interface UpdateOrganisationsR
  extends EType<typeof UpdateOrganisations_> {}
export const UpdateOrganisations = AsOpaque<
  UpdateOrganisationsR,
  UpdateOrganisations
>(UpdateOrganisations_);

export const AppActions = tagged("type")({ UpdateDate, UpdateOrganisations });

export type AppActions = AOfMorhpADT<typeof AppActions>;
