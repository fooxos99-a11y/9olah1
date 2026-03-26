export const GUESS_STAGE_IMAGE_COUNT = 10;

const ARABIC_ORDINAL_STAGE_NAMES = [
  'الأولى',
  'الثانية',
  'الثالثة',
  'الرابعة',
  'الخامسة',
  'السادسة',
  'السابعة',
  'الثامنة',
  'التاسعة',
  'العاشرة',
];

export function formatGuessStageName(order: number) {
  const ordinalName = ARABIC_ORDINAL_STAGE_NAMES[order - 1];
  return ordinalName ? `المرحلة ${ordinalName}` : `المرحلة ${order}`;
}

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input, { cache: 'no-store' });
  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.error || 'تعذر تحميل البيانات';
    throw new Error(message);
  }

  return payload as T;
}

// جلب جميع المراحل
export async function getGuessStages() {
  return fetchJson<any[]>('/api/guess-image-stages');
}

// جلب الصور لمسرح معين
export async function getGuessImagesByStage(stageId: number) {
  return fetchJson<any[]>(`/api/guess-images?stage_id=${stageId}&limit=${GUESS_STAGE_IMAGE_COUNT}`);
}
