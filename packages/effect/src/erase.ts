export type Erase<R, K> = R & K extends K & infer R1 ? R1 : R
