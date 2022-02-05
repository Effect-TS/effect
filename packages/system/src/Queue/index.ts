// ets_tracing: off

import "../Operator/index.js"

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZQueue.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

// codegen:start {preset: barrel, include: ./*.ts, exclude: ./+(promise|effect|effect-api).ts}
export * from "./api.js"
export * from "./core.js"
export * from "./unsafe.js"
export * from "./xqueue.js"
// codegen:end
