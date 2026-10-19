import { BadRequestException } from '@nestjs/common';
import {
  EXPENSE_MATCHES,
  GROUPS,
  monthRange,
  type PlanCategory,
} from './planning.logic.js';
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Invalid planning request.');
  return value as Record<string, unknown>;
}
export function minor(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 100000000000000
  )
    throw new BadRequestException(
      'Use a non-negative amount with at most two decimal places.',
    );
  return value;
}
export function revision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new BadRequestException('Refresh the plan before saving.');
  return value;
}
export function month(value: unknown): string {
  try {
    if (typeof value !== 'string') throw Error();
    monthRange(value);
    return value;
  } catch {
    throw new BadRequestException('Choose a valid month (YYYY-MM).');
  }
}
export function title(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100)
    throw new BadRequestException('Use a name between 1 and 100 characters.');
  return value.trim();
}
export function date(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^20\d{2}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(new Date(value + 'T00:00:00Z').getTime()) ||
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value
  )
    throw new BadRequestException('Choose a valid date.');
  return value;
}
export function categories(value: unknown): PlanCategory[] {
  if (!Array.isArray(value) || value.length > 50)
    throw new BadRequestException('Use at most 50 categories.');
  const ids = new Set<string>();
  const names = new Set<string>();
  const matches = new Set<string>();
  return value.map((raw) => {
    const row = object(raw);
    const id = typeof row.id === 'string' ? row.id : '';
    if (id.length > 100 || (id && ids.has(id)))
      throw new BadRequestException('Duplicate or invalid category.');
    if (id) ids.add(id);
    const name = title(row.name);
    if (names.has(name.toLowerCase()))
      throw new BadRequestException('Give each category a different name.');
    names.add(name.toLowerCase());
    if (
      !GROUPS.includes(row.group as never) ||
      !['EXPENSE', 'SAVINGS'].includes(String(row.kind))
    )
      throw new BadRequestException('Choose a valid category group and type.');
    if (
      !Array.isArray(row.matches) ||
      new Set(row.matches).size !== row.matches.length ||
      row.matches.some(
        (m) => !EXPENSE_MATCHES.includes(m as never) || matches.has(String(m)),
      )
    )
      throw new BadRequestException(
        'Each statement purpose can match only one spending category.',
      );
    row.matches.forEach((m) => matches.add(String(m)));
    if (row.kind === 'SAVINGS' && row.matches.length)
      throw new BadRequestException(
        'Savings goals do not count statement movements as spending.',
      );
    const targetDate = row.targetDate ? date(row.targetDate) : null;
    return {
      id,
      name,
      group: String(row.group),
      kind: String(row.kind),
      allocatedMinor: minor(row.allocatedMinor),
      targetMinor: minor(row.targetMinor),
      savedMinor: minor(row.savedMinor),
      targetDate,
      matches: row.matches as string[],
    };
  });
}

export function mode(value: unknown): 'LINKED' | 'STANDALONE' {
  if (value === undefined) return 'LINKED';
  if (value !== 'LINKED' && value !== 'STANDALONE')
    throw new BadRequestException(
      'Choose an existing-funds or standalone plan.',
    );
  return value;
}
