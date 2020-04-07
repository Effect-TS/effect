import { effect as T, exit as E } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as J from "@matechs/test-jest";
import { Do } from "fp-ts-contrib/lib/Do";
import * as O from "fp-ts/lib/Option";

/* istanbul ignore file */

export const getHttpsSpec = J.testM(
  "get https",
  Do(T.effect)
    .bindL("get", () => T.result(H.get("https://jsonplaceholder.typicode.com/todos/1")))
    .return(({ get }) => {
      J.assert.deepEqual(E.isDone(get), true);
      J.assert.deepEqual(
        E.isDone(get) && get.value.body,
        O.some({
          userId: 1,
          id: 1,
          title: "delectus aut autem",
          completed: false
        })
      );
    })
);
