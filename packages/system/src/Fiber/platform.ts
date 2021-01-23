import type { Cause, Renderer } from "../Cause"

export class Platform {
  constructor(
    public executionTraceLength: number,
    public stackTraceLength: number,
    public traceExecution: boolean,
    public traceStack: boolean,
    public traceEffects: boolean,
    public initialTracingStatus: boolean,
    public ancestorExecutionTraceLength: number,
    public ancestorStackTraceLength: number,
    public ancestryLength: number,
    public renderer: Renderer,
    public reportFailure: (e: Cause<unknown>) => void,
    public maxOp: number
  ) {}
}
