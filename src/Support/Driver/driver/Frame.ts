import { Cause } from "../../../Exit"
import { Instructions, IPure } from "../../Common"
import { DoublyLinkedList } from "../../DoublyLinkedList"

export type RegionFrameType = InterruptFrame
export type FrameType = Frame | FoldFrame | RegionFrameType | MapFrame

export const FrameTag = "Frame" as const
export class Frame implements Frame {
  readonly tag = FrameTag
  constructor(readonly apply: (u: unknown) => Instructions) {}
}

export const FoldFrameTag = "FoldFrame" as const
export class FoldFrame implements FoldFrame {
  readonly tag = FoldFrameTag
  constructor(
    readonly apply: (u: unknown) => Instructions,
    readonly recover: (cause: Cause<unknown>) => Instructions
  ) {}
}

export const MapFrameTag = "MapFrame" as const
export class MapFrame implements MapFrame {
  readonly tag = MapFrameTag
  constructor(readonly apply: (u: unknown) => unknown) {}
}

export const InterruptFrameTag = "InterruptFrame" as const
export class InterruptFrame {
  readonly tag = InterruptFrameTag
  constructor(readonly interruptStatus: DoublyLinkedList<boolean>) {}
  apply(u: unknown) {
    this.interruptStatus.pop()
    return new IPure(u)
  }
  exitRegion() {
    this.interruptStatus.pop()
  }
}
