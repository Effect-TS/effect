import { Layer, Schedule } from "effect"
import { describe, expect, it } from "tstyche"

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

describe("Layer", () => {
  it("merge", () => {
    expect(Layer.merge).type.not.toBeCallableWith()

    expect(Layer.merge(layer1, layer2)).type.toBe<Layer.Layer<Out1 | Out2, Err1 | Err2, In1 | In2>>()
    expect(layer1.pipe(Layer.merge(layer2))).type.toBe<Layer.Layer<Out1 | Out2, Err1 | Err2, In1 | In2>>()
  })

  it("mergeAll", () => {
    expect(Layer.mergeAll).type.not.toBeCallableWith()

    expect(Layer.mergeAll(layer1)).type.toBe<Layer.Layer<Out1, Err1, In1>>()
    expect(Layer.mergeAll(layer1, layer2)).type.toBe<Layer.Layer<Out1 | Out2, Err1 | Err2, In1 | In2>>()
    expect(Layer.mergeAll(layer1, layer2, layer3))
      .type.toBe<Layer.Layer<Out1 | Out2 | Out3, Err1 | Err2 | Err3, In1 | In2 | In3>>()
  })

  it("retry", () => {
    expect(Layer.retry(layer1, Schedule.recurs(1))).type.toBe<Layer.Layer<Out1, Err1, In1>>()
    expect(layer1.pipe(Layer.retry(Schedule.recurs(1)))).type.toBe<Layer.Layer<Out1, Err1, In1>>()
  })
})
