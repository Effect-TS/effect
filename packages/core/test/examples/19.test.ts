import { flow, pipe } from "@effect-ts/system/Function"

import type { Ix } from "../../src/IndexedT/index.js"
import { indexedF } from "../../src/IndexedT/index.js"
import * as IO from "../../src/XPure/XIO/index.js"

export type DoorState = "DoorOpened" | "DoorClosed"

export const { chain, chainLower, ichain, iof, lift, lower } = indexedF<DoorState>()(
  IO.Monad
)

export const run = flow(lower<"DoorOpened", "DoorClosed">(), IO.run)

export const openedDoor: Ix<
  "DoorOpened",
  "DoorOpened",
  IO.XIO<number>
> = iof<"DoorOpened">()(0)

export const closedDoor: Ix<
  "DoorClosed",
  "DoorClosed",
  IO.XIO<number>
> = iof<"DoorClosed">()(0)

export const closeDoor = flow(
  ichain((n: number) => lift<"DoorOpened", "DoorClosed">()(IO.succeed(n + 1))),
  chainLower((n) => IO.succeedWith(() => n + 2))
)

test("19", () => {
  const program: Ix<"DoorOpened", "DoorClosed", IO.XIO<number>> = pipe(
    openedDoor,
    closeDoor
  )

  // Invalid program
  pipe(
    closedDoor,
    // @ts-expect-error
    closeDoor
  )

  expect(pipe(program, run)).toBe(3)
})
