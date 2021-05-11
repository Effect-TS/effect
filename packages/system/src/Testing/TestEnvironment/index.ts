import * as T from "../../Effect"
import * as L from "../../Layer"
import * as Random from "../../Random"
import * as Annotations from "../Annotations"
import * as Live from "../Live"
import * as TestClock from "../TestClock"

const defaultEnv = L.succeed(T.defaultEnv)

const deterministicRandom = L.fromEffect(Random.HasRandom)(
  T.succeedWith(() => new Random.LiveRandom(4374897389))
)

export const TestEnvironment = defaultEnv[">=>"](
  Annotations.live["+++"](Live.live)[">+>"](
    TestClock.defaultTestClock["+++"](deterministicRandom)
  )
)
