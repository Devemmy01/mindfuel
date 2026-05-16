const HASHTAG_REGEX = /(?:^|[^\w])#([A-Za-z0-9_]{1,50})\b/g;

export function normalizeHashtag(tag: string): string {
  return tag.replace(/^#/, "").trim().toLowerCase();
}

export function formatHashtag(tag: string): string {
  return `#${normalizeHashtag(tag)}`;
}

export function extractHashtags(text: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const normalized = normalizeHashtag(match[1]);
    if (!normalized || normalized.length > 50 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    results.push(normalized);

    if (results.length >= 10) {
      break;
    }
  }

  return results;
}

export function hashtagTextToPath(tag: string): string {
  return `/hashtags/${encodeURIComponent(normalizeHashtag(tag))}`;
}

export function levenshteinDistance(left: string, right: string): number {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}