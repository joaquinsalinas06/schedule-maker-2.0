/**
 * ⚠️ CONFIGURACIÓN DE DESARROLLO ⚠️
 * 
 * Cambiar DEV_MODE a false antes de desplegar a producción
 * 
 * Cuando DEV_MODE = true:
 * - No se requiere autenticación para acceder al dashboard
 * - No se ejecutan validaciones de seguridad de sesión
 * - No se muestra el popup de primera vez
 * 
 * Ideal para:
 * - Tomar capturas de pantalla
 * - Testing rápido de UI
 * - Desarrollo local sin backend
 */
export const DEV_MODE = true;

/**
 * Usuario mock para modo desarrollo
 * Se usa cuando DEV_MODE = true para simular un usuario logueado
 */
export const DEV_USER = {
  id: 1,
  email: 'dev@schedulemaker.com',
  first_name: 'Usuario',
  last_name: 'Desarrollo',
  full_name: 'Usuario Desarrollo',
  student_id: 'DEV001',
  university_id: 1,
  photo_url: null,
  description: 'Usuario de desarrollo para testing',
  is_active: true,
  created_at: new Date().toISOString(),
};
