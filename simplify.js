import fs from 'fs';
import simplify from '@turf/simplify';

console.log('Reading file...');
const data = JSON.parse(fs.readFileSync('public/mesorregioes_ibge.geojson', 'utf8'));
console.log('Simplifying...');
const simplified = simplify(data, {tolerance: 0.05, highQuality: false, mutate: true});
console.log('Writing file...');
fs.writeFileSync('public/mesorregioes_ibge.geojson', JSON.stringify(simplified));
console.log('Done!');
