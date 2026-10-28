// Tüm oran setlerinin (ParamSet) biçim ve kaynak denetimi.
import { describe, expect, it } from 'vitest';
import type { ParamSet } from './types';

const modules = import.meta.glob<Record<string, unknown>>('./*.ts', { eager: true });

function isParamSet(x: unknown): x is ParamSet<unknown> {
  return (
    typeof x === 'object' &&
    x !== null &&
    'id' in x &&
    'validFrom' in x &&
    'validTo' in x &&
    'values' in x &&
    'sources' in x &&
    'lastReviewed' in x
  );
}

const sets: { file: string; name: string; set: ParamSet<unknown> }[] = [];
for (const [file, mod] of Object.entries(modules)) {
  if (file.endsWith('.test.ts')) continue;
  for (const [name, value] of Object.entries(mod)) {
    if (isParamSet(value)) sets.push({ file, name, set: value });
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe('oran setleri', () => {
  it('en az bir set bulunur', () => {
    expect(sets.length).toBeGreaterThan(0);
  });

  it('kimlikler benzersiz', () => {
    const ids = sets.map((s) => s.set.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const { file, name, set } of sets) {
    describe(`${file} → ${name}`, () => {
      it('tarihler ISO biçiminde ve sıralı', () => {
        expect(set.validFrom).toMatch(ISO);
        expect(set.lastReviewed).toMatch(ISO);
        if (set.validTo !== null) {
          expect(set.validTo).toMatch(ISO);
          expect(set.validTo >= set.validFrom).toBe(true);
        }
      });

      it('başlık ve en az bir https kaynağı var', () => {
        expect(set.title.trim().length).toBeGreaterThan(3);
        expect(set.sources.length).toBeGreaterThan(0);
        for (const s of set.sources) {
          expect(s.label.trim().length).toBeGreaterThan(3);
          expect(s.url).toMatch(/^https:\/\//);
        }
      });

      it('dönem listeleri (varsa) boşluksuz ve çakışmasız', () => {
        const values = set.values as Record<string, unknown>;
        for (const v of Object.values(values ?? {})) {
          if (!Array.isArray(v) || v.length === 0) continue;
          if (!v.every((d) => typeof d === 'object' && d && 'from' in d && 'to' in d)) continue;
          const list = v as { from: string; to: string }[];
          for (let i = 0; i < list.length; i++) {
            expect(list[i].from).toMatch(ISO);
            expect(list[i].to).toMatch(ISO);
            expect(list[i].to >= list[i].from).toBe(true);
            if (i > 0) expect(list[i].from > list[i - 1].to).toBe(true);
          }
        }
      });
    });
  }
});
