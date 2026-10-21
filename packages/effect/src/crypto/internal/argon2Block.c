#include <stdint.h>
#include <wasm_simd128.h>

/* Argon2id v19 block compression; see ../../THIRD_PARTY_NOTICES.md.
 * Build with vp run @yielded/crypto#build:wasm. Imports only linear memory.
 */
#define INLINE static inline __attribute__((always_inline))

/* Two independent RFC 9106 BlaMka operations, with unsigned 32-bit products. */
INLINE v128_t blamka(v128_t a, v128_t b) {
  v128_t low_a = wasm_i32x4_shuffle(a, a, 0, 2, 0, 2);
  v128_t low_b = wasm_i32x4_shuffle(b, b, 0, 2, 0, 2);
  v128_t product = wasm_u64x2_extmul_low_u32x4(low_a, low_b);
  return wasm_i64x2_add(wasm_i64x2_add(a, b), wasm_i64x2_shl(product, 1));
}

INLINE void g(v128_t *a, v128_t *b, v128_t *c, v128_t *d) {
  *a = blamka(*a, *b);
  v128_t x = wasm_v128_xor(*d, *a);
  *d = wasm_i32x4_shuffle(x, x, 1, 0, 3, 2);
  *c = blamka(*c, *d);
  x = wasm_v128_xor(*b, *c);
  *b = wasm_i8x16_shuffle(x, x, 3, 4, 5, 6, 7, 0, 1, 2, 11, 12, 13, 14, 15, 8, 9, 10);
  *a = blamka(*a, *b);
  x = wasm_v128_xor(*d, *a);
  *d = wasm_i8x16_shuffle(x, x, 2, 3, 4, 5, 6, 7, 0, 1, 10, 11, 12, 13, 14, 15, 8, 9);
  *c = blamka(*c, *d);
  x = wasm_v128_xor(*b, *c);
  *b = wasm_v128_or(wasm_i64x2_shl(x, 1), wasm_u64x2_shr(x, 63));
}

INLINE void p(uint64_t *v,
  unsigned a0, unsigned a1, unsigned b0, unsigned b1,
  unsigned c0, unsigned c1, unsigned d0, unsigned d1) {
  v128_t a = wasm_v128_load(v + a0), aa = wasm_v128_load(v + a1);
  v128_t b = wasm_v128_load(v + b0), bb = wasm_v128_load(v + b1);
  v128_t c = wasm_v128_load(v + c0), cc = wasm_v128_load(v + c1);
  v128_t d = wasm_v128_load(v + d0), dd = wasm_v128_load(v + d1);
  g(&a, &b, &c, &d);
  g(&aa, &bb, &cc, &dd);
  v128_t diagonal_b = wasm_i64x2_shuffle(b, bb, 1, 2);
  v128_t diagonal_bb = wasm_i64x2_shuffle(bb, b, 1, 2);
  v128_t diagonal_d = wasm_i64x2_shuffle(dd, d, 1, 2);
  v128_t diagonal_dd = wasm_i64x2_shuffle(d, dd, 1, 2);
  g(&a, &diagonal_b, &cc, &diagonal_d);
  g(&aa, &diagonal_bb, &c, &diagonal_dd);
  wasm_v128_store(v + a0, a);
  wasm_v128_store(v + a1, aa);
  wasm_v128_store(v + b0, wasm_i64x2_shuffle(diagonal_bb, diagonal_b, 1, 2));
  wasm_v128_store(v + b1, wasm_i64x2_shuffle(diagonal_b, diagonal_bb, 1, 2));
  wasm_v128_store(v + c0, c);
  wasm_v128_store(v + c1, cc);
  wasm_v128_store(v + d0, wasm_i64x2_shuffle(diagonal_d, diagonal_dd, 1, 2));
  wasm_v128_store(v + d1, wasm_i64x2_shuffle(diagonal_dd, diagonal_d, 1, 2));
}

void argon2_block(uint64_t *scratch, uint32_t *memory,
  unsigned x_offset, unsigned y_offset, unsigned out_offset, unsigned xor_old) {
  uint64_t *x = (uint64_t *)(memory + x_offset);
  uint64_t *y = (uint64_t *)(memory + y_offset);
  uint64_t *out = (uint64_t *)(memory + out_offset);
  for (unsigned i = 0; i < 128; i++) scratch[i] = x[i] ^ y[i];
  /* Preserve R (and the previous destination on later passes) before permuting. */
  if (xor_old)
    for (unsigned i = 0; i < 128; i++) out[i] ^= scratch[i];
  else
    for (unsigned i = 0; i < 128; i++) out[i] = scratch[i];
  for (unsigned i = 0; i < 128; i += 16)
    p(scratch, i, i+2, i+4, i+6, i+8, i+10, i+12, i+14);
  for (unsigned i = 0; i < 16; i += 2)
    p(scratch, i, i+16, i+32, i+48, i+64, i+80, i+96, i+112);
  for (unsigned i = 0; i < 128; i++) {
    out[i] ^= scratch[i];
    scratch[i] = 0;
  }
}
