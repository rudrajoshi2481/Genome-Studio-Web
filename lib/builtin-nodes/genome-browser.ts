/**
 * Built-in Genome Browser renderer node — composes Track nodes into a HiGlass view.
 * Registers each sample file with the backend tile server and builds tracks that
 * point directly at it (no 'jupyter' pseudo-server indirection).
 */
export const GENOME_BROWSER_SOURCE = `import higlass as hg
import json
import os
import sys
import traceback
import urllib.request
import urllib.parse
from functools import reduce

# Resolve backend tile server URL (supports dynamic port via SERVER__PORT=0)
_port = os.environ.get('SERVER__PORT', '8000')
if _port == '0':
    try:
        with open(os.path.join(os.path.expanduser('~'), '.bioinformatics-studio-port')) as _pf:
            _port = _pf.read().strip()
    except Exception:
        _port = '8000'
TILE_SERVER = 'http://127.0.0.1:' + _port + '/api/v1/higlass'

TRACK_TYPES = {
    'cooler':     ['heatmap', 'horizontal-heatmap', 'vertical-heatmap', '1d-heatmap'],
    'bigwig':     ['line', 'bar', 'horizontal-line', 'horizontal-bar', '1d-heatmap'],
    'bed':        ['bedlike', 'bar', 'horizontal-bar'],
    'bed2d':      ['2d-rectangle-domains', 'horizontal-2d-rectangle-domains', 'vertical-2d-rectangle-domains'],
    'vcf':        ['bedlike'],
    'gff':        ['gene-annotations', 'horizontal-gene-annotations'],
    'chromsizes': ['chromosome-labels', 'horizontal-chromosome-labels', 'vertical-chromosome-labels'],
    'hitile':     ['line', 'bar', 'horizontal-line', 'horizontal-bar'],
    'multivec':   ['heatmap', 'horizontal-multivec', 'vertical-multivec'],
}

EXT_MAP = [
    ('.mcool', 'cooler'), ('.cool', 'cooler'),
    ('.bigwig', 'bigwig'), ('.bw', 'bigwig'),
    ('.bed.gz', 'bed'), ('.bed', 'bed'),
    ('.bed2d.gz', 'bed2d'), ('.bed2d', 'bed2d'), ('.bedpe', 'bed2d'),
    ('.vcf.gz', 'vcf'), ('.vcf', 'vcf'),
    ('.gff.gz', 'gff'), ('.gff', 'gff'), ('.gtf.gz', 'gff'), ('.gtf', 'gff'),
    ('.chromsizes', 'chromsizes'), ('.chrom.sizes', 'chromsizes'), ('.sizes', 'chromsizes'),
    ('.hitile', 'hitile'),
    ('.multivec', 'multivec'), ('.mv5', 'multivec'),
]

def _detect_file_type(fp):
    low = str(fp).lower()
    for ext, ft in EXT_MAP:
        if low.endswith(ext):
            return ft
    raise ValueError("Cannot detect file type from extension: " + str(fp))

def _register_tileset(fp):
    fp = os.path.abspath(str(fp))
    url = TILE_SERVER + '/register?filepath=' + urllib.parse.quote(fp)
    req = urllib.request.Request(url, method='POST')
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())['uid']

def _default_track_type(file_type, position):
    """Pick a default track type valid for the target position.
    top/bottom take horizontal (or plain 1D) types, left/right take
    vertical types, center/whole take 2D types."""
    tracks = TRACK_TYPES[file_type]
    if position in ('left', 'right'):
        for t in tracks:
            if t.startswith('vertical-'):
                return t
    elif position in ('top', 'bottom'):
        for t in tracks:
            if t.startswith('vertical-'):
                continue
            if t.startswith('horizontal-') or t in ('line', 'bar', 'bedlike', '1d-heatmap',
                                                    'gene-annotations', 'chromosome-labels'):
                return t
    else:
        for t in tracks:
            if not t.startswith(('horizontal-', 'vertical-')):
                return t
    return tracks[0]

@node()
def genome_browser(samples, layout='horizontal', sync=True, initial_domain=None):
    """Compose a HiGlass genome browser from connected Track nodes.

    Each sample is a dict: {file_path, file_type, track_type, position,
    name, view_group, options}. Samples sharing a view_group go into the
    same view; different groups become separate synchronized views (small
    multiples, e.g. for comparing multiple contact matrices).
    """
    if samples is None:
        raise ValueError("No Track nodes connected. Connect one or more Track nodes to the samples input.")
    if isinstance(samples, str):
        samples = json.loads(samples)
    if isinstance(samples, dict):
        samples = [samples]
    flat = []
    for s in samples:
        if isinstance(s, list):
            flat.extend(s)
        elif s:
            flat.append(s)
    samples = flat
    if not samples:
        raise ValueError("No valid samples provided.")

    groups = {}
    errors = []
    for i, s in enumerate(samples):
        if not isinstance(s, dict) or not s.get('file_path'):
            errors.append("Sample #" + str(i + 1) + ": missing file_path")
            continue
        try:
            ft = s.get('file_type') or _detect_file_type(s['file_path'])
        except ValueError as e:
            errors.append("Sample #" + str(i + 1) + ": " + str(e))
            continue
        if ft not in TRACK_TYPES:
            errors.append("Sample #" + str(i + 1) + ": unsupported file_type '" + str(ft) + "'")
            continue
        s = dict(s)
        s['file_type'] = ft
        groups.setdefault(int(s.get('view_group') or 0), []).append(s)

    if not groups:
        raise RuntimeError("All samples failed validation:\\n" + "\\n".join(errors))

    views = []
    for gid in sorted(groups):
        track_pairs = []
        for s in groups[gid]:
            try:
                uid = _register_tileset(s['file_path'])
                tt = s.get('track_type')
                if tt in (None, '', 'auto'):
                    tt = _default_track_type(s['file_type'], s.get('position', 'center'))
                track = hg.track(tt, server=TILE_SERVER, tilesetUid=uid)
                if s.get('name'):
                    track = track.opts(name=s['name'])
                opts = s.get('options') or {}
                if opts:
                    track = track.opts(**opts)
                track_pairs.append((track, s.get('position', 'center')))
            except Exception as e:
                errors.append(str(s.get('file_path')) + ": " + str(e))
                traceback.print_exc()
        if track_pairs:
            view_kwargs = {}
            if initial_domain:
                view_kwargs['initialXDomain'] = initial_domain
            views.append(hg.view(*track_pairs, **view_kwargs))

    if not views:
        raise RuntimeError("No valid tracks to display:\\n" + "\\n".join(errors))

    if len(views) == 1:
        result = views[0].viewconf()
    else:
        concat_fn = hg.vconcat if layout == 'vertical' else hg.hconcat
        result = reduce(concat_fn, views)
        if sync:
            result = result.locks(hg.lock(*views))

    if errors:
        print("WARNING: " + str(len(errors)) + " sample(s) skipped:\\n" + "\\n".join(errors), file=sys.stderr)

    display(result)
    return result
`;

export const GENOME_BROWSER_NODE = {
  title: 'Genome Browser (HiGlass)',
  description:
    'HiGlass renderer: composes all connected Track nodes (file path, file type, track type, position) into one genome browser view. Samples sharing a view group go in the same view; different groups become synchronized views.',
  language: 'python',
  function_name: 'genome_browser',
  inputs: [
    { id: 'input_0', name: 'samples', type: 'any', description: 'Track node(s) — file path, file type, track type, position' },
  ],
  outputs: [{ id: 'output_0', name: 'view', type: 'any', description: 'HiGlass viewconf' }],
  tags: ['higlass', 'renderer', 'genomics'],
};
