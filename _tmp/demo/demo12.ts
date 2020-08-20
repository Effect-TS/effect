import { pipe } from "../src/Function"
import { has } from "../src/Has"
import * as R from "../src/Reader"

class DemoService {
  readonly n = 1
  printHello() {
    console.log("hello")
  }
}

const Demo = has(DemoService)

pipe(
  R.of(),
  R.bind("a", () => R.accessServiceM(Demo)((d) => R.succeed(d.n))),
  R.bind("b", ({ a }) => R.succeed(a + 2)),
  R.bind("c", ({ b }) => R.succeed(b + 3)),
  R.provideService(Demo)(new DemoService()),
  R.run,
  ({ a, b, c }) => {
    console.log(a, b, c)
  }
)
