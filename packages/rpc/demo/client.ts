import { effect as T, exit as E } from "@matechs/effect";
import { Env } from "@matechs/effect/lib/utils/types";
import * as RPC from "@matechs/rpc-client";
import * as H from "@matechs/http-client";
import * as L from "@matechs/http-client-libcurl";
import { placeholderJsonM, placeholderJsonEnv } from "./shared";
import * as A from "fp-ts/lib/Array";

const { getTodo } = RPC.client(placeholderJsonM);

const program = A.array.traverse(T.parEffect)(A.range(1, 10), getTodo);

const envLive: Env<typeof program> = {
  ...L.libcurl(),
  ...H.jsonDeserializer,
  ...H.middlewareStack([
    H.withPathHeaders({ token: "check" }, p =>
      p.startsWith("http://127.0.0.1:8081")
    )
  ]),
  [RPC.clientConfigEnv]: {
    [placeholderJsonEnv]: {
      baseUrl: "http://127.0.0.1:8081/placeholderJson"
    }
  }
};

T.run(
  T.provideAll(envLive)(program),
  E.fold(
    todos => {
      console.log(todos);
    },
    e => console.error("error", e),
    e => console.error("abort", e),
    () => console.error("interrupted")
  )
);
