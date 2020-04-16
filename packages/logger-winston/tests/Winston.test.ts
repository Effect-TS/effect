import { effect as T, freeEnv as F } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import * as L from "@matechs/logger";
import * as assert from "assert";
import { pipe } from "fp-ts/lib/pipeable";
import { Logger } from "winston";
import * as W from "../src";

const messages: any[][] = [];

const factory = F.implement(W.winstonFactoryM)({
  [W.winstonFactoryEnv]: {
    logger: T.pure({
      log: (...args: any[]) => {
        messages.push(args);
      }
    } as Logger)
  }
});

async function testLevel(level: L.logger.Level) {
  messages.splice(0, messages.length);

  const res = await T.runToPromiseExit(
    pipe(L.logger[level]("msg", { foo: "bar" }), W.provideWinstonLogger, factory)
  );

  assert.deepEqual(isDone(res), true);
  assert.deepEqual(messages, [[level, "msg", { foo: "bar" }]]);
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
