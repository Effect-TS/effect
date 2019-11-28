import * as C from "../src";
import * as Z from "../src/zookeeper";
import { effect as T, exit as E } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { EnvA, processA } from "./processes/processA";
import { EnvB, processB } from "./processes/processB";
import { EnvC, processC } from "./processes/processC";
import { AppConfig } from "./config";

/*
  Declare environments for each process
*/

const envA: EnvA = {
  processA: {
    message: "log from processA",
    cleanMessage: "clean processA"
  }
};

const envB: EnvB = {
  processB: {
    message: "log from processB",
    cleanMessage: "clean processB"
  }
};

const envC: EnvC = {
  processC: {
    message: "log from processC",
    cleanMessage: "clean processC"
  }
};

/*
  Construct the cluster main
*/
const main = C.run(
  pipe(
    C.of(),
    C.provide(envA)(processA),
    C.provide(envB)(processB),
    C.provide(envC)(processC)
  )
);

/*
  Construct the cluster environment
*/
const env = pipe(
  T.noEnv,
  T.mergeEnv<AppConfig & Z.ZookeeperConfig>({
    config: { prefix: "running:", group: "demo" },
    zookeeper: {
      config: {
        url: "127.0.0.1:2181",
        electionPath: "/election"
      }
    }
  }),
  T.mergeEnv(Z.zookeeper)
);

/* Fork processes */
const exit = T.run(
  pipe(main, T.provide(env)),
  E.fold(
    () => {},
    () => {},
    e => {
      console.error(e);
    },
    () => {}
  )
);

/* Listen for exit and trigger clean (locally) */
process.on("SIGINT", () => {
  exit();

  setTimeout(() => {
    process.exit(0);
  }, 100);
});

/* Listen for exit and trigger clean (in k8s) */
process.on("SIGTERM", () => {
  exit();

  setTimeout(() => {
    process.exit(0);
  }, 100);
});
