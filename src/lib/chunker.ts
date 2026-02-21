/**
 * Smart text chunker that splits long text at natural boundaries
 * (paragraph, sentence, clause) to keep each chunk under the API limit
 * while ensuring natural-sounding speech.
 */

const MAX_CHUNK_SIZE = 1000; // chars – well within the 2000-char API limit

/**
 * Split text into chunks that sound natural when synthesized independently.
 * Priority order: paragraph break > sentence end > clause boundary > word boundary.
 */
export function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= MAX_CHUNK_SIZE) return [trimmed];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK_SIZE) {
      chunks.push(remaining.trim());
      break;
    }

    const cut = findBestBreak(remaining, MAX_CHUNK_SIZE);
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

function findBestBreak(text: string, maxLen: number): number {
  const window = text.slice(0, maxLen);

  // 1. Paragraph break (double newline)
  const paraBreak = window.lastIndexOf("\n\n");
  if (paraBreak > maxLen * 0.3) return paraBreak + 2;

  // 2. Sentence-ending punctuation followed by space or newline
  const sentenceEnd = lastIndexOfPattern(window, /[.!?]["'»)»\]]?\s/g);
  if (sentenceEnd > maxLen * 0.3) return sentenceEnd + 1;

  // 3. Clause boundary (semicolon, colon, em-dash, comma) followed by space
  const clauseBreak = lastIndexOfPattern(window, /[;:,—–]\s/g);
  if (clauseBreak > maxLen * 0.3) return clauseBreak + 1;

  // 4. Any whitespace
  const spaceBreak = window.lastIndexOf(" ");
  if (spaceBreak > maxLen * 0.2) return spaceBreak + 1;

  // 5. Hard cut (shouldn't happen with normal prose)
  return maxLen;
}

function lastIndexOfPattern(text: string, pattern: RegExp): number {
  let last = -1;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    last = match.index + match[0].length;
  }
  return last;
}
