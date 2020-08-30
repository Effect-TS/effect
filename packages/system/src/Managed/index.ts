/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZManaged.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

// codegen:start {preset: barrel, include: ./*.ts, exclude: ./deps.ts}
export * from "./core"
export * from "./do"
export * from "./internals"
export * from "./managed"
export * from "./releaseMap"
export * from "./sequenceS"
export * from "./sequenceT"
// codegen:end

// codegen:start { preset: barrel, include: ./methods/*.ts }
export * from "./methods/releaseMap"
export * from "./methods/switchable"
// codegen:end
