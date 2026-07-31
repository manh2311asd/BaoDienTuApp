const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 10))
    );

const cleanText = (value: string) =>
  decodeEntities(value)
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

const splitLongParagraph = (paragraph: string, maxLength = 1200) => {
  if (paragraph.length <= maxLength) {
    return [paragraph];
  }

  const sentences = paragraph
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  sentences.forEach((sentence) => {
    if (!current) {
      current = sentence;
      return;
    }
    if (`${current} ${sentence}`.length <= maxLength) {
      current = `${current} ${sentence}`;
      return;
    }
    chunks.push(current);
    current = sentence;
  });

  if (current) {
    chunks.push(current);
  }
  return chunks;
};

export const buildSpeechParagraphs = (
  title?: string,
  sapo?: string,
  html?: string
) => {
  const articleBody = (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(
      /<\/?(?:p|div|h[1-6]|li|blockquote|section|article|br)[^>]*>/gi,
      '\n'
    )
    .replace(/<[^>]+>/g, ' ');

  return [title || '', sapo || '', ...articleBody.split(/\n+/)]
    .map(cleanText)
    .filter(Boolean)
    .flatMap((paragraph) => splitLongParagraph(paragraph));
};

export const estimateSpeechMinutes = (paragraphs: string[]) => {
  const wordCount = paragraphs
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 145));
};
