const reverseGeocodeCache = new Map<string, Promise<string>>();

export async function fetchMunicipality(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!;
  }

  const promise = (async () => {
    // 1. Tentar Photon (Komoot / OpenStreetMap geocoder aberto e de alta disponibilidade sem bloqueio 429)
    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
      const response = await fetch(photonUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          let city = props.city || props.town || props.village || props.municipality || props.county || props.name;
          if (city) {
            city = city.replace(/^Município de /i, "")
              .replace(/^Cidade de /i, "")
              .replace(/^Região Imediata de /i, "")
              .trim();
            return city;
          }
        }
      }
    } catch (e) {
      console.warn('Photon reverse geocode falhou, tentando fallback Nominatim...', e);
    }

    // 2. Fallback para Nominatim
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'User-Agent': 'Hydrix-Eco-App/1.0 (contato@hydrix.eco.br)'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const address = data.address;
        if (address) {
          let city = address.city || address.town || address.village || address.municipality || address.county;
          if (city) {
            city = city.replace(/^Município de /i, "")
              .replace(/^Cidade de /i, "")
              .replace(/^Região Imediata de /i, "")
              .trim();
            return city;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching municipality via Nominatim:', error);
    }

    return '';
  })().finally(() => {
    setTimeout(() => reverseGeocodeCache.delete(cacheKey), 5000);
  });

  reverseGeocodeCache.set(cacheKey, promise);
  return promise;
}

export async function geocodeMunicipality(municipality: string): Promise<{ lat: number, lng: number } | null> {
  // 1. Tentar Photon
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(municipality)}&limit=1`;
    const response = await fetch(photonUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        const coords = data.features[0].geometry?.coordinates;
        if (coords && coords.length >= 2) {
          return {
            lat: coords[1],
            lng: coords[0]
          };
        }
      }
    }
  } catch (e) {
    console.warn('Photon forward geocoding falhou, tentando Nominatim...', e);
  }

  // 2. Fallback Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(municipality)}&country=Brazil&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'Hydrix-Eco-App/1.0 (contato@hydrix.eco.br)'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error geocoding municipality:', error);
    return null;
  }
}
