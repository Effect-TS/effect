import * as T from "../../Effect"
import * as L from "../../Layer"
import * as Annotations from "../Annotations"
import * as Live from "../Live"
import * as TestClock from "../TestClock"

const defaultEnv = L.succeed(T.defaultEnv)

export const TestEnvironment = defaultEnv[">=>"](
  Annotations.live["+++"](Live.live)[">+>"](TestClock.defaultTestClock)
)
