/**
 * Module-private abstract base for the {@link DNA} and {@link RNA} nominal sibling classes.
 * Collapses the byte-equivalent method bodies (substring / complement / containment / equality)
 * into one implementation while preserving each subclass's nominal identity at the public API
 * level.
 *
 * Not re-exported from `src/sequence/index.ts`; only `DNA.ts` and `RNA.ts` extend it. The base
 * is parameterized by an F-bounded `Self` so that Self-returning methods
 * (`getSubsequence`, `getComplement`, `getReverseComplement`) preserve the concrete subclass at
 * call sites, and that Self-accepting methods (`contains`, `equals`, ...) reject the wrong
 * sibling at compile time.
 *
 * @internal
 */

/**
 * Carries the shared implementation of {@link DNA} and {@link RNA}. Subclasses pass a frozen
 * alphabet-specific complement map (`{ A: 'T', ... }` for DNA; `{ A: 'U', ... }` for RNA) at
 * construction time and implement {@link NucleicAcidImpl.clone | clone} to build new instances
 * of their own concrete type without re-running validation.
 *
 * The F-bounded `Self` parameter makes every Self-returning method preserve the subclass
 * nominal type, so e.g. `dna.getComplement()` is statically typed as `DNA` and
 * `dna.contains(rna)` fails to type-check.
 *
 * @typeParam Self - The concrete subclass (`DNA` or `RNA`), bound F-style
 *
 * @internal
 */
export abstract class NucleicAcidImpl<Self extends NucleicAcidImpl<Self>> {
  /** Validated, normalized (upper-case) sequence string backing this instance. */
  public readonly sequence: string;

  /** Frozen base-to-complement-base map supplied by the concrete subclass. */
  private readonly complementMap: Readonly<Record<string, string>>;

  /**
   * Initializes the shared state from already-trusted inputs. The constructor is module-private
   * (subclasses are not value-exported from the package barrel), so construction is reachable
   * only through the parsers.
   *
   * @param sequence - Pre-validated, normalized sequence string
   * @param complementMap - Frozen alphabet-specific complement table
   *
   * @internal
   */
  protected constructor(sequence: string, complementMap: Readonly<Record<string, string>>) {
    this.sequence = sequence;
    this.complementMap = complementMap;
  }

  /**
   * Builds a new instance of the concrete subclass over a pre-validated sequence string. Used
   * by the Self-returning methods on this base class. Subclasses implement this by delegating
   * to their own constructor.
   *
   * @param sequence - Pre-validated, normalized sequence string
   * @returns A new instance of the concrete subclass
   *
   * @internal
   */
  protected abstract clone(sequence: string): Self;

  /**
   * Returns the validated sequence string.
   *
   * @returns The sequence, upper-case
   */
  getSequence(): string {
    return this.sequence;
  }

  /**
   * Returns the length of this sequence in nucleotides.
   *
   * @returns Sequence length
   */
  length(): number {
    return this.sequence.length;
  }

  /**
   * Returns a new sequence over the substring `[start, end)` of this one.
   *
   * @param start - 0-based start position (inclusive)
   * @param end - 0-based end position (exclusive); defaults to the end of the sequence
   * @returns A new instance of the concrete subclass over the substring
   */
  getSubsequence(start: number, end?: number): Self {
    return this.clone(this.sequence.substring(start, end));
  }

  /**
   * Returns a new sequence carrying the Watson-Crick complement of this one (per the
   * alphabet-specific complement map injected at construction time), preserving order.
   *
   * @returns A new instance of the concrete subclass over the complement
   */
  getComplement(): Self {
    return this.clone(complementString(this.sequence, this.complementMap));
  }

  /**
   * Returns a new sequence carrying the reverse complement of this one (Watson-Crick
   * complement, then reversed). Represents the opposite strand of a duplex for DNA.
   *
   * @returns A new instance of the concrete subclass over the reverse complement
   */
  getReverseComplement(): Self {
    return this.clone(reverseComplementString(this.sequence, this.complementMap));
  }

  /**
   * Reports whether this sequence contains a given subsequence.
   *
   * @param subsequence - Subsequence to search for (must be the same nominal type)
   * @returns `true` if the subsequence appears anywhere in this sequence
   */
  contains(subsequence: Self): boolean {
    return this.sequence.includes(subsequence.sequence);
  }

  /**
   * Reports whether this sequence starts with a given prefix.
   *
   * @param prefix - Prefix to test (must be the same nominal type)
   * @returns `true` if the sequence starts with `prefix`
   */
  startsWith(prefix: Self): boolean {
    return this.sequence.startsWith(prefix.sequence);
  }

  /**
   * Reports whether this sequence ends with a given suffix.
   *
   * @param suffix - Suffix to test (must be the same nominal type)
   * @returns `true` if the sequence ends with `suffix`
   */
  endsWith(suffix: Self): boolean {
    return this.sequence.endsWith(suffix.sequence);
  }

  /**
   * Returns the first index of a subsequence in this sequence, or `-1` if not present.
   *
   * @param subsequence - Subsequence to search for (must be the same nominal type)
   * @param startPosition - Position to start the search from (default `0`)
   * @returns Index of the first match, or `-1`
   */
  indexOf(subsequence: Self, startPosition: number = 0): number {
    return this.sequence.indexOf(subsequence.sequence, startPosition);
  }

  /**
   * Reports structural equality with another instance of the same nominal type. Two sequences
   * are equal when their sequence strings match.
   *
   * @param other - The sequence to compare against (must be the same nominal type)
   * @returns `true` if both sequences are identical
   */
  equals(other: Self): boolean {
    return this.sequence === other.sequence;
  }
}

/**
 * Computes the complement of each base in a sequence string using the provided map.
 * Iterates forward (5' to 3') and replaces each base with its Watson-Crick complement.
 *
 * @param sequence - Validated nucleic acid sequence string
 * @param complementMap - Alphabet-specific base-to-complement mapping
 * @returns The complemented sequence string
 * @throws Error if an unmapped base is encountered (should never happen with validated input)
 */
function complementString(
  sequence: string,
  complementMap: Readonly<Record<string, string>>,
): string {
  let result = '';
  for (let i = 0; i < sequence.length; i++) {
    const base = sequence.charAt(i);
    const complement = complementMap[base];
    if (complement === undefined) {
      throw new Error(`Complement encountered invalid base '${base}' at index ${i}`);
    }
    result += complement;
  }
  return result;
}

/**
 * Computes the reverse complement of a sequence string.
 * The reverse complement is obtained by first computing the complement of each base,
 * then reversing the resulting string. This is equivalent to reading the opposite
 * strand from 5' to 3'.
 *
 * Implemented by complementing then reversing, which is clearer and avoids
 * duplicating the complement lookup logic.
 *
 * @param sequence - Validated nucleic acid sequence string
 * @param complementMap - Alphabet-specific base-to-complement mapping
 * @returns The reverse-complemented sequence string
 */
function reverseComplementString(
  sequence: string,
  complementMap: Readonly<Record<string, string>>,
): string {
  const complemented = complementString(sequence, complementMap);
  return complemented.split('').reverse().join('');
}
