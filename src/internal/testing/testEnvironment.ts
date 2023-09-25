import type * as DefaultServices from "../../DefaultServices"
import { pipe } from "../../Function"
import * as defaultServices from "../../internal/defaultServices"
import * as layer from "../../internal/layer"
import * as TestClock from "../../internal/testing/testClock"
import * as TestServices from "../../internal/testing/testServices"
import type * as Layer from "../../Layer"

/** @internal */
export const live: Layer.Layer<DefaultServices.DefaultServices, never, TestServices.TestServices> = pipe(
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

/** @internal */
export const liveContext = (): Layer.Layer<never, never, DefaultServices.DefaultServices> =>
  layer.syncContext(() => defaultServices.liveServices)

/** @internal */
export const testContext = (): Layer.Layer<never, never, TestServices.TestServices> =>
  layer.provideMerge(liveContext(), live)
