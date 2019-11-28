import { effect as T, stream as S } from "@matechs/effect";
import * as C from "../../src";
import { AppConfig } from "../config";
import { pipe } from "fp-ts/lib/pipeable";

export type EnvB = {
  processB: {
    message: string;
    cleanMessage: string;
  };
};

/*
  Like in processA but process runs on any node of the cluster
*/
export const processB = C.onAnyMember(
  T.bracket(
    T.unit,
    _ =>
      T.accessM(({ processB: { cleanMessage } }: EnvB) =>
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
                processB: { message }
              }: AppConfig & EnvB) =>
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
