
/**
 * geoService.ts
 * Funções de geolocalização e verificação de perímetro para o check-in facial.
 */

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number; // metros
}

export interface GeoPerimeter {
  lat: number;
  lng: number;
  radius: number; // metros
  enabled: boolean;
}

/**
 * Calcula a distância em metros entre dois pontos usando a fórmula de Haversine.
 */
export const calculateDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371000; // Raio da Terra em metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Verifica se uma posição está dentro do perímetro configurado.
 */
export const isWithinPerimeter = (pos: GeoPosition, perimeter: GeoPerimeter): boolean => {
  const dist = calculateDistance(pos.lat, pos.lng, perimeter.lat, perimeter.lng);
  return dist <= perimeter.radius;
};

/**
 * Obtém a posição atual do dispositivo via API de Geolocalização.
 * Rejeita com erro se o GPS não estiver disponível ou for negado.
 */
export const getCurrentPosition = (timeoutMs = 10000): Promise<GeoPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste dispositivo.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    );
  });
};
