import { samples } from "../ir/samples";
import { requireDesign, type Design } from "../ir/schema";
export function generateDesign(prompt: string): Design {
  const normalized = prompt.trim().toLowerCase();
  const index = /pric|plan|subscription/.test(normalized)
    ? 1
    : /dashboard|header|overview/.test(normalized)
      ? 2
      : /contact|message/.test(normalized)
        ? 3
        : 0;
  return requireDesign(samples[index]);
}
