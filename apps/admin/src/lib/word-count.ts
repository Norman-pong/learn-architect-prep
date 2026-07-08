/**
 * Word counting for Chinese + mixed text.
 *
 * Chinese characters are counted as one word each (the standard convention
 * for software-architect exam papers, where the 2000-3000 字 target treats
 * one Han character as one 字). ASCII words contribute their token count so
 * a sentence like "I used Kafka" adds 4 to the total.
 *
 * Punctuation is excluded on both sides so user-typed commas/periods
 * don't inflate the score.
 */

/** Count words in `text`. Empty / non-string input returns 0. */
export function countWords(text: string): number {
  if (!text) return 0;
  // Han characters: one per char.
  const han = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  // ASCII words: consecutive A-Za-z0-9 runs.
  const ascii = text.match(/[A-Za-z0-9]+/g);
  return (han?.length ?? 0) + (ascii?.length ?? 0);
}

/** Sum the word counts across all five thesis sections. */
export function countTotalWords(sections: Readonly<Record<string, string>>): number {
  let total = 0;
  for (const value of Object.values(sections)) {
    total += countWords(value);
  }
  return total;
}