import type { ModelCapabilities } from '../../domain/types';

export const CAPABILITY_LABELS: { key: keyof ModelCapabilities; label: string }[] = [
  { key: 'text', label: '텍스트' },
  { key: 'image', label: '이미지' },
  { key: 'json', label: 'JSON' },
  { key: 'tools', label: '도구' },
];

/** 정렬용: 지원 기능 수 */
export function capabilityCount(caps: ModelCapabilities): number {
  return CAPABILITY_LABELS.filter((c) => caps[c.key]).length;
}
