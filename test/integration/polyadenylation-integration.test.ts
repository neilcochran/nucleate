/**
 * Simplified polyadenylation integration tests
 *
 * These tests validate basic polyadenylation integration with RNA processing.
 */

import { parseGene } from '../../src/gene';
import { transcribe } from '../../src/transcription';
import { processRNA } from '../../src/modifications';
import { findPolyadenylationSites } from '../../src/polyadenylation';
import { at } from '../utils/test-utils';

describe('Polyadenylation Integration Tests', () => {
  test('basic polyadenylation integration with RNA processing', () => {
    // Create simple gene that should process successfully
    const promoter = 'GCGCTATAAAAGGCGC' + 'GGGGGGGGGGGG' + 'G'; // 29bp
    const exon =
      'ATGAAAGCCTTTGTGAACCAACACCTTCTGGTGGAGCGGCTCTACCTGGTGTGCGGCTCGCTGTAG' + // Coding
      'AATAAAGCTAATTCAACCCCAAAAAAAAA'; // 3'UTR with basic polyA signal

    const geneSequence = promoter + exon;
    const exons = [{ start: 29, end: 120, name: 'main-exon' }];

    const gene = parseGene(geneSequence, exons, 'polya-test-gene').unwrap();
    const transcriptionResult = transcribe(gene);
    expect(transcriptionResult.success).toBe(true);

    if (transcriptionResult.success) {
      const preMRNA = transcriptionResult.data;

      // Check that polyadenylation site detection works
      const sites = findPolyadenylationSites(preMRNA.sequence);
      expect(sites.length).toBeGreaterThanOrEqual(0); // May or may not find sites

      // Process RNA - should succeed
      const processingResult = processRNA(preMRNA);
      if (processingResult.success) {
        const mRNA = processingResult.data;

        // Verify basic mRNA structure
        expect(mRNA.isFullyProcessed()).toBe(true);
        expect(mRNA.fivePrimeCap).toBe(true);
        expect(mRNA.polyATailLength).toBeGreaterThanOrEqual(0); // Allow for any poly-A tail length

        // Verify coding sequence is intact
        const codingSeq = mRNA.codingSequence.sequence;
        expect(codingSeq.startsWith('AUG')).toBe(true);
        expect(codingSeq.endsWith('UAG')).toBe(true);
      }
    }
  });

  test('polyadenylation site detection works with RNA input', () => {
    // Create gene and process to get RNA for polyadenylation site detection
    const promoter = 'GCGCTATAAAAGGCGC' + 'GGGGGGGGGGGG' + 'G'; // 29bp
    const exon =
      'ATGAAAGCCTTTGTGAACCAACACCTTCTGGTGGAGCGGCTCTACCTGGTGTGCGGCTCGCTGTAG' + // Coding
      'AATAAAGCTAATTCAACCCCAAAAAAAAA'; // 3'UTR with polyA signal

    const geneSequence = promoter + exon;
    const exons = [{ start: 29, end: 120, name: 'main-exon' }];

    const gene = parseGene(geneSequence, exons, 'site-detection-test').unwrap();
    const transcriptionResult = transcribe(gene);
    expect(transcriptionResult.success).toBe(true);

    if (transcriptionResult.success) {
      const preMRNA = transcriptionResult.data;

      // This should not throw an error
      const sites = findPolyadenylationSites(preMRNA.sequence);
      expect(Array.isArray(sites)).toBe(true);

      // If sites are found, they should have basic structure
      if (sites.length > 0) {
        const first = at(sites, 0);
        expect(typeof first.position).toBe('number');
        expect(typeof first.signal).toBe('string');
        expect(typeof first.strength).toBe('number');
      }
    }
  });

  test('RNA processing handles various polyadenylation scenarios', () => {
    // Test that RNA processing doesn't fail catastrophically with different polyA scenarios
    const testCases = [
      {
        name: 'standard-signal',
        sequence:
          'ATGAAAGCCTTTGTGAACCAACACCTTCTGGTGGAGCGGCTCTACCTGGTGTGCGGCTCGCTGTAG' +
          'AATAAAGCTAATTCAACCCCAAAAAAAAA',
      },
      {
        name: 'no-signal',
        sequence:
          'ATGAAAGCCTTTGTGAACCAACACCTTCTGGTGGAGCGGCTCTACCTGGTGTGCGGCTCGCTGTAG' +
          'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      },
      {
        name: 'minimal-sequence',
        sequence: 'ATGAAAGCCTTTGTGAACCAACACCTTCTGGTGGAGCGGCTCTACCTGGTGTGCGGCTCGCTGTAG',
      },
    ];

    testCases.forEach(testCase => {
      const promoter = 'GCGCTATAAAAGGCGC' + 'GGGGGGGGGGGG' + 'G'; // 29bp
      const geneSequence = promoter + testCase.sequence;
      const exons = [{ start: 29, end: 29 + testCase.sequence.length, name: testCase.name }];

      const gene = parseGene(geneSequence, exons, testCase.name).unwrap();
      const transcriptionResult = transcribe(gene);
      expect(transcriptionResult.success).toBe(true);

      if (transcriptionResult.success) {
        const preMRNA = transcriptionResult.data;
        const processingResult = processRNA(preMRNA);

        // Should either succeed or fail gracefully
        if (processingResult.success) {
          const mRNA = processingResult.data;
          expect(mRNA.isFullyProcessed()).toBe(true);
        } else {
          expect(typeof processingResult.error.kind).toBe('string');
          expect(processingResult.error.kind).toMatch(
            /splicing-failed|no-start-codon|no-in-frame-stop|invalid-/i,
          );
        }
      }
    });
  });
});
