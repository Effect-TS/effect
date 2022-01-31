// ets_tracing: off

import * as T from "../../Effect/index.js"
import * as L from "../../Layer/index.js"
import * as Random from "../../Random/index.js"
import * as Annotations from "../Annotations/index.js"
import * as Live from "../Live/index.js"
import * as TestClock from "../TestClock/index.js"

const defaultEnv = L.succeed(T.defaultEnv)

const deterministicRandom = L.fromEffect(Random.HasRandom)(
  T.succeedWith(() => new Random.LiveRandom(4374897389))
)

export const TestEnvironment = defaultEnv[">=>"](
  Annotations.live["+++"](Live.live)[">+>"](
    TestClock.defaultTestClock["+++"](deterministicRandom)
  )
)
