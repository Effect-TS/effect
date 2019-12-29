import * as W from "../src";
import * as L from "@matechs/logger";
import { effect as T, freeEnv as F } from "@matechs/effect";
import * as assert from "assert";
import { createLogger, transports } from "winston";
import { isDone } from "@matechs/effect/lib/exit";
import { pipe } from "fp-ts/lib/pipeable";
import stdMocks from "std-mocks";
import { Level } from "@matechs/logger/lib/logger";

const factory = F.implement(W.winstonFactoryM)({
  [W.winstonFactoryEnv]: {
    logger: T.pure(
      createLogger({
        transports: [
          new transports.Console({
            level: "silly"
          })
        ]
      })
    )
  }
});

async function testLevel(level: Level) {
  stdMocks.use();

  const res = await T.runToPromiseExit(
    pipe(L.logger[level]("msg", { foo: "bar" }), W.winstonLogger, factory)
  );

  const messages = stdMocks.flush();

  stdMocks.restore();

  assert.deepEqual(isDone(res), true);
  assert.deepEqual(
    messages.stdout.map(s => s.trim()),
    [JSON.stringify({ foo: "bar", level, message: "msg" })]
  );
}

describe("Winston", () => {
  it("use winston", async () => {
    await testLevel("info");
    await testLevel("silly");
    await testLevel("debug");
    await testLevel("warn");
    await testLevel("http");
    await testLevel("verbose");
    await testLevel("error");
  });
});
