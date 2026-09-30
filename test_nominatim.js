const lat = -21.17;
const lng = -47.81;

fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
  headers: {
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'User-Agent': 'Hydrix-Eco-App/1.0 (contato@hydrix.eco.br)'
  }
})
.then(res => res.text())
.then(text => console.log(text))
.catch(err => console.error(err));
