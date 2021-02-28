import type { Cause, Renderer } from "../Cause"
import type { Supervisor } from "../Supervisor"

export class Platform<X> {
  constructor(
    public value: {
      executionTraceLength: number
      stackTraceLength: number
      traceExecution: boolean
      traceStack: boolean
      traceEffects: boolean
      initialTracingStatus: boolean
      ancestorExecutionTraceLength: number
      ancestorStackTraceLength: number
      ancestryLength: number
      renderer: Renderer
      reportFailure: (e: Cause<unknown>) => void
      maxOp: number
      supervisor: Supervisor<X>
    }
  ) {}
}
