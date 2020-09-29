import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import { has } from "../src/Has"

describe("Has", () => {
  it("use services", async () => {
    class AddService {
      sum(a: number, b: number) {
        return T.effectTotal(() => a + b)
      }
    }
    class MulService {
      prod(a: number, b: number) {
        return T.effectTotal(() => a * b)
      }
    }
    const Add = has(AddService)
    const Mul = has(MulService)

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
