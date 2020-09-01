import { flow, pipe } from "@effect-ts/system/Function"

import { indexedF } from "../../src/Classic/IndexedT"
import * as IO from "../../src/XPure/XIO"

export type DoorState = "DoorOpened" | "DoorClosed"

export const { ichain, iof, lift, lower } = indexedF<DoorState>()(IO.Monad)

export const run = flow(lower<"DoorOpened", "DoorClosed">(), IO.run)

export const closing = ichain((n: number) =>
  lift<"DoorOpened", "DoorClosed">()(IO.succeed(n + 1))
)

test("19", () => {
  expect(pipe(iof<"DoorOpened">()(0), closing, run)).toBe(1)
})
