/**
 * @since 2.0.0
 */
export * from "./impl/ReadonlyRecord.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/ReadonlyRecord.js"

/**
 * @since 2.0.0
 */
export declare namespace ReadonlyRecord {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ReadonlyRecord.js"
}
/**
 * @category models
 * @since 2.0.0
 */
export interface ReadonlyRecord<A> {
  readonly [x: string]: A
}
