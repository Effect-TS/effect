import { generic } from "../../../lib";
import { updateDate, accessDate } from "./def";
import { UpdateDate, ShowDate, LogDate } from "./views";
import { DateState, dateS } from "./state";
import { provideDateOps } from "./date";

export const dateModule = generic([dateS])(App => ({
  updateDate,
  accessDate,
  UpdateDate: UpdateDate(App),
  ShowDate: ShowDate(App),
  DateState,
  LogDate: LogDate(App),
  provide: provideDateOps(App)
}));

export { DateState, initialState } from "./state";
