export type Erase<R, K> = R extends K & infer R1 ? R1 : R;
