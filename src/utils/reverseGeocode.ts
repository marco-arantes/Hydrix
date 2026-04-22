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
