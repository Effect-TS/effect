export const instance = <T>(_: Omit<T, `_${any}`>): T => _ as any
