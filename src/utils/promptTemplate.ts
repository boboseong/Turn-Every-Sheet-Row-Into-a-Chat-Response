export const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const applyPromptTemplate = (
  promptTemplate: string,
  row: Record<string, string>,
  headers: string[]
): string => {
  return headers.reduce((prompt, header) => {
    const regex = new RegExp(`{{${escapeRegExp(header)}}}`, 'g');
    const value = row[header] !== undefined && row[header] !== null ? row[header] : '';
    return prompt.replace(regex, value);
  }, promptTemplate);
};
