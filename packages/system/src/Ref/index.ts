// ets_tracing: off

import "../Operator/index.js"

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZRef.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
// codegen:start {preset: barrel, include: ./*.ts, exclude: ./+(managed|effect|atomic).ts}
export * from "./api.js"
export * from "./makeManagedRef.js"
export * from "./XRef.js"
// codegen:end
