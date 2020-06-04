import "isomorphic-fetch"

import { placeholderJsonM, placeholderJsonEnv } from "./shared"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as U from "@matechs/core/Utils"
import * as H from "@matechs/http-client"
import * as L from "@matechs/http-client-fetch"
import * as RPC from "@matechs/rpc-client"

const { getTodo } = RPC.client(placeholderJsonM)

const program = pipe(A.range(1, 5), T.parTraverseArray(getTodo))

const envLive: U.Env<typeof program> = {
  ...L.client(fetch),
  ...H.middlewareStack([
    H.withPathHeaders({ token: "check" }, (p) => p.startsWith("http://127.0.0.1:8081"))
  ]),
  [RPC.clientConfigEnv]: {
    [placeholderJsonEnv]: {
      baseUrl: "http://127.0.0.1:8081/placeholderJson"
    }
  }
}

T.run(
  T.provide(envLive)(program),
  Ex.fold(
    (todos) => {
      console.log(todos)
    },
    (e) => console.error("error", e),
    (e) => console.error("abort", e),
    () => console.error("interrupted")
  )
)
