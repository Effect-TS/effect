export * from "./internal/Jumpers/ReadonlyRecord.js"
export * from "./ReadonlyRecord.impl.js"

export declare namespace ReadonlyRecord {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./ReadonlyRecord.impl.js"
}
/**
 * @category models
 * @since 2.0.0
 */
export interface ReadonlyRecord<A> {
  readonly [x: string]: A
}
