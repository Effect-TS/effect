export * from "./impl/LogSpan.js"
export * from "./internal/Jumpers/LogSpan.js"

export declare namespace LogSpan {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/LogSpan.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface LogSpan {
  readonly label: string
  readonly startTime: number
}
