const KOREAN_ORDINALS = [
  '첫 번째',
  '두 번째',
  '세 번째',
  '네 번째',
  '다섯 번째',
  '여섯 번째',
  '일곱 번째',
  '여덟 번째',
  '아홉 번째',
  '열 번째',
];

const ENGLISH_ORDINALS = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
];

const getEnglishOrdinalSuffix = (value: number): string => {
  const lastTwoDigits = value % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';

  switch (value % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

export const formatOrdinal = (value: number, language: string): string => {
  if (language.toLowerCase().startsWith('ko')) {
    return KOREAN_ORDINALS[value - 1] ?? `${value}번째`;
  }

  return ENGLISH_ORDINALS[value - 1] ?? `${value}${getEnglishOrdinalSuffix(value)}`;
};
