import { provideDateOps } from "./date";
import { accessDate, updateDate } from "./def";
import { DateState } from "./state";
import { LogDate, ShowDate, UpdateDate } from "./views";

export const DT = {
  updateDate,
  accessDate,
  UpdateDate,
  ShowDate,
  DateState,
  LogDate,
  provide: provideDateOps
};

export { DateState, initialState } from "./state";
