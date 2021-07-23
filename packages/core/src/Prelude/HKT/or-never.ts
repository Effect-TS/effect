// ets_tracing: off

export type OrNever<K> = unknown extends K ? never : K
