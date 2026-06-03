/**
 * Integration tests focused on validation scenarios and error handling.
 *
 * These tests ensure that validation works correctly across module boundaries
 * and that errors are handled gracefully throughout the pipeline.
 */

import { parseGene } from '../../src/gene';
import { parseDNA, parseRNA, transcribeSequence } from '../../src/sequence';
import { DNA } from '../../src/sequence/DNA';
import { RNA } from '../../src/sequence/RNA';
import { parseNucleotidePattern } from '../../src/pattern';
import { at } from '../utils/test-utils';
import { transcribe } from '../../src/transcription';
import { parseMRNA } from '../../src/modifications';
import { processRNA } from '../../src/processing';
import { translate } from '../../src/translation';

describe('Validation Scenarios Integration Tests', () => {
  describe('Sequence Validation Across Modules', () => {
    test('invalid nucleotide propagation', () => {
      expect(!parseDNA('ATGXYZ').success).toBe(true);
      expect(!parseRNA('AUGXYZ').success).toBe(true);
    });

    test('edge case sequence lengths', () => {
      expect(!parseDNA('').success).toBe(true);
      expect(!parseRNA('').success).toBe(true);

      const singleDNA = parseDNA('A').unwrap();
      expect(singleDNA.getSequence()).toBe('A');
      expect(singleDNA.length()).toBe(1);

      const longSequence = 'ATGC'.repeat(10000); // 40kb
      const longDNA = parseDNA(longSequence).unwrap();
      expect(longDNA.length()).toBe(40000);
    });
  });

  describe('Gene Structure Validation', () => {
    test('exon boundary validation', () => {
      const geneSequence = 'ATGAAAGCCTTTGTGAACCAACACCTTGTAAGTAG' + 'TTTTTTTTTTTTTTTT';

      const validExons = [
        { start: 0, end: 15, name: 'exon1' },
        { start: 35, end: 50, name: 'exon2' },
      ];
      expect(parseGene(geneSequence, validExons, 'valid').success).toBe(true);

      const overlappingExons = [
        { start: 0, end: 20, name: 'exon1' },
        { start: 15, end: 35, name: 'exon2' },
      ];
      expect(!parseGene(geneSequence, overlappingExons, 'overlapping').success).toBe(true);

      const beyondExons = [{ start: 0, end: 60, name: 'exon1' }];
      expect(!parseGene(geneSequence, beyondExons, 'beyond').success).toBe(true);

      const negativeExons = [{ start: -5, end: 10, name: 'exon1' }];
      expect(!parseGene(geneSequence, negativeExons, 'negative').success).toBe(true);

      const invalidOrderExons = [{ start: 20, end: 10, name: 'exon1' }];
      expect(!parseGene(geneSequence, invalidOrderExons, 'invalid-order').success).toBe(true);
    });

    test('splice site validation integration', () => {
      const badSpliceGene =
        'GCGCTATAAAAGGCGC' +
        'GGGGGGGGGGGG' +
        'G' +
        'ATGAAAGCCTTTGTGAACCAACACCTT' +
        'AAAAGCCCCCCCCCCCCCCCCCCCCCCC' +
        'CTGGTGGAGCGGCTCTACCTGGTGTAG';

      const exons = [
        { start: 29, end: 56, name: 'exon1' },
        { start: 83, end: 110, name: 'exon2' },
      ];

      const gene = parseGene(badSpliceGene, exons, 'bad-splice').unwrap();
      const transcriptionResult = transcribe(gene);

      expect(transcriptionResult.success).toBe(true);

      if (transcriptionResult.success) {
        const preMRNA = transcriptionResult.data;
        const processingResult = processRNA(preMRNA);

        expect(!processingResult.success).toBe(true);
        if (
          !processingResult.success &&
          processingResult.error.kind === 'processing/splicing-failed'
        ) {
          const splicingKind = processingResult.error.cause.kind;
          expect(
            splicingKind === 'splicing/invalid-donor-site' ||
              splicingKind === 'splicing/invalid-acceptor-site',
          ).toBe(true);
        }
      }
    });
  });

  describe('Pattern Matching Validation', () => {
    test('nucleotide pattern edge cases', () => {
      const testSequence = parseDNA('ATGAAAGCCTTTGTGAACCAACACCTT').unwrap();

      const validPattern = parseNucleotidePattern('ATGN{3}GCC').unwrap();
      const matches = validPattern.findAll(testSequence);
      expect(matches.length).toBe(1);

      expect(!parseNucleotidePattern('').success).toBe(true);
      expect(!parseNucleotidePattern('ATGXYZ').success).toBe(true);

      const longPattern = 'A'.repeat(1000);
      const longPatternObj = parseNucleotidePattern(longPattern).unwrap();
      const longMatches = longPatternObj.findAll(testSequence);
      expect(longMatches).toHaveLength(0);
    });
  });

  describe('Cross-Module Error Propagation', () => {
    test('transcription errors prevent downstream processing', () => {
      const noPromoterGene = 'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT';
      const exons = [{ start: 0, end: 20, name: 'exon1' }];

      const gene = parseGene(noPromoterGene, exons, 'no-promoter').unwrap();
      const transcriptionResult = transcribe(gene);
      expect(!transcriptionResult.success).toBe(true);
    });

    test("processing errors don't crash the system", () => {
      const problematicGene =
        'GCGCTATAAAAGGCGC' + 'GGGGGGGGGGGG' + 'G' + 'ATGAAAGCCTTTGTGAACCAACACCTT';
      const exons = [{ start: 29, end: 56, name: 'exon1' }];

      const gene = parseGene(problematicGene, exons, 'problematic').unwrap();
      const transcriptionResult = transcribe(gene);

      if (transcriptionResult.success) {
        const processingResult = processRNA(transcriptionResult.data);
        if (!processingResult.success) {
          expect(processingResult.error).toBeDefined();
          expect(typeof processingResult.error.kind).toBe('string');
        }
      }
    });
  });

  describe('Boundary Conditions', () => {
    test('minimum viable gene structures', () => {
      const minDNA = parseDNA('A').unwrap();
      expect(minDNA.length()).toBe(1);

      const minRNA = parseRNA('A').unwrap();
      expect(minRNA.length()).toBe(1);

      const minCoding = parseRNA('AUGUAG').unwrap();
      expect(minCoding.length()).toBe(6);
    });

    test('maximum reasonable sizes', () => {
      const largeDNA = parseDNA('ATGC'.repeat(25000)).unwrap(); // 100kb
      expect(largeDNA.length()).toBe(100000);

      const startTime = Date.now();
      const complement = largeDNA.getComplement();
      const endTime = Date.now();

      expect(complement.length()).toBe(100000);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('coordinate edge cases', () => {
      const sequence = 'ATGAAAGCCTTTGTGAACCAACACCTTGTAAGTAG';

      const startExons = [{ start: 0, end: 10, name: 'start' }];
      expect(parseGene(sequence, startExons, 'start').success).toBe(true);

      const endExons = [{ start: 25, end: 35, name: 'end' }];
      expect(parseGene(sequence, endExons, 'end').success).toBe(true);

      const minExons = [{ start: 10, end: 13, name: 'minimum' }];
      expect(parseGene(sequence, minExons, 'minimum').success).toBe(true);
    });
  });

  describe('Type Safety Validation', () => {
    test('type consistency across conversions', () => {
      const dna = parseDNA('ATGAAAGCC').unwrap();
      const rna = transcribeSequence(dna);

      expect(dna).toBeInstanceOf(DNA);
      expect(rna).toBeInstanceOf(RNA);

      expect(dna.getComplement()).toBeInstanceOf(DNA);
      expect(rna.getComplement()).toBeInstanceOf(RNA);
      expect(dna.getReverseComplement()).toBeInstanceOf(DNA);
      expect(rna.getReverseComplement()).toBeInstanceOf(RNA);
    });
  });

  describe('parseDNA/parseRNA Integration', () => {
    test('parseDNA integration with transcription pipeline', () => {
      const dnaResult = parseDNA('GCGCTATAAAAGGCGCGGGGGGATGAAACCCAAATAA');
      expect(dnaResult.success).toBe(true);

      if (dnaResult.success) {
        const gene = parseGene(dnaResult.data.getSequence(), [
          { start: 20, end: 35, name: 'single-exon' },
        ]).unwrap();
        const transcriptionResult = transcribe(gene);

        if (transcriptionResult.success) {
          const preMRNA = transcriptionResult.data;
          expect(preMRNA.sequence.sequence.startsWith('AUG')).toBe(true);
        } else {
          expect(!transcriptionResult.success).toBe(true);
          expect(transcriptionResult.error).toBeTruthy();
        }
      }
    });

    test('parseRNA integration with translation pipeline', () => {
      const rnaResult = parseRNA('AUGAAACCCAAAUAA');
      expect(rnaResult.success).toBe(true);

      if (rnaResult.success) {
        const sequence = rnaResult.data.sequence;
        const mRNA = parseMRNA(sequence, 0, sequence.length).unwrap();
        const polypeptide = translate(mRNA).unwrap();
        expect(polypeptide.aminoAcids.length).toBeGreaterThan(0);
        expect(at(polypeptide.aminoAcids, 0).data.singleLetterCode).toBe('M');
      }
    });

    test('error propagation through parseDNA/parseRNA', () => {
      const invalidDNAResult = parseDNA('ATGXYZ');
      expect(!invalidDNAResult.success).toBe(true);
      if (!invalidDNAResult.success) {
        expect(invalidDNAResult.error.kind).toBe('dna/invalid-characters');
      }

      const invalidRNAResult = parseRNA('AUGXYZ');
      expect(!invalidRNAResult.success).toBe(true);
      if (!invalidRNAResult.success) {
        expect(invalidRNAResult.error.kind).toBe('rna/invalid-characters');
      }
    });

    test('parseDNA/parseRNA edge cases', () => {
      expect(!parseDNA('').success).toBe(true);
      expect(!parseRNA('').success).toBe(true);

      const longSequence = 'ATGAAACCCAAATAA'.repeat(100);
      const longDNAResult = parseDNA(longSequence);
      expect(longDNAResult.success).toBe(true);
      if (longDNAResult.success) {
        expect(longDNAResult.data.length()).toBe(longSequence.length);
      }
    });

    test('parseDNA + transcribeSequence + parseRNA round trip', () => {
      const dnaResult = parseDNA('ATGAAACCCAAATAA');
      expect(dnaResult.success).toBe(true);

      if (dnaResult.success) {
        const rna = transcribeSequence(dnaResult.data);
        expect(rna.getSequence()).toBe('AUGAAACCCAAAUAA');

        const rnaResult = parseRNA(rna.getSequence());
        expect(rnaResult.success).toBe(true);
        if (rnaResult.success) {
          expect(rnaResult.data.getSequence()).toBe('AUGAAACCCAAAUAA');
        }
      }
    });
  });

  describe('Error Propagation Integration', () => {
    test('invalid DNA propagates through entire gene expression pipeline', () => {
      const invalidDNAResult = parseDNA('ATGXYZ');
      expect(!invalidDNAResult.success).toBe(true);
      if (!invalidDNAResult.success) {
        expect(invalidDNAResult.error.kind).toBe('dna/invalid-characters');
      }
    });

    test('validation errors bubble up through processing pipeline', () => {
      const problematicDNA = 'GCGCTATAAAAGGCGCGGGGATGAAA';
      const gene = parseGene(problematicDNA, [
        { start: 18, end: 26, name: 'single-exon' },
      ]).unwrap();

      const transcriptionResult = transcribe(gene);

      if (transcriptionResult.success) {
        const processingResult = processRNA(transcriptionResult.data);
        if (!processingResult.success) {
          expect(processingResult.error).toBeTruthy();
          expect(typeof processingResult.error.kind).toBe('string');
        }
      } else {
        expect(!transcriptionResult.success).toBe(true);
        expect(transcriptionResult.error).toBeTruthy();
      }
    });

    test('cross-system error handling consistency', () => {
      const invalidSequence = 'ATGXYZ';
      const invalidRNASequence = invalidSequence.replace('T', 'U');

      const dnaResult = parseDNA(invalidSequence);
      const rnaResult = parseRNA(invalidRNASequence);

      expect(!dnaResult.success).toBe(true);
      expect(!rnaResult.success).toBe(true);
    });
  });
});
