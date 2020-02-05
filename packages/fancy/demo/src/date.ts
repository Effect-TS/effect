import { effect as T, freeEnv as F } from "@matechs/effect";
import * as R from "../../lib";
import * as S from "./state";

// alpha
/* istanbul ignore file */

export const dateOpsURI = Symbol();

export interface DateOps extends F.ModuleShape<DateOps> {
  [dateOpsURI]: {
    updateDate: T.UIO<S.AppState>;
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
    updateDate: R.updateS(S.dateL.modify(() => new Date())),
    accessDate: R.accessS(S.dateL.get)
  }
});

export const { updateDate, accessDate } = F.access(dateOpsSpec)[dateOpsURI];
