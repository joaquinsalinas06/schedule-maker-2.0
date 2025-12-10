# 🔧 Modo Desarrollo - Schedule Maker

## ¿Qué es el modo desarrollo?

El modo desarrollo (`DEV_MODE`) permite acceder al dashboard sin necesidad de autenticación válida. Es ideal para:

- 📸 Tomar capturas de pantalla de la aplicación
- 🎨 Probar cambios de UI sin backend
- 🚀 Testing rápido durante el desarrollo

## Cómo activar/desactivar

### Archivo de configuración

Edita el archivo `/frontend/src/config/dev.ts`:

```typescript
// Para activar modo desarrollo (sin autenticación)
export const DEV_MODE = true;

// Para desactivar (requiere login normal)
export const DEV_MODE = false;
```

## ⚠️ IMPORTANTE

**NUNCA DESPLIEGUES A PRODUCCIÓN CON `DEV_MODE = true`**

Antes de hacer deploy:
1. Ve a `/frontend/src/config/dev.ts`
2. Cambia `DEV_MODE` a `false`
3. Verifica que el commit incluye este cambio

## ¿Qué hace el modo desarrollo?

Cuando `DEV_MODE = true`:

✅ **Desactiva la autenticación**
- No necesitas hacer login para acceder al dashboard
- Puedes navegar directamente a `/dashboard`

✅ **Desactiva validaciones de seguridad**
- No se verifican cambios de sesión de usuario
- No se limpia el storage entre sesiones

✅ **Desactiva popup de primera vez**
- No se muestra el tutorial/bienvenida para nuevos usuarios

## Uso para capturas

1. Activa el modo desarrollo en `/frontend/src/config/dev.ts`
2. Inicia el servidor: `npm run dev`
3. Ve directamente a `http://localhost:3000/dashboard`
4. Navega y toma las capturas que necesites
5. **¡No olvides desactivar el modo desarrollo después!**

## Advertencias

- 🔴 El modo desarrollo NO debe usarse en producción
- 🟡 Algunos features que requieren backend real pueden no funcionar
- 🟢 La mayoría de la UI se verá y funcionará normalmente
