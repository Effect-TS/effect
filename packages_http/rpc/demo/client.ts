import { T, Ex, U, A, pipe } from "@matechs/prelude";
import * as RPC from "@matechs/rpc-client";
import * as H from "@matechs/http-client";
import * as L from "@matechs/http-client-libcurl";
import { placeholderJsonM, placeholderJsonEnv } from "./shared";

const { getTodo } = RPC.client(placeholderJsonM);

const program = pipe(A.range(1, 10), T.traverseArrayPar(getTodo));

const envLive: U.Env<typeof program> = {
  ...L.libcurl(),
  ...H.middlewareStack([
    H.withPathHeaders({ token: "check" }, (p) => p.startsWith("http://127.0.0.1:8081"))
  ]),
  [RPC.clientConfigEnv]: {
    [placeholderJsonEnv]: {
      baseUrl: "http://127.0.0.1:8081/placeholderJson"
    }
  }
};

T.run(
  T.provide(envLive)(program),
  Ex.fold(
    (todos) => {
      console.log(todos);
    },
    (e) => console.error("error", e),
    (e) => console.error("abort", e),
    () => console.error("interrupted")
  )
);
