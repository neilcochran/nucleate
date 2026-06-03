import {
  spliceRNAWithVariant,
  processAllSplicingVariants,
  processDefaultSpliceVariant,
  enumerateSpliceVariants,
} from '../../src/processing';
import {
  exonSkippingVariant,
  truncationVariant,
  fullLengthVariant,
  type AlternativeSplicingOptions,
  type AlternativeSplicingProfile,
  type SpliceVariant,
} from '../../src/variants';
import { parseGene, validateSpliceVariant } from '../../src/gene';
import { parsePreMRNA } from '../../src/transcription';
import { FOUR_EXON_GENE } from '../test-genes';
import { at, requireCodingSequence } from '../utils/test-utils';

const testSequence = FOUR_EXON_GENE.dnaSequence;
const testExons = FOUR_EXON_GENE.exons;

describe('validateSpliceVariant', () => {
  const gene = parseGene(testSequence, testExons, 'TEST_GENE').unwrap();

  test('accepts a full-length variant under default options', () => {
    const variant: SpliceVariant = { name: 'full', includedExons: [0, 1, 2, 3] };
    expect(validateSpliceVariant(variant, gene).success).toBe(true);
  });

  test('rejects an out-of-range exon index', () => {
    const variant: SpliceVariant = { name: 'bad', includedExons: [0, 1, 10] };
    const result = validateSpliceVariant(variant, gene);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'variant/invalid-exon-index') {
      expect(result.error.exonIndex).toBe(10);
      expect(result.error.totalExons).toBe(4);
    }
  });

  test('rejects a variant that skips the first exon when not allowed', () => {
    const variant: SpliceVariant = { name: 'no-first', includedExons: [1, 2, 3] };
    const result = validateSpliceVariant(variant, gene);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('variant/skips-first-exon');
    }
  });

  test('rejects a variant that skips the last exon when not allowed', () => {
    const variant: SpliceVariant = { name: 'no-last', includedExons: [0, 1, 2] };
    const result = validateSpliceVariant(variant, gene);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('variant/skips-last-exon');
    }
  });

  test('rejects a variant below the minimum exon count', () => {
    const variant: SpliceVariant = { name: 'tiny', includedExons: [0] };
    const opts: AlternativeSplicingOptions = {
      requireMinimumExons: true,
      minimumExonCount: 2,
      allowSkipLastExon: true,
    };
    const result = validateSpliceVariant(variant, gene, opts);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'variant/below-minimum-exons') {
      expect(result.error.included).toBe(1);
      expect(result.error.minimum).toBe(2);
    }
  });

  test('rejects a variant whose mature length is not divisible by 3', () => {
    // Custom 2-exon gene where dropping the last exon yields a 6-bp transcript (divisible
    // by 3). Use the four-exon gene with a variant that produces 9 bp (still in-frame).
    // To test out-of-frame, build a gene with two 5-bp exons.
    const offFrameSeq = 'ATGAAGTAAGGGGGGGGGGGGGGAGCCCCATAG'; // 33 bp
    // exon1 (0,5): ATGAA, exon2 (25,33): CCCCATAG (8 bp). Total 13 bp - not divisible by 3.
    const offFrameGene = parseGene(offFrameSeq, [
      { start: 0, end: 5, name: 'exon1' },
      { start: 25, end: 33, name: 'exon2' },
    ]).unwrap();
    const variant: SpliceVariant = { name: 'off-frame', includedExons: [0, 1] };
    const result = validateSpliceVariant(variant, offFrameGene, {
      validateReadingFrames: true,
      validateCodons: false,
    });
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'variant/not-in-frame') {
      expect(result.error.length).toBe(13);
    }
  });

  test('rejects a variant missing the start codon', () => {
    const variant: SpliceVariant = { name: 'no-start', includedExons: [1, 2, 3] };
    const result = validateSpliceVariant(variant, gene, {
      allowSkipFirstExon: true,
      validateCodons: true,
    });
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'variant/missing-start-codon') {
      expect(result.error.found).not.toBe('AUG');
    }
  });

  test('rejects a variant missing the stop codon', () => {
    const variant: SpliceVariant = { name: 'no-stop', includedExons: [0, 1, 2] };
    const result = validateSpliceVariant(variant, gene, {
      allowSkipLastExon: true,
      validateCodons: true,
    });
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('variant/missing-stop-codon');
    }
  });
});

describe('spliceRNAWithVariant', () => {
  test('produces the spliced RNA with exons concatenated in gene order', () => {
    const gene = parseGene(testSequence, testExons, 'TEST_GENE').unwrap();
    const preMRNA = parsePreMRNA(testSequence.replace(/T/g, 'U'), gene, 0).unwrap();
    const variant: SpliceVariant = { name: 'skip-2', includedExons: [0, 2, 3] };
    const result = spliceRNAWithVariant(preMRNA, variant);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe('AUGAAAGGGUUUUAG');
    }
  });

  test('returns the spliced RNA for a full-length variant', () => {
    const gene = parseGene(testSequence, testExons, 'TEST_GENE').unwrap();
    const preMRNA = parsePreMRNA(testSequence.replace(/T/g, 'U'), gene, 0).unwrap();
    const variant: SpliceVariant = { name: 'full', includedExons: [0, 1, 2, 3] };
    const result = spliceRNAWithVariant(preMRNA, variant);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequence).toBe('AUGAAACCCGGGGGGUUUUAG');
    }
  });

  test('propagates validation failures', () => {
    const gene = parseGene(testSequence, testExons, 'TEST_GENE').unwrap();
    const preMRNA = parsePreMRNA(testSequence.replace(/T/g, 'U'), gene, 0).unwrap();
    const variant: SpliceVariant = { name: 'oob', includedExons: [0, 1, 5] };
    const result = spliceRNAWithVariant(preMRNA, variant);
    expect(!result.success).toBe(true);
    if (!result.success && result.error.kind === 'variant/invalid-exon-index') {
      expect(result.error.exonIndex).toBe(5);
    }
  });
});

describe('processAllSplicingVariants', () => {
  test('surfaces every variant with its tagged outcome', () => {
    const profile: AlternativeSplicingProfile = {
      geneId: 'TEST_GENE',
      defaultVariant: 'full',
      variants: [
        fullLengthVariant('full', 4),
        exonSkippingVariant('skip-2', 4, [1]),
        truncationVariant('short', 3),
      ],
    };
    const gene = parseGene(testSequence, testExons, 'TEST_GENE', profile).unwrap();
    const preMRNA = parsePreMRNA(testSequence.replace(/T/g, 'U'), gene, 0).unwrap();
    // validateCodons defaults to false here, so the CDS-abolishing 'short' variant surfaces as
    // no-protein rather than being dropped.
    const result = processAllSplicingVariants(preMRNA, { allowSkipLastExon: true });
    expect(result.success).toBe(true);
    if (result.success) {
      // One entry per profile variant - nothing is dropped.
      expect(result.data).toHaveLength(3);

      const full = result.data.find(r => r.variant.name === 'full');
      expect(full?.kind).toBe('translated');
      if (full?.kind === 'translated') {
        expect(full.polypeptide.length).toBe(6);
        expect(full.matureMRNA.codingSequence).toBeDefined();
      }

      const skip2 = result.data.find(r => r.variant.name === 'skip-2');
      expect(skip2?.kind).toBe('translated');
      if (skip2?.kind === 'translated') {
        expect(skip2.polypeptide.length).toBe(4);
      }

      const short = result.data.find(r => r.variant.name === 'short');
      expect(short?.kind).toBe('no-protein');
      if (short?.kind === 'no-protein') {
        expect(short.matureMRNA.codingSequence).toBeUndefined();
      }
    }
  });

  test('fails when the gene has no splicing profile', () => {
    const gene = parseGene(testSequence, testExons, 'TEST_GENE').unwrap();
    const preMRNA = parsePreMRNA(testSequence.replace(/T/g, 'U'), gene, 0).unwrap();
    const result = processAllSplicingVariants(preMRNA);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('splice-selection/no-splicing-profile');
    }
  });

  test('surfaces a variant that fails validation as invalid', () => {
    const profile: AlternativeSplicingProfile = {
      geneId: 'TEST_GENE',
      defaultVariant: 'full',
      variants: [fullLengthVariant('full', 4), { name: 'skips-first', includedExons: [1, 2, 3] }],
    };
    const gene = parseGene(testSequence, testExons, 'TEST_GENE', profile).unwrap();
    const preMRNA = parsePreMRNA(testSequence.replace(/T/g, 'U'), gene, 0).unwrap();
    const result = processAllSplicingVariants(preMRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      // Both variants are reported; the skip-first variant is surfaced, not silently dropped.
      expect(result.data).toHaveLength(2);

      const full = result.data.find(r => r.variant.name === 'full');
      expect(full?.kind).toBe('translated');

      const skipsFirst = result.data.find(r => r.variant.name === 'skips-first');
      if (
        skipsFirst?.kind === 'invalid' &&
        skipsFirst.error.kind === 'processing/splicing-failed'
      ) {
        expect(skipsFirst.error.cause.kind).toBe('variant/skips-first-exon');
      } else {
        throw new Error(`expected invalid/splicing-failed, got ${JSON.stringify(skipsFirst)}`);
      }
    }
  });
});

describe('processDefaultSpliceVariant', () => {
  test("processes the profile's default variant into a mature mRNA", () => {
    const profile: AlternativeSplicingProfile = {
      geneId: 'TEST_GENE',
      defaultVariant: 'full',
      variants: [fullLengthVariant('full', 4)],
    };
    const gene = parseGene(testSequence, testExons, 'TEST_GENE', profile).unwrap();
    const preMRNA = parsePreMRNA(testSequence.replace(/T/g, 'U'), gene, 0).unwrap();
    const result = processDefaultSpliceVariant(preMRNA);
    expect(result.success).toBe(true);
    if (result.success) {
      const mRNA = result.data;
      // The mature mRNA's coding sequence is the variant's spliced exons (AUG...UAG)
      expect(requireCodingSequence(mRNA).sequence).toBe('AUGAAACCCGGGGGGUUUUAG');
      // A real mature mRNA: cap present, poly-A tail appended
      expect(mRNA.fivePrimeCap).toBe(true);
      expect(mRNA.polyATailLength).toBeGreaterThan(0);
    }
  });

  test('fails when the gene has no splicing profile', () => {
    const gene = parseGene(testSequence, testExons, 'TEST_GENE').unwrap();
    const preMRNA = parsePreMRNA(testSequence.replace(/T/g, 'U'), gene, 0).unwrap();
    const result = processDefaultSpliceVariant(preMRNA);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.kind).toBe('splice-selection/no-default-variant');
    }
  });
});

describe('enumerateSpliceVariants', () => {
  test('yields exactly the variants permitted by default options', () => {
    const gene = parseGene(testSequence, testExons).unwrap();
    const variants = [
      ...enumerateSpliceVariants(gene, { validateReadingFrames: false, validateCodons: false }),
    ];
    // Default options require first (0) and last (3) exons, minimum 1 exon
    expect(variants).toHaveLength(4);
    const variantStrings = variants.map(v => v.includedExons.join('-')).sort();
    expect(variantStrings).toEqual(['0-1-2-3', '0-1-3', '0-2-3', '0-3']);
  });

  test('honors allowSkipFirstExon and allowSkipLastExon', () => {
    const gene = parseGene(testSequence, testExons).unwrap();
    const variants = [
      ...enumerateSpliceVariants(gene, {
        allowSkipFirstExon: true,
        allowSkipLastExon: true,
        validateReadingFrames: false,
        validateCodons: false,
        requireMinimumExons: false,
      }),
    ];
    // 2^4 - 1 = 15 non-empty exon subsets
    expect(variants).toHaveLength(15);
  });

  test('honors minimumExonCount', () => {
    const gene = parseGene(testSequence, testExons).unwrap();
    const variants = [
      ...enumerateSpliceVariants(gene, {
        requireMinimumExons: true,
        minimumExonCount: 3,
        validateReadingFrames: false,
        validateCodons: false,
      }),
    ];
    for (const variant of variants) {
      expect(variant.includedExons.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('yields one variant for a single-exon gene', () => {
    const singleGene = parseGene('ATGAAATAG', [{ start: 0, end: 9, name: 'exon1' }]).unwrap();
    const variants = [...enumerateSpliceVariants(singleGene, { validateCodons: false })];
    expect(variants).toHaveLength(1);
    expect(at(variants, 0).includedExons).toEqual([0]);
  });

  test('is lazy: callers can break out without paying for all combinations', () => {
    const gene = parseGene(testSequence, testExons).unwrap();
    const iter = enumerateSpliceVariants(gene, {
      allowSkipFirstExon: true,
      allowSkipLastExon: true,
      validateReadingFrames: false,
      validateCodons: false,
      requireMinimumExons: false,
    });
    const first = iter.next();
    expect(first.done).toBe(false);
    // Iterator yielded once; we abandon it without consuming the rest. The test passes if
    // no error is thrown.
  });

  test('returns nothing when the gene has no exons', () => {
    // parseGene rejects no-exon genes; we exercise the iterator's defensive empty-list
    // handling via a directly-constructed object instead.
    const fakeGene = { exons: [] } as unknown as Parameters<typeof enumerateSpliceVariants>[0];
    expect([...enumerateSpliceVariants(fakeGene)]).toHaveLength(0);
  });
});
