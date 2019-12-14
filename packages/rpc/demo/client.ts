import { effect as T, exit as E } from "@matechs/effect";
import * as RPC from "@matechs/rpc";
import * as H from "@matechs/http-client";
import * as L from "@matechs/http-client-libcurl";
import { pipe } from "fp-ts/lib/pipeable";
import { placeholderJsonSpec, placeholderJsonEnv } from "./shared";
import * as A from "fp-ts/lib/Array";

const { getTodo } = RPC.client(placeholderJsonSpec, placeholderJsonEnv);

const program = A.array.traverse(T.parEffect)(A.range(1, 10), getTodo);

const envLive = pipe(
  T.noEnv,
  T.mergeEnv(L.libcurl()),
  T.mergeEnv(H.jsonDeserializer),
  T.mergeEnv(
    RPC.clientConfig(
      placeholderJsonSpec,
      placeholderJsonEnv
    )({
      baseUrl: "http://127.0.0.1:8081/placeholderJson"
    })
  )
);

// run express server
T.run(
  T.provideAll(envLive)(program),
  E.fold(
    todos => {
      console.log(todos);
    },
    e => console.error(e),
    e => console.error(e),
    () => console.error("interrupted")
  )
);
