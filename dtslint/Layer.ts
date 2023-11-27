import * as Layer from "effect/Layer"

interface In1 {}
interface Err1 {}
interface Out1 {}

declare const layer1: Layer.Layer<In1, Err1, Out1>

interface In2 {}
interface Err2 {}
interface Out2 {}

declare const layer2: Layer.Layer<In2, Err2, Out2>

interface In3 {}
interface Err3 {}
interface Out3 {}

declare const layer3: Layer.Layer<In3, Err3, Out3>

// -------------------------------------------------------------------------------------
// merge
// -------------------------------------------------------------------------------------

// @ts-expect-error
Layer.merge()

// $ExpectType Layer<In1 | In2, Err1 | Err2, Out1 | Out2>
Layer.merge(layer1, layer2)

// $ExpectType Layer<In1 | In2, Err1 | Err2, Out1 | Out2>
layer1.pipe(Layer.merge(layer2))

// -------------------------------------------------------------------------------------
// mergeAll
// -------------------------------------------------------------------------------------

// @ts-expect-error
Layer.mergeAll()

// $ExpectType Layer<In1, Err1, Out1>
Layer.mergeAll(layer1)

// $ExpectType Layer<In1 | In2, Err1 | Err2, Out1 | Out2>
Layer.mergeAll(layer1, layer2)

// $ExpectType Layer<In1 | In2 | In3, Err1 | Err2 | Err3, Out1 | Out2 | Out3>
Layer.mergeAll(layer1, layer2, layer3)
