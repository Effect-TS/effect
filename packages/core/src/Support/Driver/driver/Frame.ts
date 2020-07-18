import { Cause } from "../../../Exit"
import { Instructions, IPure, ISuspended } from "../../Common"

export type RegionFrameType = InterruptFrame
export type FrameType = Frame | FoldFrame | RegionFrameType | MapFrame

export const FrameTag = "Frame" as const
export class Frame implements Frame {
  readonly _tag = FrameTag
  constructor(
    readonly apply: (u: unknown) => Instructions,
    readonly p: FrameType | undefined
  ) {}
}

export const FoldFrameTag = "FoldFrame" as const
export class FoldFrame implements FoldFrame {
  readonly _tag = FoldFrameTag
  constructor(
    readonly apply: (u: unknown) => Instructions,
    readonly recover: (cause: Cause<unknown>) => Instructions,
    readonly p: FrameType | undefined
  ) {}
}

export const MapFrameTag = "MapFrame" as const
export class MapFrame implements MapFrame {
  readonly _tag = MapFrameTag
  constructor(readonly f: (u: unknown) => unknown, readonly p: FrameType | undefined) {}
  apply(u: unknown) {
    return new ISuspended(() => new IPure(this.f(u)) as any)
  }
}

export class InterruptRegionFrame {
  constructor(
    readonly current: boolean,
    readonly previous: InterruptRegionFrame | undefined
  ) {}
}

export class RefInterruptRegionFrame {
  constructor(public ref: InterruptRegionFrame | undefined) {}
}

export const InterruptFrameTag = "InterruptFrame" as const
export class InterruptFrame {
  readonly _tag = InterruptFrameTag
  constructor(
    readonly interruptStatus: RefInterruptRegionFrame,
    readonly p: FrameType | undefined
  ) {}
  apply(u: unknown) {
    this.interruptStatus.ref = this.interruptStatus.ref?.previous
    return new IPure(u)
  }
  exitRegion() {
    this.interruptStatus.ref = this.interruptStatus.ref?.previous
  }
}
