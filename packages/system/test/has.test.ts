import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import { ServiceId, tag } from "../src/Has"

describe("Has", () => {
  it("use services", async () => {
    const AddServiceId = Symbol()

    class AddService {
      readonly [ServiceId]: typeof AddServiceId = AddServiceId

      sum(a: number, b: number) {
        return T.succeedWith(() => a + b)
      }
    }

    const MulServiceId = Symbol()

    class MulService {
      readonly [ServiceId]: typeof MulServiceId = MulServiceId

      prod(a: number, b: number) {
        return T.succeedWith(() => a * b)
      }
    }
    const Add = tag<AddService>(AddServiceId)
    const Mul = tag<MulService>(MulServiceId)

    const result = await pipe(
      T.accessServicesM({ add: Add, mul: Mul })((_) =>
        pipe(
          _.add.sum(2, 3),
          T.chain((n) => _.mul.prod(n, 3))
        )
      ),
      T.provideService(Add)(new AddService()),
      T.provideService(Mul)(new MulService()),
      T.runPromise
    )

    expect(result).toEqual(15)
  })
})
