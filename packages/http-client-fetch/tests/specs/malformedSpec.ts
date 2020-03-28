import { effect as T, exit as E } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as J from "@matechs/test-jest";
import { Do } from "fp-ts-contrib/lib/Do";

export const malformedSpec = J.testM(
  "malformed",
  Do(T.effect)
    .bindL("get", () => T.result(H.get("ht-ps://wrong.com/todos/1")))
    .return(({ get }) => {
      J.assert.deepEqual(E.isRaise(get), true);
      J.assert.deepEqual(
        E.isRaise(get) &&
          get.error._tag === H.HttpErrorReason.Request &&
          get.error.error,
        new Error("only http(s) protocols are supported")
      );
    })
);
