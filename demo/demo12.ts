import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as L from "../src/next/Layer"
import * as PM from "../src/next/ProcessManager"

const HasProcessA = PM.hasProcess("processA")()
const HasProcessB = PM.hasProcess("processB")()

const processA = pipe(
  T.effectTotal(() => {
    console.log("process A")
  }),
  T.delay(1000),
  T.forever,
  PM.makeProcess(HasProcessA)
)

const processB = pipe(
  T.effectTotal(() => {
    console.log("process B")
  }),
  T.delay(1000),
  T.forever,
  PM.makeProcess(HasProcessB)
)

const app = pipe(L.all(processA, processB), L.consuming(PM.processMapLayer))

const cancel = pipe(T.never, PM.monitored, T.provideSomeLayer(app), T.runMain)

process.on("SIGINT", () => {
  cancel()
})
