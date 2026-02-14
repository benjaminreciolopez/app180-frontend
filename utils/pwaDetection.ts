// app180-frontend/utils/pwaDetection.ts

/**
 * Utilidades para detectar modo PWA y características del dispositivo
 */

export interface DeviceInfo {
  isStandalone: boolean;
  isPWA: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: string;
  canInstallPWA: boolean;
}

/**
 * Detecta si la aplicación está corriendo en modo standalone (PWA instalada)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  // Método 1: display-mode standalone
  const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

  // Método 2: navigator.standalone (iOS)
  const isIOSStandalone = (window.navigator as any).standalone === true;

  // Método 3: verificar si fue lanzada desde home screen
  const isLaunchedFromHomeScreen = window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;

  const result = isStandaloneMode || isIOSStandalone || isLaunchedFromHomeScreen;

  // 🐛 Debug logging
  console.log('🔍 PWA Detection:', {
    isStandaloneMode,
    isIOSStandalone,
    isLaunchedFromHomeScreen,
    finalResult: result,
    userAgent: window.navigator.userAgent,
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' :
      window.matchMedia('(display-mode: fullscreen)').matches ? 'fullscreen' :
        window.matchMedia('(display-mode: minimal-ui)').matches ? 'minimal-ui' : 'browser'
  });

  return result;
}

/**
 * Detecta la plataforma del dispositivo
 */
export function getPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';

  // 🛡️ REGLA MAESTRA PARA ESCRITORIO
  // Si la pantalla es ancha, ES ESCRITORIO, sin importar el User Agent (útil para iPads Pro o tablets grandes en modo paisaje)
  if (window.innerWidth >= 1024) {
    return 'desktop';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  // iOS
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }

  // Android
  if (/android/.test(userAgent)) {
    return 'android';
  }

  // Desktop legacy check
  if (/windows|mac|linux/.test(userAgent)) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Detecta el navegador utilizado
 */
export function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = window.navigator.userAgent.toLowerCase();

  if (userAgent.includes('firefox')) return 'Firefox';
  if (userAgent.includes('edg')) return 'Edge';
  if (userAgent.includes('chrome')) return 'Chrome';
  if (userAgent.includes('safari')) return 'Safari';
  if (userAgent.includes('opera') || userAgent.includes('opr')) return 'Opera';

  return 'unknown';
}

/**
 * Verifica si es posible instalar la PWA
 * (Aproximación basada en eventos y características)
 */
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;

  const platform = getPlatform();
  const browser = getBrowser();
  const standalone = isStandalone();

  if (standalone) return false;

  // iOS Safari
  if (platform === 'ios' && browser === 'Safari') return true;

  // Chrome/Edge/Firefox on Android/Desktop usually fire beforeinstallprompt
  // We can't know for sure without the event, but we can guess it's supported
  return true;
}

/**
 * Obtiene información completa del dispositivo
 */
export function getDeviceInfo(): DeviceInfo {
  const standalone = isStandalone();
  const platform = getPlatform();
  const browser = getBrowser();
  const canInstall = canInstallPWA();

  return {
    isStandalone: standalone,
    isPWA: standalone,
    platform,
    browser,
    canInstallPWA: canInstall,
  };
}

/**
 * Verifica si el dispositivo es móvil
 */
export function isMobileDevice(): boolean {
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    return false;
  }
  const platform = getPlatform();
  return platform === 'ios' || platform === 'android';
}

/**
 * Genera un hash único del dispositivo basado en características del navegador
 */
export function generateDeviceHash(): string {
  if (typeof window === 'undefined') {
    return Math.random().toString(36).substring(2);
  }

  // Usar crypto.randomUUID si está disponible
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  // Fallback
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Obtiene instrucciones de instalación según la plataforma
 */
export function getInstallInstructions(platform?: 'ios' | 'android' | 'desktop' | 'unknown'): string[] {
  const detectedPlatform = platform || getPlatform();

  switch (detectedPlatform) {
    case 'ios':
      return [
        'Abre el menú "Compartir" (icono cuadrado con flecha)',
        'Busca y selecciona "Añadir a pantalla de inicio"'
      ];
    case 'android':
      return [
        'Abre el menú del navegador (tres puntos)',
        'Selecciona "Instalar aplicación" o "Añadir a pantalla de inicio"'
      ];
    case 'desktop':
      return [
        'Busca el icono de instalación (+) en la barra de direcciones',
        'O abre el menú y selecciona "Instalar aplicación"'
      ];
    default:
      return [
        'Busca la opción "Añadir a pantalla de inicio" o "Instalar" en el menú de tu navegador'
      ];
  }
}
