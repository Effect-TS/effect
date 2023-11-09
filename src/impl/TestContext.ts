import type { DefaultServices } from "../DefaultServices.js"
import { pipe } from "../Function.js"
import * as defaultServices from "../internal/defaultServices.js"
import * as layer from "../internal/layer.js"
import type { Layer } from "../Layer.js"
import { TestClock } from "../TestClock.js"
import { TestServices } from "../TestServices.js"

/** @internal */
export const live: Layer<DefaultServices, never, TestServices> = pipe(
  TestServices.annotationsLayer(),
  layer.merge(TestServices.liveLayer()),
  layer.merge(TestServices.sizedLayer(100)),
  layer.merge(pipe(
    TestServices.liveLayer(),
    layer.merge(TestServices.annotationsLayer()),
    layer.provideMerge(TestClock.defaultTestClock)
  )),
  layer.merge(TestServices.testConfigLayer({ repeats: 100, retries: 100, samples: 200, shrinks: 1000 }))
)

/**
 * @since 2.0.0
 */
export const LiveContext: Layer<never, never, DefaultServices> = layer.syncContext(() => defaultServices.liveServices)

/**
 * @since 2.0.0
 */
export const TestContext: Layer<never, never, TestServices> = layer.provideMerge(LiveContext, live)
