// ets_tracing: off

import type { Cause } from "../Cause"
import type { Renderer } from "../Cause/Pretty"
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
