// ets_tracing: off

import "../Operator"

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZQueue.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

// codegen:start {preset: barrel, include: ./*.ts, exclude: ./+(promise|effect|effect-api).ts}
export * from "./api"
export * from "./core"
export * from "./unsafe"
export * from "./xqueue"
// codegen:end
