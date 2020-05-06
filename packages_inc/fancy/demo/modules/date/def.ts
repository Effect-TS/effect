import { Service as F, T } from "@matechs/prelude"

// alpha
/* istanbul ignore file */

export const dateOpsURI = Symbol()

export interface DateOps extends F.ModuleShape<DateOps> {
  [dateOpsURI]: {
    updateDate: T.Sync<Date>
    accessDate: T.Sync<Date>
  }
}

export const dateOpsSpec = F.define<DateOps>({
  [dateOpsURI]: {
    updateDate: F.cn(),
    accessDate: F.cn()
  }
})

export const { accessDate, updateDate } = F.access(dateOpsSpec)[dateOpsURI]
