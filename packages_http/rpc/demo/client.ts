import "isomorphic-fetch"
import * as H from "@matechs/http-client"
import * as L from "@matechs/http-client-fetch"
import { T, Ex, U, A, pipe } from "@matechs/prelude"
import * as RPC from "@matechs/rpc-client"

import { placeholderJsonM, placeholderJsonEnv } from "./shared"

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
