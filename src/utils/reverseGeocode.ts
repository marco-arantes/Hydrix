export async function fetchMunicipality(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
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
      const city = address.city || address.town || address.village || address.municipality || address.county;
      if (city) {
        return city;
      }
    }
    return '';
  } catch (error) {
    console.error('Error fetching municipality:', error);
    return '';
  }
}

export async function geocodeMunicipality(municipality: string): Promise<{ lat: number, lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(municipality)}&country=Brazil&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
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
