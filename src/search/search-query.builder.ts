export class SearchQueryBuilder {
  private normalizeWord(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildMatchQuery(query: string): string {
    const trimmed = query.trim();
    if (trimmed.length > 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      const phrase = this.normalizeWord(trimmed.slice(1, -1));
      return phrase ? `"${phrase}"` : '';
    }
    return this.normalizeWord(trimmed)
      .split(' ')
      .filter(Boolean)
      .map((term) => `*${term}*`)
      .join(' ');
  }
}
