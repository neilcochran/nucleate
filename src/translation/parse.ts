import { Result, success, failure } from '../result/index.js';
import { parseRNA, CODON_LENGTH, isStopCodon } from '../sequence/index.js';
import { unsafeCodon } from '../sequence/internal.js';
import { AminoAcid } from './AminoAcid.js';
import { AMINO_ACID_BY_CODON } from './amino-acids.js';
import type { TranslationError } from './errors.js';

/**
 * Parses an RNA codon string into a validated {@link AminoAcid}.
 *
 * The codon is validated against the RNA alphabet, checked for length, and rejected if it is
 * a stop codon (stop codons do not code for any amino acid). The function never throws;
 * untrusted callers go through this path exclusively.
 *
 * @param codon - The 3-character RNA codon string (case-insensitive; uppercased internally)
 * @returns `Result.success` containing the `AminoAcid`, or `Result.failure` with a structured
 * {@link TranslationError}
 *
 * @example
 * ```typescript
 * parseAminoAcid('AUG').match({
 *   success: aa => aa.data.name,    // 'Methionine'
 *   failure: e => describeTranslationError(e),
 * });
 * ```
 */
export function parseAminoAcid(codon: string): Result<AminoAcid, TranslationError> {
  const rnaResult = parseRNA(codon);
  if (!rnaResult.success) {
    return failure({ kind: 'translation/invalid-codon-sequence', codon, cause: rnaResult.error });
  }
  const rna = rnaResult.data;
  const sequence = rna.sequence;

  if (sequence.length !== CODON_LENGTH) {
    return failure({
      kind: 'translation/invalid-codon-length',
      codon: sequence,
      length: sequence.length,
      expected: CODON_LENGTH,
    });
  }

  if (isStopCodon(sequence)) {
    return failure({ kind: 'translation/stop-codon', codon: sequence });
  }

  const data = AMINO_ACID_BY_CODON[sequence];
  if (data === undefined) {
    return failure({ kind: 'translation/invalid-codon', codon: sequence, position: 0 });
  }

  return success(new AminoAcid(unsafeCodon(rna), data));
}
