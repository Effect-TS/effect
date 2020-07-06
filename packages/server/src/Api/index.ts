import * as R from "../Router"
import {
  accessConfigM,
  config,
  server,
  Server,
  getRouteInput,
  body,
  getBodyBuffer,
  next,
  params,
  response,
  status,
  query,
  requestState,
  getRequestState,
  setRequestState
} from "../Server"

import * as T from "@matechs/core/Eff/Effect"
import * as Has from "@matechs/core/Eff/Has"
import * as L from "@matechs/core/Eff/Layer"

export const makeServer = <K>(has: Has.Augumented<Server, K>) => {
  return {
    getRouteInput,
    body,
    getBodyBuffer,
    next,
    params,
    response,
    status,
    query,
    has,
    child: R.child(has),
    getServerConfig: accessConfigM(has)(T.succeedNow),
    getServer: T.accessServiceM(has)(T.succeedNow),
    route: R.route(has),
    use: R.use(has),
    hasConfig: config(has),
    server: L.using_(R.root(has), server(has)),
    makeState: requestState,
    getState: getRequestState,
    setState: setRequestState
  }
}
