/**
 * @category utility types
 * @since 1.0.0
 */
export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R
