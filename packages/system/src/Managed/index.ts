// tracing: off

import "../Operator"

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZManaged.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

// codegen:start {preset: barrel, include: ./*.ts, exclude: ./deps*.ts}
export * from "./core"
export * from "./do"
export * from "./forEach"
export * from "./fork"
export * from "./fromEffect"
export * from "./makeExit"
export * from "./managed"
export * from "./struct"
export * from "./succeed"
export * from "./tuple"
export * from "./use"
// codegen:end

// codegen:start { preset: barrel, include: ./methods/*.ts }
export * from "./methods/absolve"
export * from "./methods/api"
export * from "./methods/ensuringFirst"
export * from "./methods/environment"
export * from "./methods/foldM_"
export * from "./methods/foldM"
export * from "./methods/fromEither"
export * from "./methods/gen"
export * from "./methods/halt"
export * from "./methods/ifM"
export * from "./methods/iterate"
export * from "./methods/loop"
export * from "./methods/makeEffect"
export * from "./methods/mapN"
export * from "./methods/preallocationScope"
export * from "./methods/provideAll"
export * from "./methods/releaseMap"
export * from "./methods/require"
export * from "./methods/runtime"
export * from "./methods/suspend"
export * from "./methods/swap"
export * from "./methods/switchable"
export * from "./methods/union"
export * from "./methods/updateService"
// codegen:end
