/** @internal */
export const escapeSingleQuoted = (string: string): string => string.replaceAll("'", "'\\''")
