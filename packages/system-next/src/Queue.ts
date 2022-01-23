/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZQueue.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

// codegen:start {preset: barrel, include: ./Queue/*.ts, exclude: ./Queue/+(promise|effect|effect-api).ts}
export * from "./Queue/api"
export * from "./Queue/core"
export * from "./Queue/unsafe"
export * from "./Queue/xqueue"
// codegen:end
