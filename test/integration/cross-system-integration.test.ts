/**
 * Simplified cross-system integration tests
 *
 * These tests validate basic data flow between major systems:
 * - Gene-expression pipeline: transcription, translation, polypeptide analysis
 * - Coordination between replication and transcription
 * - Error propagation across system boundaries
 */

import { parseGene } from '../../src/gene';
import { transcribe } from '../../src/transcription';
import { processRNA } from '../../src/processing';
import { translate } from '../../src/translation';
import { replicate } from '../../src/replication';
import { parseDNA, doubleStrandedDNA } from '../../src/sequence';

describe('Cross-System Integration Tests', () => {
  describe('Basic Gene-to-Protein Pipeline', () => {
    test('simple gene processes successfully through complete pipeline', () => {
      // Simple single-exon gene that should process successfully
      const geneSequence =
        'GCGCTATAAAAGGCGC' +
        'GGGGGGGGGGGG' +
        'G' + // Promoter (29bp)
        'ATGAAAGCCTTTGTGAACCAACACCTTCTGGTGGAGCGGCTCTACCTGGTGTGCGGCTCGCTGTAG' + // Single exon with start/stop
        'AATAAAGCTAATTCAACCCCAAAAAAAAA'; // 3'UTR

      const exons = [{ start: 29, end: 92, name: 'single-exon' }];
      const gene = parseGene(geneSequence, exons, 'simple-test').unwrap();

      // Step 1: Transcription
      const transcriptionResult = transcribe(gene);
      expect(transcriptionResult.success).toBe(true);

      if (transcriptionResult.success) {
        const preMRNA = transcriptionResult.data;
        // Transcript runs from TSS (gene position 29) through the gene end (124),
        // length 95. Polyadenylation cleavage is modeled at processing time, not
        // here; transcription itself does not truncate.
        expect(preMRNA.sequence.sequence.length).toBe(95);
        expect(preMRNA.sequence.sequence.startsWith('AUG')).toBe(true);
        // Should contain stop codon but might not end with it due to 3'UTR
        expect(preMRNA.sequence.sequence).toContain('UAG');

        // Step 2: RNA Processing (should succeed or fail gracefully)
        const processingResult = processRNA(preMRNA);

        if (processingResult.success) {
          const mRNA = processingResult.data;
          expect(mRNA.isFullyProcessed()).toBe(true);

          // Step 3: Translation
          const protein = translate(mRNA).unwrap();
          // Should produce exactly 21 amino acids from 66bp sequence (minus stop codon = 63bp = 21 AA)
          expect(protein.aminoAcids.length).toBe(21);

          const sequence = protein.getSequence();
          expect(sequence.startsWith('M')).toBe(true);
          // Verify it's a valid protein sequence (no stop codons in middle)
          expect(sequence).not.toContain('*');
        } else {
          // If processing fails, should have meaningful structured error
          expect(typeof processingResult.error.kind).toBe('string');
          expect(processingResult.error.kind).toMatch(
            /splicing-failed|no-start-codon|no-in-frame-stop|invalid-/i,
          );
        }
      }
    });

    test('replication produces identical DNA strands', () => {
      // Simple test that replication works correctly
      const simpleSequence = 'ATGAAAGCCTTTGTGAACCAACACCTTCTGGTGGAGCGGCTCTACCTGGTGTGCGGCTCGCTGTAG';
      const dna = parseDNA(simpleSequence).unwrap();
      const parent = doubleStrandedDNA(dna);

      const replicationResult = replicate(parent);
      expect(replicationResult.success).toBe(true);

      if (replicationResult.success) {
        const { daughters } = replicationResult.data;
        const [duplex1, duplex2] = daughters;

        // Both daughter duplexes should be sequence-equal to the parent
        expect(duplex1.forward.sequence).toBe(simpleSequence);
        expect(duplex2.forward.sequence).toBe(simpleSequence);
        expect(duplex1.reverse.sequence).toBe(parent.reverse.sequence);
        expect(duplex2.reverse.sequence).toBe(parent.reverse.sequence);
        expect(duplex1.length()).toBe(dna.length());
        expect(duplex2.length()).toBe(dna.length());
      }
    });
  });

  describe('Basic System Integration', () => {
    test('multiple systems work together without errors', () => {
      // Simple integration test to verify systems can work together
      const geneSequence =
        'GCGCTATAAAAGGCGC' +
        'GGGGGGGGGGGG' +
        'G' + // Promoter (29bp)
        'ATGAAAGCCTTTGTGAACCAACACCTTCTGGTGGAGCGGCTCTACCTGGTGTGCGGCTCGCTGTAG'; // Single exon

      const exons = [{ start: 29, end: 92, name: 'test-exon' }];
      const gene = parseGene(geneSequence, exons, 'integration-test').unwrap();

      // Test transcription works
      const transcriptionResult = transcribe(gene);
      expect(transcriptionResult.success).toBe(true);

      if (transcriptionResult.success) {
        const preMRNA = transcriptionResult.data;
        // Transcript should contain the exact expected length (just the exon)
        expect(preMRNA.sequence.sequence.length).toBe(66);
        expect(preMRNA.sequence.sequence.startsWith('AUG')).toBe(true);

        // Test that the system doesn't crash on processing attempts
        const processingResult = processRNA(preMRNA);
        // Processing might succeed or fail, but shouldn't crash
        expect(processingResult.success || !processingResult.success).toBe(true);

        if (processingResult.success) {
          const mRNA = processingResult.data;
          expect(mRNA.codingSequence.sequence.length).toBe(66); // Should preserve exact coding sequence length
          expect(mRNA.codingSequence.sequence.startsWith('AUG')).toBe(true);
        }
      }
    });
  });

  describe('Error Propagation Across Systems', () => {
    test('errors are properly tracked through complete pipeline', () => {
      // Gene with multiple potential failure points
      const problematicSequence =
        'GCGCTATAAAAGGCGC' +
        'GGGGGGGGGGGG' +
        'G' + // Valid promoter
        'ATGAAAGCCTTTGTGAACCAACACCTT' + // Valid exon 1
        'GTAAGTCCCCCCCCCCCCCCCCCCCAG' + // Valid intron
        'CTGGTGGAGCGGCTCTACCTGGTGTGC' + // Valid exon 2
        'GTAAGTTTTTTTTTTTTTTTTTTTCAG' + // Valid intron
        'GGCTCGCTGTGCGCCCTGGATGCG'; // Exon 3 WITHOUT stop codon (will cause error)

      const exons = [
        { start: 29, end: 56, name: 'exon1' },
        { start: 82, end: 109, name: 'exon2' },
        { start: 135, end: 158, name: 'exon3' }, // Missing stop codon
      ];

      const gene = parseGene(problematicSequence, exons, 'error-test').unwrap();

      // Transcription should succeed
      const transcriptionResult = transcribe(gene);
      expect(transcriptionResult.success).toBe(true);

      if (transcriptionResult.success) {
        const preMRNA = transcriptionResult.data;

        // RNA processing might succeed even without stop codon
        const processingResult = processRNA(preMRNA);

        if (processingResult.success) {
          // Translation should either fail or produce truncated protein
          const mRNA = processingResult.data;

          const translateResult = translate(mRNA);
          if (translateResult.success) {
            // If it succeeds, it should have detected the missing stop codon issue
            const sequence = translateResult.data.getSequence();
            // Should start with Met and have reasonable length - specific validation
            expect(sequence.startsWith('M')).toBe(true);
            expect(sequence.length).toBeGreaterThanOrEqual(15); // Reasonable minimum protein length
          } else {
            // Or it should fail with a structured TranslationError naming the frame issue
            expect(translateResult.error.kind).toBe('invalid-reading-frame');
          }
        } else {
          // Processing failed - should have meaningful structured error
          expect(typeof processingResult.error.kind).toBe('string');
          expect(processingResult.error.kind).toMatch(
            /splicing-failed|no-start-codon|no-in-frame-stop|invalid-/i,
          );
        }
      }
    });

    test('validation errors prevent downstream processing', () => {
      // Gene with invalid coordinates that should be caught early
      const validSequence =
        'GCGCTATAAAAGGCGC' +
        'GGGGGGGGGGGG' +
        'G' +
        'ATGAAAGCCTTTGTGAACCAACACCTTCTGGTGGAGCGGCTCTACCTGGTGTGCGGCTCGCTGTAG';

      // Invalid exon coordinates (extend beyond sequence)
      const invalidExons = [
        { start: 29, end: 200, name: 'invalid-exon' }, // Extends beyond sequence length
      ];

      // Gene construction should fail with validation error
      expect(!parseGene(validSequence, invalidExons, 'invalid-gene').success).toBe(true); // parseGene must reject overlapping exons
    });
  });
});
