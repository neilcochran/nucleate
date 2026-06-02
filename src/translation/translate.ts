import { Result, success, failure } from '../result/index.js';
import { CODON_LENGTH, isStopCodon } from '../sequence/index.js';
import type { MRNA } from '../modifications/index.js';
import { type AminoAcid, unsafeAminoAcidFromString } from './AminoAcid.js';
import { AMINO_ACID_BY_CODON } from './amino-acids.js';
import { type Polypeptide, unsafePolypeptide } from './Polypeptide.js';
import type { TranslationError } from './errors.js';

/**
 * Translates a mature mRNA's coding sequence into a {@link Polypeptide}.
 *
 * Walks the coding sequence in codon-sized steps. Each codon is looked up directly in the
 * codon table (no `try`/`catch` on construction as control flow); stop codons terminate the
 * walk and the polypeptide carries every amino acid translated before the stop. The function
 * fails with `no-coding-sequence` when the mRNA has no CDS (its `codingSequence` is
 * `undefined`), when the coding sequence length is not a multiple of {@link CODON_LENGTH}, or
 * when a codon is reached that neither codes for an amino acid nor is a stop codon (the latter
 * is unreachable when the mRNA was produced by `parseMRNA` / `processRNA`, since both ensure
 * the sequence belongs to the RNA alphabet).
 *
 * @param mRNA - The mature mRNA to translate
 * @returns `Result.success` containing the `Polypeptide`, or `Result.failure` with a
 * structured {@link TranslationError}
 *
 * @example
 * ```typescript
 * const mRNA = parseMRNA('AUGAAACCCUAG', 0, 12).unwrap();
 * const result = translate(mRNA);
 * if (result.success) {
 *   result.data.getSequence(); // 'MKP'
 * }
 * ```
 */
export function translate(mRNA: MRNA): Result<Polypeptide, TranslationError> {
  if (mRNA.codingSequence === undefined) {
    return failure({ kind: 'no-coding-sequence' });
  }
  const codingSequence = mRNA.codingSequence.sequence;
  if (codingSequence.length % CODON_LENGTH !== 0) {
    return failure({
      kind: 'invalid-reading-frame',
      codingLength: codingSequence.length,
      codonLength: CODON_LENGTH,
    });
  }

  const aminoAcids: AminoAcid[] = [];
  for (let i = 0; i < codingSequence.length; i += CODON_LENGTH) {
    const codonString = codingSequence.substring(i, i + CODON_LENGTH);
    if (isStopCodon(codonString)) {
      break;
    }
    const data = AMINO_ACID_BY_CODON[codonString];
    if (data === undefined) {
      return failure({ kind: 'invalid-codon', codon: codonString, position: i });
    }
    aminoAcids.push(unsafeAminoAcidFromString(codonString, data));
  }

  return success(unsafePolypeptide(mRNA, aminoAcids));
}
