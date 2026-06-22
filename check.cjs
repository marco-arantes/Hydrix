const https = require('https');
https.get('https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/bacias_e_divisoes_hidrograficas_do_brasil/2021/Divisao_Hidrografica_Nacional_DHN250/vetores/', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d.match(/href="([^"]+\.zip)"/g)));
});
