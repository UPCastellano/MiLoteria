import { Platform } from 'react-native';

// En producción define EXPO_PUBLIC_API_URL (ej: https://loteria-api.onrender.com).
// En desarrollo: Android emulator usa 10.0.2.2; iOS simulator / web usan localhost.
// En un celular físico usa la IP de tu PC, ej: http://192.168.1.50:8000
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// Web publicada (mismo dominio que la API): rutas relativas.
const isHostedWeb =
  Platform.OS === 'web' && typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname);
export const API_URL = process.env.EXPO_PUBLIC_API_URL || (isHostedWeb ? '' : `http://${HOST}:8000`);

export async function fetchPrediction(refresh = false) {
  const res = await fetch(`${API_URL}/api/prediction?refresh=${refresh}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
