import type { SpliceVariant } from './splice-variant.js';

/**
 * Builds an exon-skipping {@link SpliceVariant}: all exons of a gene except those in
 * `skippedExons` are included.
 *
 * @param name - Variant name
 * @param totalExons - Total exon count in the source gene
 * @param skippedExons - Indices to exclude from the variant
 * @param description - Optional human-readable description
 * @returns The constructed variant
 */
export function exonSkippingVariant(
  name: string,
  totalExons: number,
  skippedExons: readonly number[],
  description?: string,
): SpliceVariant {
  const skipped = new Set(skippedExons);
  const includedExons: number[] = [];
  for (let i = 0; i < totalExons; i++) {
    if (!skipped.has(i)) {
      includedExons.push(i);
    }
  }
  return {
    name,
    includedExons,
    description:
      description ??
      `Skips exon${skippedExons.length > 1 ? 's' : ''} ${[...skippedExons].join(', ')}`,
  };
}

/**
 * Builds a truncation {@link SpliceVariant} that keeps only the first `exonCount` exons of a
 * gene.
 *
 * @param name - Variant name
 * @param exonCount - Number of leading exons to include
 * @param description - Optional human-readable description
 * @returns The constructed variant
 */
export function truncationVariant(
  name: string,
  exonCount: number,
  description?: string,
): SpliceVariant {
  const includedExons = Array.from({ length: exonCount }, (_, i) => i);
  return {
    name,
    includedExons,
    description: description ?? `Truncated to first ${exonCount} exon${exonCount > 1 ? 's' : ''}`,
  };
}

/**
 * Builds a minimal {@link SpliceVariant} that includes only the specified essential exon
 * indices.
 *
 * @param name - Variant name
 * @param essentialExons - Indices to include (sorted automatically)
 * @param description - Optional human-readable description
 * @returns The constructed variant
 */
export function minimalVariant(
  name: string,
  essentialExons: readonly number[],
  description?: string,
): SpliceVariant {
  return {
    name,
    includedExons: [...essentialExons].sort((a, b) => a - b),
    description:
      description ?? `Minimal variant with essential exons ${[...essentialExons].join(', ')}`,
  };
}

/**
 * Builds a full-length {@link SpliceVariant} that includes every exon of a gene.
 *
 * @param name - Variant name
 * @param totalExons - Total exon count in the source gene
 * @param description - Optional human-readable description
 * @returns The constructed variant
 */
export function fullLengthVariant(
  name: string,
  totalExons: number,
  description?: string,
): SpliceVariant {
  const includedExons = Array.from({ length: totalExons }, (_, i) => i);
  return {
    name,
    includedExons,
    description: description ?? 'Full-length variant with all exons',
  };
}
