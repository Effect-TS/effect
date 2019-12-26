import { effect as T, exit as E } from "@matechs/effect";
import * as RPC from "../src";
import * as H from "@matechs/http-client";
import * as L from "@matechs/http-client-libcurl";
import { pipe } from "fp-ts/lib/pipeable";
import { placeholderJsonM, placeholderJsonEnv } from "./shared";
import * as A from "fp-ts/lib/Array";

const { getTodo } = RPC.client(placeholderJsonM, placeholderJsonEnv);

const program = A.array.traverse(T.parEffect)(A.range(1, 10), getTodo);

const envLive = pipe(
  T.noEnv,
  T.mergeEnv(L.libcurl()),
  T.mergeEnv(H.jsonDeserializer),
  T.mergeEnv(
    RPC.clientConfig(
      placeholderJsonM,
      placeholderJsonEnv
    )({
      baseUrl: "http://127.0.0.1:8081/placeholderJson"
    })
  ),
  T.mergeEnv(
    H.middlewareStack([
      H.withPathHeaders({ token: "check" }, p =>
        p.startsWith("http://127.0.0.1:8081")
      )
    ])
  )
);

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
