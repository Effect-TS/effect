import * as assert from "assert"

import * as L from "@matechs/logger"
import { T, Service as F, Ex } from "@matechs/prelude"
import { pipe } from "fp-ts/lib/pipeable"
import { Logger } from "winston"

import * as W from "../src"

const messages: any[][] = []

const factory = F.implement(W.winstonFactoryM)({
  [W.winstonFactoryEnv]: {
    logger: T.pure({
      log: (...args: any[]) => {
        messages.push(args)
      }
    } as Logger)
  }
})

function testLevel(level: L.logger.Level) {
  messages.splice(0, messages.length)

  const res = pipe(
    L.logger[level]("msg", { foo: "bar" }),
    W.provideWinstonLogger,
    factory,
    T.runSync
  )

  assert.deepStrictEqual(Ex.isDone(res), true)
  assert.deepStrictEqual(messages, [[level, "msg", { foo: "bar" }]])
}

describe("Winston", () => {
  it("use winston", () => {
    testLevel("info")
    testLevel("silly")
    testLevel("debug")
    testLevel("warn")
    testLevel("http")
    testLevel("verbose")
    testLevel("error")
  })
})
