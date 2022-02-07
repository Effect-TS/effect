// ets_tracing: off

export const SinkEndReasonTypeId = Symbol()

export const SinkEndTypeId = Symbol()
export class SinkEnd {
  readonly _sinkEndReasonTypeId: typeof SinkEndReasonTypeId = SinkEndReasonTypeId
  readonly _typeId: typeof SinkEndTypeId = SinkEndTypeId
}

export const ScheduleTimeoutTypeId = Symbol()
export class ScheduleTimeout {
  readonly _sinkEndReasonTypeId: typeof SinkEndReasonTypeId = SinkEndReasonTypeId
  readonly _typeId: typeof ScheduleTimeoutTypeId = ScheduleTimeoutTypeId
}

export const ScheduleEndTypeId = Symbol()
export class ScheduleEnd<C> {
  readonly _sinkEndReasonTypeId: typeof SinkEndReasonTypeId = SinkEndReasonTypeId
  readonly _typeId: typeof ScheduleEndTypeId = ScheduleEndTypeId

  constructor(readonly c: C) {}
}

export const UpstreamEndTypeId = Symbol()
export class UpstreamEnd {
  readonly _sinkEndReasonTypeId: typeof SinkEndReasonTypeId = SinkEndReasonTypeId
  readonly _typeId: typeof UpstreamEndTypeId = UpstreamEndTypeId
}

export type SinkEndReason<C> = SinkEnd | ScheduleTimeout | ScheduleEnd<C> | UpstreamEnd
