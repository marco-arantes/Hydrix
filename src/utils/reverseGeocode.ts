const reverseGeocodeCache = new Map<string, Promise<string>>();

export async function fetchMunicipality(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat},${lng}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'Hydrix-Eco-App/1.0 (contato@hydrix.eco.br)'
      }
    });

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    // Nominatim typically returns city, town, village, or municipality in the address object.
    const address = data.address;
    if (address) {
      // Prioritize some common keys for Brazilian municipalities
      let city = address.city || address.town || address.village || address.municipality || address.county;
      if (city) {
        // Clean common prefixes
        city = city.replace(/^Município de /i, "")
                   .replace(/^Cidade de /i, "")
                   .replace(/^Região Imediata de /i, "")
                   .trim();
        return city;
      }
    }
    return '';
  } catch (error) {
    console.error('Error fetching municipality:', error);
    return '';
  } finally {
    // Optionally remove from cache after a short time to allow retries on failure, 
    // or keep it if we want to aggressively cache. We'll remove it after 5 seconds 
    // so subsequent identical clicks aren't stuck if it failed.
    setTimeout(() => reverseGeocodeCache.delete(cacheKey), 5000);
  }
  })();

  reverseGeocodeCache.set(cacheKey, promise);
  return promise;
}

export async function geocodeMunicipality(municipality: string): Promise<{ lat: number, lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(municipality)}&country=Brazil&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'Hydrix-Eco-App/1.0 (contato@hydrix.eco.br)'
      }
    });

    if (!response.ok) {
      throw new Error('Forward geocoding failed');
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding municipality:', error);
    return null;
  }
}
