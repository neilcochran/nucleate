import { Result, success, failure } from '../result/index.js';
import type { DNAError, RNAError } from './errors.js';

const VALID_DNA_BASES = new Set(['A', 'C', 'G', 'T']);
const VALID_RNA_BASES = new Set(['A', 'C', 'G', 'U']);

/**
 * Validates and normalizes a candidate DNA string. On success the `Result` carries the
 * upper-cased sequence; on failure it carries the structured {@link DNAError} naming the
 * offending characters and the index of the first one.
 *
 * @internal
 *
 * @param input - Candidate sequence string
 * @returns `Result<string, DNAError>` carrying the normalized sequence on success
 */
export function validateDNAString(input: string): Result<string, DNAError> {
  if (input.length === 0) {
    return failure({ kind: 'empty-sequence' });
  }
  const normalized = input.toUpperCase();
  const issue = findInvalidBases(normalized, VALID_DNA_BASES);
  if (issue !== undefined) {
    return failure({ kind: 'invalid-characters', chars: issue.chars, firstAt: issue.firstAt });
  }
  return success(normalized);
}

/**
 * Validates and normalizes a candidate RNA string. On success the `Result` carries the
 * upper-cased sequence; on failure it carries the structured {@link RNAError} naming the
 * offending characters and the index of the first one.
 *
 * @internal
 *
 * @param input - Candidate sequence string
 * @returns `Result<string, RNAError>` carrying the normalized sequence on success
 */
export function validateRNAString(input: string): Result<string, RNAError> {
  if (input.length === 0) {
    return failure({ kind: 'empty-sequence' });
  }
  const normalized = input.toUpperCase();
  const issue = findInvalidBases(normalized, VALID_RNA_BASES);
  if (issue !== undefined) {
    return failure({ kind: 'invalid-characters', chars: issue.chars, firstAt: issue.firstAt });
  }
  return success(normalized);
}

function findInvalidBases(
  normalized: string,
  validBases: ReadonlySet<string>,
): { readonly chars: readonly string[]; readonly firstAt: number } | undefined {
  let firstAt = -1;
  const seen = new Set<string>();
  const chars: string[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charAt(i);
    if (!validBases.has(ch)) {
      if (firstAt === -1) {
        firstAt = i;
      }
      if (!seen.has(ch)) {
        seen.add(ch);
        chars.push(ch);
      }
    }
  }
  if (firstAt === -1) {
    return undefined;
  }
  return { chars, firstAt };
}
