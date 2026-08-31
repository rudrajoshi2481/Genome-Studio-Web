/**
 * Built-in NGL Viewer node — displays protein/structure files (PDB, mmCIF,
 * GRO, ...) with NGL (https://github.com/nglviewer/ngl).
 *
 * Sample-based approach (mirrors the genomics Track → Genome Browser chain):
 * Structure nodes (dataType 'ngl-structure') connect to the `structures`
 * input; each carries {file_path, file_type, representation, color_scheme,
 * name, options}. Multiple Structure nodes render together in one 3D view —
 * multiple proteins, or the same protein with different representations.
 *
 * Registers each structure file with the backend NGL server (same pattern as
 * the HiGlass tile server: id -> filepath registry, so only registered files
 * are served) and outputs a display spec the frontend NGLViewer renders.
 */
export const NGL_VIEWER_SOURCE = `import os
import sys
import json
import urllib.request
import urllib.parse

# Resolve backend NGL server URL (supports dynamic port via SERVER__PORT=0)
_port = os.environ.get('SERVER__PORT', '8000')
if _port == '0':
    try:
        with open(os.path.join(os.path.expanduser('~'), '.bioinformatics-studio-port')) as _pf:
            _port = _pf.read().strip()
    except Exception:
        _port = '8000'
NGL_SERVER = 'http://127.0.0.1:' + _port + '/api/v1/ngl'

SUPPORTED = {
    'pdb': 'pdb', 'ent': 'pdb',
    'cif': 'cif', 'mmcif': 'cif',
    'gro': 'gro',
    'pqr': 'pqr',
    'mol2': 'mol2',
    'sdf': 'sdf',
}

# file_type values accepted in specs (what the Structure node form offers)
SPEC_FILE_TYPES = ('auto', 'pdb', 'cif', 'gro', 'pqr', 'mol2', 'sdf')

def _detect_file_type(fp):
    ext = os.path.splitext(str(fp))[1].lower().lstrip('.')
    if ext not in SUPPORTED:
        raise ValueError("Unsupported structure format '." + ext + "'. Supported: pdb, cif/mmcif, gro, pqr, mol2, sdf.")
    return SUPPORTED[ext]

def _register_structure(fp):
    fp = os.path.abspath(str(fp))
    url = NGL_SERVER + '/register?filepath=' + urllib.parse.quote(fp)
    req = urllib.request.Request(url, method='POST')
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())

def _parse_options(opts):
    """Options may be a dict or a JSON string (from the Structure node form)."""
    if isinstance(opts, str):
        if not opts.strip():
            return {}
        try:
            opts = json.loads(opts)
        except ValueError:
            return {}
    if isinstance(opts, dict):
        return opts
    return {}

@node()
def ngl_viewer(structures=None):
    """View protein/structure files with NGL (PDB, mmCIF, GRO, PQR, MOL2, SDF).

    structures: Structure node(s) — each a dict {file_path, file_type,
        representation, color_scheme, name, options}. Multiple Structure
        nodes render together in one 3D view (e.g. multiple proteins, or the
        same protein with different representations).
    """
    # Normalize structures: None | dict | list | JSON string
    if structures is None:
        structures = []
    elif isinstance(structures, str):
        try:
            structures = json.loads(structures)
        except ValueError:
            structures = []
    if isinstance(structures, dict):
        structures = [structures]
    flat = []
    for s in structures:
        if isinstance(s, list):
            flat.extend(s)
        elif s:
            flat.append(s)
    structures = flat

    if not structures:
        raise ValueError("Nothing to view. Connect one or more Structure nodes to the structures input.")

    entries = []
    errors = []
    for i, s in enumerate(structures):
        try:
            if not isinstance(s, dict) or not s.get('file_path'):
                errors.append("Structure #" + str(i + 1) + ": missing file_path")
                continue
            fp = str(s['file_path']).strip()
            if not os.path.exists(fp):
                errors.append("Structure #" + str(i + 1) + ": file not found: " + fp)
                continue
            ft = s.get('file_type')
            if ft in (None, '', 'auto'):
                ft = _detect_file_type(fp)
            elif ft not in ('pdb', 'cif', 'gro', 'pqr', 'mol2', 'sdf'):
                errors.append("Structure #" + str(i + 1) + ": unsupported file_type '" + str(ft) + "'")
                continue
            reg = _register_structure(fp)
            entry = {
                'file_path': fp,
                'file_type': ft,
                'file_url': reg.get('url'),
                'representation': s.get('representation') or 'cartoon',
                'name': s.get('name') or '',
                'options': _parse_options(s.get('options')),
            }
            cs = s.get('color_scheme')
            if cs and cs != 'default':
                entry['color_scheme'] = cs
            entries.append(entry)
        except Exception as e:
            errors.append("Structure #" + str(i + 1) + ": " + str(e))

    if not entries:
        raise RuntimeError("No valid structures to display:\\n" + "\\n".join(errors))
    if errors:
        print("WARNING: " + str(len(errors)) + " structure(s) skipped:\\n" + "\\n".join(errors), file=sys.stderr)

    spec = {
        '__ngl__': True,
        'structures': entries,
    }
    display(spec)
    return spec
`;

export const NGL_VIEWER_NODE = {
  title: 'NGL Viewer',
  description:
    'Displays protein/structure files (PDB, mmCIF, GRO, PQR, MOL2, SDF) with an interactive NGL 3D viewer. Connect Structure nodes (one per sample/representation) to the structures input.',
  language: 'python',
  function_name: 'ngl_viewer',
  inputs: [
    { id: 'input_0', name: 'structures', type: 'any', description: 'Structure node(s) — file path, representation, color scheme, options' },
  ],
  outputs: [{ id: 'output_0', name: 'spec', type: 'any', description: 'NGL display spec (pass-through)' }],
  tags: ['ngl', 'protein', 'structure', 'viewer'],
};
