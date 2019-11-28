import { effect as T, stream as S } from "@matechs/effect";
import * as C from "../../src";
import { AppConfig } from "../config";
import { pipe } from "fp-ts/lib/pipeable";

export type EnvC = {
  processC: {
    message: string;
    cleanMessage: string;
  };
};

/*
  Like in processB but process runs on nodes matching
  where condition
*/
export const processC = C.onMember(
  ({ config: { group } }: AppConfig) => group === "demo"
)(
  T.bracket(
    T.unit,
    _ =>
      T.accessM(({ processC: { cleanMessage } }: EnvC) =>
        T.sync(() => {
          console.log(cleanMessage);
        })
      ),
    _ =>
      pipe(
        S.periodically(1000),
        S.chain(_ =>
          pipe(
            T.accessM(
              ({
                config: { prefix },
                processC: { message }
              }: AppConfig & EnvC) =>
                T.sync(() => {
                  console.log(`${prefix} ${message}`);
                })
            ),
            S.encaseEffect
          )
        ),
        S.drain,
        T.chain(_ => T.never)
      )
  )
);
