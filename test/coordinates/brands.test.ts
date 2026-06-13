import {
  geneCoord,
  transcriptCoord,
  geneToTranscriptCoord,
  transcriptToGeneCoord,
  type GeneCoord,
  type TranscriptCoord,
} from '../../src/coordinates';

describe('coordinate brands', () => {
  describe('geneCoord / transcriptCoord brand primitives', () => {
    test('geneCoord wraps a number without changing its runtime value', () => {
      const c: GeneCoord = geneCoord(42);
      expect(c).toBe(42);
    });

    test('transcriptCoord wraps a number without changing its runtime value', () => {
      const c: TranscriptCoord = transcriptCoord(7);
      expect(c).toBe(7);
    });

    test('brand wrappers accept negative values (e.g., upstream of TSS)', () => {
      expect(transcriptCoord(-30)).toBe(-30);
    });
  });

  describe('geneToTranscriptCoord', () => {
    test('subtracts the TSS from the gene-relative position', () => {
      const tss = geneCoord(100);
      const pos = geneCoord(150);
      expect(geneToTranscriptCoord(pos, tss)).toBe(50);
    });

    test('returns 0 at the TSS itself', () => {
      const tss = geneCoord(100);
      expect(geneToTranscriptCoord(tss, tss)).toBe(0);
    });

    test('returns a negative TranscriptCoord for positions upstream of the TSS', () => {
      const tss = geneCoord(100);
      const upstream = geneCoord(80);
      expect(geneToTranscriptCoord(upstream, tss)).toBe(-20);
    });
  });

  describe('transcriptToGeneCoord', () => {
    test('adds the TSS to the transcript-relative position', () => {
      const tss = geneCoord(100);
      const pos = transcriptCoord(50);
      expect(transcriptToGeneCoord(pos, tss)).toBe(150);
    });

    test('returns the TSS for transcript position 0', () => {
      const tss = geneCoord(100);
      expect(transcriptToGeneCoord(transcriptCoord(0), tss)).toBe(100);
    });
  });

  describe('round-trip conversion', () => {
    test('geneToTranscriptCoord then transcriptToGeneCoord recovers the original', () => {
      const tss = geneCoord(75);
      const orig = geneCoord(200);
      const transcript = geneToTranscriptCoord(orig, tss);
      const recovered = transcriptToGeneCoord(transcript, tss);
      expect(recovered).toBe(orig);
    });

    test('transcriptToGeneCoord then geneToTranscriptCoord recovers the original', () => {
      const tss = geneCoord(75);
      const orig = transcriptCoord(-10);
      const gene = transcriptToGeneCoord(orig, tss);
      const recovered = geneToTranscriptCoord(gene, tss);
      expect(recovered).toBe(orig);
    });
  });
});
