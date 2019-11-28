import { effect as T, stream as S } from "@matechs/effect";
import * as C from "../../src";
import { AppConfig } from "../config";
import { pipe } from "fp-ts/lib/pipeable";

export type EnvA = {
  processA: {
    message: string;
    cleanMessage: string;
  };
};

/*
 Each process is represented as an effect that never returns and can fail
 if a process fails the full packaged cluster will trigger a fail fast procedure
 upon exit an interruptor call will be triggered on the process and you can
 use normal bracket to cleanup resources.

 This process is defined to run only on the leader of an election happening
 in zookeeper on the path /election/process-a-leader

 Each instance joins the cluster and if elected as leader runs the tasks else
 watch the leader for exit events, in case of an exit event is found a new election
 is performed.

 This election will run only on nodes matching where criteria.

 Note each process can require custom environment (including environmental modules)
 */
export const processA = C.onLeader({
  processId: "process-a-leader",
  where: ({ config: { group } }: AppConfig) => group === "demo"
})(
  T.bracket(
    T.unit,
    _ =>
      T.accessM(({ processA: { cleanMessage } }: EnvA) =>
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
                processA: { message }
              }: AppConfig & EnvA) =>
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
