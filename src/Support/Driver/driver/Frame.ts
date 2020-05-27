import { Cause } from "../../../Exit"
import { Instructions, IPure } from "../../Common"

export type RegionFrameType = InterruptFrame
export type FrameType = Frame | FoldFrame | RegionFrameType | MapFrame

export const FrameTag = "Frame" as const
export class Frame implements Frame {
  constructor(
    readonly apply: (u: unknown) => Instructions,
    readonly prev: FrameType | undefined
  ) {}
  tag() {
    return FrameTag
  }
}

export const FoldFrameTag = "FoldFrame" as const
export class FoldFrame implements FoldFrame {
  constructor(
    readonly apply: (u: unknown) => Instructions,
    readonly recover: (cause: Cause<unknown>) => Instructions,
    readonly prev: FrameType | undefined
  ) {}
  tag() {
    return FoldFrameTag
  }
}

export const MapFrameTag = "MapFrame" as const
export class MapFrame implements MapFrame {
  constructor(
    readonly apply: (u: unknown) => unknown,
    readonly prev: FrameType | undefined
  ) {}
  tag() {
    return MapFrameTag
  }
}

export const InterruptFrameTag = "InterruptFrame" as const
export class InterruptFrame {
  constructor(
    readonly interruptStatus: boolean[],
    readonly prev: FrameType | undefined
  ) {}
  apply(u: unknown) {
    this.interruptStatus.pop()
    return new IPure(u)
  }
  exitRegion() {
    this.interruptStatus.pop()
  }
  tag() {
    return InterruptFrameTag
  }
}
