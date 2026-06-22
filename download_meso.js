import fs from 'fs';
import https from 'https';
global.self = global;
import shp from 'shpjs';

const url = 'https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/bacias_e_divisoes_hidrograficas_do_brasil/2021/Divisao_Hidrografica_Nacional_DHN250/vetores/meso_RH.zip';

console.log('Downloading...', url);
https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to download: ' + res.statusCode);
    return;
  }
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', async () => {
    const buffer = Buffer.concat(chunks);
    console.log('Download complete. Buffer size:', buffer.length);
    console.log('Parsing shapefile...');
    try {
      const geojson = await shp(buffer);
      fs.writeFileSync('./public/mesorregioes_ibge.geojson', JSON.stringify(geojson));
      console.log('Mesorregioes converted and saved to public/mesorregioes_ibge.geojson!');
    } catch (e) {
      console.error('Error parsing shapefile:', e);
    }
  });
}).on('error', (e) => {
  console.error('Network Error:', e);
});
