import { effect as T, freeEnv as F } from "@matechs/effect";
import { App } from "./app";

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
    updateDate: App.accessS(s => {
      s.date.current = new Date();
      return s.date.current;
    }),
    accessDate: App.accessS(s => s.date.current)
  }
});

export const { updateDate, accessDate } = F.access(dateOpsSpec)[dateOpsURI];
