import { effect as T, exit as E } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as J from "@matechs/test-jest";
import { pipe } from "fp-ts/lib/pipeable";

export const cancelSpec = J.testM(
  "cancel",
  pipe(
    T.fork(H.get("https://jsonplaceholder.typicode.com/todos/1")),
    T.chain((f) => f.interrupt),
    T.map((res) => {
      J.assert.deepEqual(res && E.isInterrupt(res), true);
    })
  )
);
