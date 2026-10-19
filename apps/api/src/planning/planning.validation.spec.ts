import { describe, expect, it } from 'vitest';
import { categories, date, minor, revision } from './planning.validation.js';
const row = {
  id: 'a',
  name: 'Food',
  group: 'Everyday spending',
  kind: 'EXPENSE',
  allocatedMinor: 100,
  targetMinor: 0,
  savedMinor: 0,
  targetDate: null,
  matches: ['Purchase'],
};
describe('planning boundary validation', () => {
  it('rejects fractional, negative, excessive and nonnumeric minor amounts', () => {
    for (const value of [-1, 0.5, Infinity, NaN, '100', null, 100000000000001])
      expect(() => minor(value)).toThrow();
    expect(minor(101)).toBe(101);
    expect(() => revision('1')).toThrow();
  });
  it('rejects impossible dates, duplicate categories and duplicate automatic mappings', () => {
    expect(() => date('2026-02-30')).toThrow();
    expect(date('2028-02-29')).toBe('2028-02-29');
    expect(() => categories([row, { ...row, id: 'b' }])).toThrow();
    expect(() =>
      categories([row, { ...row, id: 'b', name: 'Other' }]),
    ).toThrow();
    expect(() =>
      categories([{ ...row, matches: ['Purchase', 'Purchase'] }]),
    ).toThrow();
    expect(() =>
      categories([{ ...row, matches: ['External Transfer'] }]),
    ).toThrow();
  });
  it('requires savings to remain separate from spending rules and limits category count', () => {
    expect(() => categories([{ ...row, kind: 'SAVINGS' }])).toThrow();
    expect(() => categories(Array(51).fill(row))).toThrow();
    expect(categories([{ ...row, kind: 'SAVINGS', matches: [] }])[0].kind).toBe(
      'SAVINGS',
    );
  });
});
