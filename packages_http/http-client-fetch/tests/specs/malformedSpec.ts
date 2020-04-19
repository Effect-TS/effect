import { T, Ex } from "@matechs/prelude";
import * as H from "@matechs/http-client";
import * as J from "@matechs/test-jest";

/* istanbul ignore file */

export const malformedSpec = J.testM(
  "malformed",
  T.Do()
    .bindL("get", () => T.result(H.get("ht-ps://wrong.com/todos/1")))
    .return(({ get }) => {
      J.assert.deepEqual(Ex.isRaise(get), true);
      J.assert.deepEqual(
        Ex.isRaise(get) && get.error._tag === H.HttpErrorReason.Request && get.error.error,
        new Error("only http(s) protocols are supported")
      );
    })
);
