import { App } from "../../../lib";
import { updateDate, accessDate } from "./def";
import { UpdateDate, ShowDate } from "./views";
import { DateState } from "./state";
import { provideDateOps } from "./date";

export function dateModule<
  URI extends string & keyof S,
  S extends { [k in URI]: DateState }
>(App: App<S>, URI: URI) {
  return {
    updateDate,
    accessDate,
    UpdateDate: UpdateDate(App),
    ShowDate: ShowDate(App, URI),
    DateState,
    provide: provideDateOps(App, URI)
  };
}

export { DateState, initialState } from "./state";
