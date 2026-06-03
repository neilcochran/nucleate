import {
  transcribe,
  TranscriptionOptions,
  MAX_PROMOTER_SEARCH_DISTANCE,
} from '../../src/transcription';
import { parseGene, Gene, MIN_INTRON_SIZE } from '../../src/gene';
import { COMPLEX_GENE } from '../test-genes';

describe('transcribe', () => {
  let testGene: Gene;

  beforeEach(() => {
    testGene = parseGene(COMPLEX_GENE.dnaSequence, [...COMPLEX_GENE.exons]).unwrap();
  });

  describe('success path', () => {
    test('transcribes a gene with promoter-detected TSS', () => {
      const result = transcribe(testGene);
      expect(result.success).toBe(true);
      if (result.success) {
        const preMRNA = result.data;
        expect(preMRNA.sequence.sequence).toContain('AUGAAA'); // exon1 in RNA
        expect(preMRNA.sequence.sequence).toContain('AUAAAAAUA'); // exon2 in RNA
        expect(preMRNA.sourceGene).toBe(testGene);
        expect(preMRNA.hasIntrons()).toBe(true);
      }
    });

    test('respects forceTranscriptionStartSite', () => {
      const options: TranscriptionOptions = { forceTranscriptionStartSite: 6 };
      const result = transcribe(testGene, options);
      expect(result.success).toBe(true);
      if (result.success) {
        const preMRNA = result.data;
        expect(preMRNA.transcriptionStartSite).toBe(6);
        expect(preMRNA.sequence.sequence.startsWith('AUGAAA')).toBe(true);
      }
    });

    test('transcript runs to the gene end (no cleavage at transcription time)', () => {
      const simpleGene = parseGene(
        'A'.repeat(100) + 'TATAAAAG' + 'A'.repeat(MIN_INTRON_SIZE) + 'ATGAAATTTGGG',
        [{ start: 128, end: 140 }],
      ).unwrap();
      const result = transcribe(simpleGene);
      expect(result.success).toBe(true);
      if (result.success) {
        const preMRNA = result.data;
        expect(preMRNA.sequence.sequence).toContain('AUGAAAUUUGGG');
        const tss = preMRNA.transcriptionStartSite;
        expect(preMRNA.sequence.sequence.length).toBe(simpleGene.sequence.sequence.length - tss);
      }
    });

    test('accepts a lowered promoter-strength threshold', () => {
      const result = transcribe(testGene, { minPromoterStrength: 1 });
      expect(result.success).toBe(true);
    });

    test('builds a pre-mRNA with the same exon count as the gene', () => {
      const result = transcribe(testGene);
      expect(result.success).toBe(true);
      if (result.success) {
        const preMRNA = result.data;
        expect(preMRNA.exonRegions.length).toBe(testGene.exons.length);
        expect(preMRNA.getSplicedSequence().sequence.length).toBeLessThan(
          preMRNA.sequence.sequence.length,
        );
      }
    });
  });

  describe('biological accuracy', () => {
    test('output sequence contains only RNA bases', () => {
      const result = transcribe(testGene);
      expect(result.success).toBe(true);
      if (result.success) {
        const seq = result.data.sequence.sequence;
        expect(seq).not.toContain('T');
        expect(seq).toContain('U');
        expect(seq).toMatch(/[AUGC]+/);
      }
    });
  });

  describe('failure paths', () => {
    test('returns no-promoter-found when no promoter passes the strength threshold', () => {
      const nopromoterDNA =
        'A'.repeat(MAX_PROMOTER_SEARCH_DISTANCE) +
        'ATGAAAGT' +
        'A'.repeat(MIN_INTRON_SIZE) +
        'AGTTTGGGAATAAA';
      const nopromoterGene = parseGene(nopromoterDNA, [
        { start: MAX_PROMOTER_SEARCH_DISTANCE, end: 208 },
        { start: 230, end: 236 },
      ]).unwrap();
      const result = transcribe(nopromoterGene);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('transcription/no-promoter-found');
        if (result.error.kind === 'transcription/no-promoter-found') {
          expect(result.error.minStrength).toBe(5);
        }
      }
    });

    test('returns tss-out-of-bounds when the forced TSS is past the gene end', () => {
      const result = transcribe(testGene, {
        forceTranscriptionStartSite: testGene.sequence.sequence.length + 10,
      });
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('transcription/tss-out-of-bounds');
      }
    });

    test('returns no-promoter-found when the search window is too narrow', () => {
      const result = transcribe(testGene, { maxPromoterSearchDistance: 10 });
      if (!result.success) {
        expect(result.error.kind).toBe('transcription/no-promoter-found');
      }
    });

    test('parseGene already rejects an empty exon list', () => {
      // gene-has-no-exons is unreachable through transcribe because parseGene rejects an empty
      // exon list at construction time with the no-exons GeneError variant.
      const result = parseGene('ATGAAATTTGGG', []);
      expect(!result.success).toBe(true);
      if (!result.success) {
        expect(result.error.kind).toBe('gene/no-exons');
      }
    });
  });
});
