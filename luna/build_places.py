#!/usr/bin/env python3
"""Construye el buscador local de Mallorca desde el extracto GeoNames ES.zip."""
import argparse
import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path


def inside(point, ring):
    x, y = point
    hit = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            hit = not hit
    return hit


def contains(feature, point):
    geometry = feature['geometry']
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    return any(inside(point, p[0]) and not any(inside(point, h) for h in p[1:]) for p in polygons)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).with_name('lugares.json'))
    args = parser.parse_args()
    features = json.loads(Path(__file__).with_name('municipios.geojson').read_text())['features']
    places = []
    with zipfile.ZipFile(args.archive) as archive:
        for line in archive.read('ES.txt').decode('utf-8').splitlines():
            row = line.split('\t')
            lat, lon = float(row[4]), float(row[5])
            if not (39.1 < lat < 40.0 and 2.2 < lon < 3.6) or row[6] not in 'PTHLS':
                continue
            municipality = next((f for f in features if contains(f, [lon, lat])), None)
            if not municipality:
                continue
            places.append({'id': row[0], 'name': row[1], 'aliases': list(dict.fromkeys([row[2], *row[3].split(',')]))[:35],
                           'latitude': lat, 'longitude': lon, 'class': row[6], 'code': row[7],
                           'municipality': municipality['properties']['NOM']})
    places.sort(key=lambda p: (p['name'].casefold(), p['id']))
    result = {'source': 'https://download.geonames.org/export/dump/ES.zip',
              'license': 'https://creativecommons.org/licenses/by/4.0/',
              'retrieved': datetime.now(timezone.utc).date().isoformat(),
              'archiveSha256': hashlib.sha256(args.archive.read_bytes()).hexdigest(), 'places': places}
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(places)} lugares exportados a {args.output}')


if __name__ == '__main__':
    main()
