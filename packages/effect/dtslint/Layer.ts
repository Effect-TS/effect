import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"

interface In1 {}
interface Err1 {}
interface Out1 {}

declare const layer1: Layer.Layer<Out1, Err1, In1>

interface In2 {}
interface Err2 {}
interface Out2 {}

declare const layer2: Layer.Layer<Out2, Err2, In2>

interface In3 {}
interface Err3 {}
interface Out3 {}

declare const layer3: Layer.Layer<Out3, Err3, In3>

// -------------------------------------------------------------------------------------
// merge
// -------------------------------------------------------------------------------------

// @ts-expect-error
Layer.merge()

// $ExpectType Layer<Out1 | Out2, Err1 | Err2, In1 | In2>
Layer.merge(layer1, layer2)

// $ExpectType Layer<Out1 | Out2, Err1 | Err2, In1 | In2>
layer1.pipe(Layer.merge(layer2))

// -------------------------------------------------------------------------------------
// mergeAll
// -------------------------------------------------------------------------------------

// @ts-expect-error
Layer.mergeAll()

// $ExpectType Layer<Out1, Err1, In1>
Layer.mergeAll(layer1)

// $ExpectType Layer<Out1 | Out2, Err1 | Err2, In1 | In2>
Layer.mergeAll(layer1, layer2)

// $ExpectType Layer<Out1 | Out2 | Out3, Err1 | Err2 | Err3, In1 | In2 | In3>
Layer.mergeAll(layer1, layer2, layer3)

// -------------------------------------------------------------------------------------
// retry
// -------------------------------------------------------------------------------------

// $ExpectType Layer<Out1, Err1, In1>
layer1.pipe(
  Layer.retry(Schedule.recurs(1))
)
// $ExpectType Layer<Out1, Err1, In1>
Layer.retry(layer1, Schedule.recurs(1))
