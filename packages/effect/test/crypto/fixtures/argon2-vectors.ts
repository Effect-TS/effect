// All Argon2id v19 vectors from noble-hashes 8060cc83bbab6681d23c9eed071db3f3a6b442da,
// test/argon2.test.ts (originally the Argon2 reference suite).
// MIT and Apache-2.0; see ../../../src/crypto/NOTICE.md.
export const argon2Vectors: ReadonlyArray<{
  sourceIndex: number
  passwordHex: string
  saltHex: string
  secretHex?: string
  dataHex?: string
  m: number
  t: number
  p: number
  expectedHex: string
}> = [
  {
    sourceIndex: 0,
    passwordHex: "0101010101010101010101010101010101010101010101010101010101010101",
    saltHex: "02020202020202020202020202020202",
    secretHex: "0303030303030303",
    dataHex: "040404040404040404040404",
    m: 32,
    t: 3,
    p: 4,
    expectedHex: "0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659"
  },
  {
    sourceIndex: 2,
    passwordHex: "70617373776f7264",
    saltHex: "736f6d6573616c74",
    m: 65536,
    t: 2,
    p: 1,
    expectedHex: "09316115d5cf24ed5a15a31a3ba326e5cf32edc24702987c02b6566f61913cf7"
  },
  {
    sourceIndex: 3,
    passwordHex: "70617373776f7264",
    saltHex: "736f6d6573616c74",
    m: 262144,
    t: 2,
    p: 1,
    expectedHex: "78fe1ec91fb3aa5657d72e710854e4c3d9b9198c742f9616c2f085bed95b2e8c"
  },
  {
    sourceIndex: 4,
    passwordHex: "70617373776f7264",
    saltHex: "736f6d6573616c74",
    m: 256,
    t: 2,
    p: 1,
    expectedHex: "9dfeb910e80bad0311fee20f9c0e2b12c17987b4cac90c2ef54d5b3021c68bfe"
  },
  {
    sourceIndex: 5,
    passwordHex: "70617373776f7264",
    saltHex: "736f6d6573616c74",
    m: 256,
    t: 2,
    p: 2,
    expectedHex: "6d093c501fd5999645e0ea3bf620d7b8be7fd2db59c20d9fff9539da2bf57037"
  },
  {
    sourceIndex: 6,
    passwordHex: "70617373776f7264",
    saltHex: "736f6d6573616c74",
    m: 65536,
    t: 1,
    p: 1,
    expectedHex: "f6a5adc1ba723dddef9b5ac1d464e180fcd9dffc9d1cbf76cca2fed795d9ca98"
  },
  {
    sourceIndex: 7,
    passwordHex: "70617373776f7264",
    saltHex: "736f6d6573616c74",
    m: 65536,
    t: 4,
    p: 1,
    expectedHex: "9025d48e68ef7395cca9079da4c4ec3affb3c8911fe4f86d1a2520856f63172c"
  },
  {
    sourceIndex: 8,
    passwordHex: "646966666572656e7470617373776f7264",
    saltHex: "736f6d6573616c74",
    m: 65536,
    t: 2,
    p: 1,
    expectedHex: "0b84d652cf6b0c4beaef0dfe278ba6a80df6696281d7e0d2891b817d8c458fde"
  },
  {
    sourceIndex: 9,
    passwordHex: "70617373776f7264",
    saltHex: "6469666673616c74",
    m: 65536,
    t: 2,
    p: 1,
    expectedHex: "bdf32b05ccc42eb15d58fd19b1f856b113da1e9a5874fdcc544308565aa8141c"
  }
] as const

// Native node:crypto.argon2Sync, v24.21.0; binary inputs and fixed expected bytes.
export const nativeArgon2Vectors = [
  {
    id: "minimum-tag-empty-password",
    passwordHex: "",
    saltHex: "00ff800102030001",
    m: 8,
    p: 1,
    t: 1,
    length: 4,
    expectedHex: "669220f8"
  },
  {
    id: "odd-tag",
    passwordHex: "00ff8000",
    saltHex: "00ff800102030001",
    m: 25,
    p: 3,
    t: 2,
    length: 5,
    expectedHex: "13a81ff997"
  },
  {
    id: "one-full-blake-block",
    passwordHex: "ff0001",
    saltHex: "00ff800102030001",
    m: 32,
    p: 2,
    t: 1,
    length: 64,
    expectedHex:
      "58082de8a71e8f6ea37e1f965553c6fe8f8f68749cd7dc78148a79d38d3380e2d441d2bfc781616326b8add8b67905a39f737707c5ca44742eba98ff6d19706a"
  },
  {
    id: "expanded-odd-tag",
    passwordHex: "ff0001",
    saltHex: "00ff800102030001",
    m: 32,
    p: 2,
    t: 1,
    length: 65,
    expectedHex:
      "694dbd28f375d8007914721ea9838e181576b9d43227239717a02fc7f652860ede3a8b183cff0063c3d3c77d316cc5f0449ba2c755bf01787960b289ac8509f3b6"
  },
  {
    id: "expanded-multiple-blocks",
    passwordHex: "ff0001",
    saltHex: "00ff800102030001",
    m: 32,
    p: 2,
    t: 3,
    length: 97,
    expectedHex:
      "f5183a615ed27a9d62c02f54033d5b9674ac5dabb0467893fff3c737cbd99dbae0a80226878aeba62831eead18adff0e0959188c46ae9cb5965ee84c062afcdb9e3586e5576ce3a738136e00df8e5b2ace76a10c19a9e1428d583d3929021ece5c"
  }
] as const
