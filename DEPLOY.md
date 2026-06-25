# 🚀 Guía de Despliegue — Chat Privado

Esta guía explica cómo publicar la app gratis usando **Render + Turso + Cloudflare R2**.

## 📋 Resumen

| Servicio | Función | Plan gratis |
|----------|---------|-------------|
| **Turso** | Base de datos (SQLite en la nube) | 9GB |
| **Cloudflare R2** | Fotos y notas de voz | 10GB |
| **Render** | Hosting de la app web | 512MB RAM |
| **GitHub** | Repositorio de código | ilimitado |

**Total gratis: ~19GB de almacenamiento**

---

## Paso 1: Configurar Turso (base de datos)

1. Ve a [turso.tech](https://turso.tech) y crea una cuenta
2. Crea una base de datos llamada `chat-privado`
3. Ve a **Settings → API Tokens** y crea un token
4. Anota estos valores:
   - **Database URL**: `libsql://chat-privado-xxxxx.turso.io`
   - **Auth Token**: `eyJ...` (token largo)

## Paso 2: Configurar Cloudflare R2 (almacenamiento)

1. Ve a [cloudflare.com](https://cloudflare.com) y crea una cuenta
2. Entra a **R2 Object Storage**
3. Crea un bucket llamado `chat-privado-uploads`
4. Ve a **Manage R2 API Tokens → Create API Token**
5. Permisos: **Object Read & Write**
6. Anota estos valores:
   - **Account ID**
   - **Access Key ID**
   - **Secret Access Key**

## Paso 3: Subir código a GitHub

```bash
# Inicializar git (si no está)
git init
git add .
git commit -m "Chat Privado listo para producción"

# Crear repo en GitHub y subir
gh repo create chat-privado --private --source=. --push
```

## Paso 4: Desplegar en Render

1. Ve a [render.com](https://render.com) y crea cuenta
2. Click **New → Web Service**
3. Conecta tu repo de GitHub
4. Render detectará `render.yaml` automáticamente
5. Completa las variables de entorno:
   - `DATABASE_URL` → URL de Turso
   - `DATABASE_AUTH_TOKEN` → token de Turso
   - `R2_ACCOUNT_ID` → de Cloudflare
   - `R2_ACCESS_KEY_ID` → de Cloudflare
   - `R2_SECRET_ACCESS_KEY` → de Cloudflare
   - `NEXTAUTH_SECRET` → cualquier string aleatorio largo
6. Click **Create Web Service**
7. Espera a que compile (5-10 min)
8. Tu app estará en `https://chat-privado.onrender.com`

## Paso 5: Migrar datos existentes

Si tienes usuarios en tu SQLite local y quieres pasarlos a Turso:

```bash
# Configurar variables temporales
export DATABASE_URL=libsql://chat-privado-xxxxx.turso.io
export DATABASE_AUTH_TOKEN=eyJ...

# 1. Crear las tablas en Turso
bun run db:push

# 2. Migrar datos
bun run scripts/migrate-to-turso.ts
```

## Paso 6: Recompilar el APK

El APK actual apunta a la URL de desarrollo. Necesitas recompilarlo:

1. Edita `android-app/app/src/main/java/com/chatprivado/app/MainActivity.java`
2. Cambia `APP_URL` a tu URL de Render:
   ```java
   private static final String APP_URL = "https://chat-privado.onrender.com/";
   ```
3. Recompila:
   ```bash
   cd android-app
   export JAVA_HOME=/path/to/jdk17
   export ANDROID_HOME=/path/to/android-sdk
   gradle assembleRelease
   # Firmar (ver scripts anteriores)
   ```
4. Sube el APK a R2 o GitHub Releases

## Paso 7: Evitar que Render se duerma

Render free se duerme después de 15 min sin tráfico. Solución:
1. Ve a [uptimerobot.com](https://uptimerobot.com)
2. Crea un monitor HTTP cada 5 min apuntando a tu URL de Render
3. Tu app nunca se dormirá

---

## 🔧 Variables de entorno completas

```env
# Turso
DATABASE_URL=libsql://chat-privado-xxxxx.turso.io
DATABASE_AUTH_TOKEN=eyJ...

# Cloudflare R2
R2_ACCOUNT_ID=tu-account-id
R2_ACCESS_KEY_ID=tu-access-key
R2_SECRET_ACCESS_KEY=tu-secret-key
R2_BUCKET=chat-privado-uploads

# App
NODE_ENV=production
NEXTAUTH_SECRET=cadena-aleatoria-larga
```

---

## ❓ Solución de problemas

**Error: "DATABASE_URL no está configurada"**
→ Verifica que las variables de entorno estén en Render

**Error: "Token in TURSO_API_TOKEN is invalid"**
→ El token debe ser un API Token de Turso, no un session token

**Las fotos no aparecen**
→ Verifica que R2 esté configurado y el bucket exista

**La app se duerme**
→ Configura UptimeRobot para pinguear cada 5 min
