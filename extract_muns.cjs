const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/ugrhi4.geojson', 'utf8'));
const muns = new Set();
data.features.forEach(f => {
  if (f.properties && f.properties.NM_MUN) {
    muns.add(f.properties.NM_MUN);
  }
});
const sortedMuns = Array.from(muns).sort();
console.log(JSON.stringify(sortedMuns, null, 2));
