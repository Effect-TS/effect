import { effect as T, exit as E, managed as M } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as J from "@matechs/test-jest";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { expressM } from "../resources/expressM";

export const get404Spec = J.testM(
  "get 404",
  M.use(expressM(4016), () =>
    Do(T.effect)
      .bindL("get", () =>
        T.result(
          pipe(
            H.get("http://127.0.0.1:4016/"),
            T.mapError(
              H.foldHttpError(
                (_) => 0,
                ({ status }) => status
              )
            )
          )
        )
      )
      .return(({ get }) => {
        J.assert.deepEqual(E.isRaise(get), true);
        J.assert.deepEqual(E.isRaise(get) && get.error, 404);
      })
  )
);
