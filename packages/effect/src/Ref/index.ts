/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZRef.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
// codegen:start {preset: barrel, include: ./*.ts, exclude: ./atomic.ts}
export * from "./api"
export * from "./makeManagedRef"
export * from "./XRef"
// codegen:end
