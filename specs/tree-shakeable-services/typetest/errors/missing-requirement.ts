// Running a program without providing an operation it uses.
import * as Effect from "effect/Effect"
import { backup } from "../../src/program.ts"

Effect.runPromise(backup("a.txt"))
