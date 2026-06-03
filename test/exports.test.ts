/**
 * Guards the dual import surface. Every module is reachable both from the root barrel
 * (`src/index.ts` re-exports all 13 via `export *`) and from its own subpath. `export *` silently
 * drops a name when two modules export the same one, so a future collision would vanish from the
 * root barrel with no error. This asserts the module barrels' value-export names are pairwise
 * disjoint, catching such a collision at test time.
 *
 * Type-only exports are erased at runtime and are not covered here; the risk this guards is two
 * modules exporting the same runtime value (a function or constant).
 */
import * as result from '../src/result';
import * as coordinates from '../src/coordinates';
import * as sequence from '../src/sequence';
import * as pattern from '../src/pattern';
import * as gene from '../src/gene';
import * as variants from '../src/variants';
import * as transcription from '../src/transcription';
import * as splicing from '../src/splicing';
import * as polyadenylation from '../src/polyadenylation';
import * as modifications from '../src/modifications';
import * as processing from '../src/processing';
import * as translation from '../src/translation';
import * as replication from '../src/replication';

const barrels: Record<string, object> = {
  result,
  coordinates,
  sequence,
  pattern,
  gene,
  variants,
  transcription,
  splicing,
  polyadenylation,
  modifications,
  processing,
  translation,
  replication,
};

describe('package export surface', () => {
  test('module barrels have no colliding value-export names', () => {
    const owner = new Map<string, string>();
    const collisions: string[] = [];
    for (const [moduleName, namespace] of Object.entries(barrels)) {
      for (const exportName of Object.keys(namespace)) {
        const existing = owner.get(exportName);
        if (existing !== undefined) {
          collisions.push(`'${exportName}' exported by both ${existing} and ${moduleName}`);
        } else {
          owner.set(exportName, moduleName);
        }
      }
    }
    expect(collisions).toEqual([]);
  });
});
