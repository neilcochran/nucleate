import { DNA, unsafeDNA } from './DNA.js';
import { RNA, unsafeRNA } from './RNA.js';

/**
 * Converts a {@link DNA} sequence to its {@link RNA} equivalent at the sequence level
 * (T replaced by U, all other bases preserved).
 *
 * This is the *sequence-level* conversion. The biological act of transcribing a gene
 * (promoter recognition, TSS detection, polyadenylation) is exposed as `transcribe(gene)`
 * in the `transcription/` module. The two operations are deliberately named differently to
 * avoid conflating them.
 *
 * @param dna - The DNA sequence to convert
 * @returns A new RNA whose sequence is `dna.sequence` with every `T` replaced by `U`
 *
 * @example
 * ```typescript
 * const dna = parseDNA('ATG').unwrap();
 * const rna = transcribeSequence(dna);
 * console.log(rna.sequence); // 'AUG'
 * ```
 */
export function transcribeSequence(dna: DNA): RNA {
  return unsafeRNA(dna.sequence.replaceAll('T', 'U'));
}

/**
 * Converts an {@link RNA} sequence to its {@link DNA} equivalent at the sequence level
 * (U replaced by T, all other bases preserved).
 *
 * This is the *sequence-level* conversion (the inverse of {@link transcribeSequence}). It
 * does not model reverse transcription as a biological process.
 *
 * @param rna - The RNA sequence to convert
 * @returns A new DNA whose sequence is `rna.sequence` with every `U` replaced by `T`
 *
 * @example
 * ```typescript
 * const rna = parseRNA('AUG').unwrap();
 * const dna = reverseTranscribeSequence(rna);
 * console.log(dna.sequence); // 'ATG'
 * ```
 */
export function reverseTranscribeSequence(rna: RNA): DNA {
  return unsafeDNA(rna.sequence.replaceAll('U', 'T'));
}
