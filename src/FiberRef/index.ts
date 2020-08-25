/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/FiberRef.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

// codegen:start {preset: barrel, include: ./*.ts}
export * from "./fiberRef"
export * from "./get"
export * from "./getAndSet"
export * from "./getAndUpdate"
export * from "./getAndUpdateSome"
export * from "./locally"
export * from "./make"
export * from "./modify"
export * from "./set"
export * from "./update"
// codegen:end
