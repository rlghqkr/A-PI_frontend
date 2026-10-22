export type ClassValue = string | number | bigint | null | undefined | false

export function cn(...classes: ClassValue[]): string {
  return classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
}
