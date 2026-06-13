# nucleate

A TypeScript library for molecular biology simulation. It models the gene-expression pathway -
DNA transcription to polypeptide translation - and DNA replication through a strongly-typed,
exception-free API.

It aims to stay biologically faithful - its stages, sequence rules, and computed outputs follow
real molecular processes as closely as a simplified model can - but it is built for learning and
exploration, not as a research- or industry-grade simulator, and is not intended to become one.

- **Models the central dogma.** `DNA -> transcription -> pre-mRNA -> splicing -> polyadenylation -> mature mRNA -> translation -> polypeptide`, plus a single-fork DNA replication simulation.
- **Errors are values, not exceptions.** Fallible operations return a `Result<T, E>`; every failure carries a structured, discriminated-union error you can branch on or render with `describeError`.
- **Validated construction.** Domain types (`DNA`, `Gene`, `MRNA`, ...) are built only through validating `parseX` functions, so an instance you hold is always well-formed.
- **Coordinate-safe.** Gene-, transcript-, and mature-mRNA-relative positions are distinct branded types, so the compiler rejects cross-coordinate-space mistakes.
- **ESM, typed, tree-shakeable.** Ships ES modules with full type declarations, per-domain subpath exports, and `sideEffects: false`.

## Installation

```sh
npm install @neilcochran/nucleate
```

Requires Node.js >= 18.

## Quick start

Translate a mature mRNA coding sequence into a protein:

```typescript
import { parseMRNA, translate } from '@neilcochran/nucleate';

// sequence, codingStart, codingEnd
const mRNA = parseMRNA('AUGAAACCCGGGUUUUACUAA', 0, 21).unwrap();
const protein = translate(mRNA).unwrap();

console.log(protein.getSequence()); // 'MKPGFY'  (Met-Lys-Pro-Gly-Phe-Tyr; translation stops at UAA)
```

## The full pipeline: gene to protein

```typescript
import { parseGene, transcribe, processRNA, translate } from '@neilcochran/nucleate';

// A gene with a TATA-box promoter, three exons, and two GT-AG introns.
const sequence =
  'GCGCTATAAAAGGCGC' + // promoter region (TATA box)
  'GGGGGGGGGGGG' + // spacer
  'G' + // transcription start site
  'ATGAAAGCCTTTGTGAACCAACACCTT' + // exon 1 (begins with the AUG start codon)
  'GTAAGTCCCCCCCCCCCCCCCCCCCAG' + // intron 1 (GT...AG)
  'CTGGTGGAGCGGCTCTACCTGGTGTGC' + // exon 2
  'GTAAGTTTTTTTTTTTTTTTTTTTCAG' + // intron 2 (GT...AG)
  'GGCTCGCTGTGCGCCCTGGATGCGTAG'; // exon 3 (ends with the stop codon)

const exons = [
  { start: 29, end: 56, name: 'exon1' },
  { start: 83, end: 110, name: 'exon2' },
  { start: 137, end: 164, name: 'exon3' },
];

const gene = parseGene(sequence, exons, 'demo').unwrap();
const preMRNA = transcribe(gene).unwrap(); // locates the promoter, finds the TSS, transcribes
const mRNA = processRNA(preMRNA).unwrap(); // splices introns, caps, adds a poly-A tail, finds the CDS
const protein = translate(mRNA).unwrap();

console.log(protein.getSequence()); // 'MKAFVNQHLLVERLYLVCGSLCALDA'
console.log(protein.length); // 26
console.log(protein.molecularWeight()); // ~2949.58 (Daltons)
```

`Polypeptide` also exposes `meanHydrophobicity()`, `netChargeAtPhysiologicalPH()`, and
`composition()`.

## Error handling

Functions that can fail return a `Result<T, E>` - a discriminated union of a success branch
(`{ success: true, data }`) and a failure branch (`{ success: false, error }`). Branch on
`result.success` to narrow:

```typescript
import { parseDNA, describeError } from '@neilcochran/nucleate';

const result = parseDNA('ATXY');
if (result.success) {
  console.log(result.data.sequence);
} else {
  console.log(result.error.kind); // 'dna/invalid-characters'
  console.log(describeError(result.error)); // 'Invalid DNA sequence: contains invalid characters X, Y (first at index 2)'
}
```

Every error `kind` is namespaced by domain (`dna/...`, `gene/...`, `splicing/...`), so a single
`describeError` renders any error the library can produce, and the structured payload (offending
characters, positions, bounds) is available for programmatic handling.

`Result` also carries fluent helpers: `unwrap()` (returns the data or throws - handy in tests and
trusted code), `unwrapOr(fallback)`, `map`, `chain`, and `match({ success, failure })`.

## DNA replication

```typescript
import { parseDNA, doubleStrandedDNA, replicate } from '@neilcochran/nucleate';

const parent = doubleStrandedDNA(parseDNA('ATCGATCGATCG').unwrap());
const result = replicate(parent);

if (result.success) {
  const { daughters, events, statistics } = result.data;
  // Two semiconservative daughter duplexes; daughters[0] keeps the parental forward strand.
  console.log(daughters.length); // 2
  console.log(statistics.okazakiFragmentCount);
}
```

`replicate` models one unidirectional fork on a linear template (leading-strand synthesis,
Okazaki fragments, primer removal, ligation) and returns a full timeline of molecular `events`.
For deterministic output, pass a seeded RNG via `replicate(parent, { rng })`. `replicateSteps`
yields an immutable snapshot after each step.

## Package layout

Import from the package root, or from a domain subpath for a narrower surface:

```typescript
import { parseGene } from '@neilcochran/nucleate';        // root re-exports everything
import { parseGene } from '@neilcochran/nucleate/gene';   // or a single domain
```

| Subpath | Contents |
|---|---|
| `result` | `Result<T, E>`, `success` / `failure`, and `describeError` (`NucleateError`) |
| `coordinates` | branded coordinate types (`GeneCoord`, `TranscriptCoord`, `MatureMRNACoord`) and `GenomicRegion` |
| `sequence` | `DNA`, `RNA`, `DoubleStrandedDNA`, `Codon`, parsers, and codon helpers |
| `pattern` | IUPAC `NucleotidePattern` matching |
| `gene` | `Gene`, `Promoter`, `PromoterElement`, and splice-variant validation |
| `variants` | `SpliceVariant` data types and builders |
| `transcription` | `transcribe`, `PreMRNA`, promoter recognition |
| `splicing` | `spliceRNA` and splice-site recognition |
| `polyadenylation` | polyadenylation-site detection and poly-A tail helpers |
| `modifications` | the mature `MRNA` type and `parseMRNA` |
| `processing` | the `processRNA` pipeline and variant-aware orchestrators |
| `translation` | `translate`, `AminoAcid`, `Polypeptide`, the genetic code |
| `replication` | `replicate` / `replicateSteps` and organism profiles |

All exported symbols carry TSDoc; `npm run doc` generates the full API reference with typedoc.

## Design notes

- **Parse, don't validate.** Untrusted input goes through a `parseX` function that returns a
  `Result`; the resulting class instance is then guaranteed well-formed and is exported as a type
  only, so it cannot be constructed in an invalid state from outside the library.
- **Inert data records.** Lightweight specs the caller hands in (for example `SpliceVariant`) are
  plain interfaces, validated where they are used; functions acting on them return `Result` rather
  than throwing.
- **Exceptions are reserved for programmer errors** (out-of-range indices, broken invariants), not
  for expected failures, which are always modeled as `Result`.

## Development

```sh
npm test           # run the test suite (jest)
npm run typecheck  # type-check the whole repo
npm run lint       # eslint + cspell
npm run build      # lint, type-check, and compile the publishable build
```

## Status

Pre-1.0 (`0.x`). The public API may change between minor versions until 1.0.

## License

[MIT](LICENSE.md)
