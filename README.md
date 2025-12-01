# Clinicbot_es

Sistema de agentes de voz inteligentes para clínicas médicas con integración Cal.com y Retell AI.

## Características

- 🤖 Agentes de voz con IA para atención al paciente
- 📅 Integración con Cal.com para gestión de citas
- 🌍 Soporte multiidioma (Español, Inglés, Catalán)
- 📊 Dashboard de administración de clínicas y agentes
- 📞 Historial de llamadas con Retell AI
- 👥 Gestión de personal y transferencias de llamadas

## Despliegue desde Supabase Dashboard

### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Haz clic en "New Project"
3. Completa los datos:
   - **Project name**: clinicbot-es (o tu nombre preferido)
   - **Database Password**: genera una contraseña segura y guárdala
   - **Region**: selecciona la región más cercana a tus usuarios
4. Haz clic en "Create new project" y espera a que se complete la creación

### 2. Ejecutar Migraciones de Base de Datos

1. En tu proyecto de Supabase, ve a **SQL Editor** en el menú lateral
2. Ejecuta las migraciones en orden (puedes copiar el contenido de cada archivo):

   **Orden de ejecución:**
   - `supabase/migrations/20251201092020_create_clinics_table.sql`
   - `supabase/migrations/20251201092042_create_agents_table.sql`
   - `supabase/migrations/20251201092056_create_clinic_staff_table.sql`
   - `supabase/migrations/20251201092111_create_agent_transfers_table.sql`
   - `supabase/migrations/20251201095329_add_google_calendars.sql`
   - `supabase/migrations/20251201121726_add_transfers_to_agents.sql`
   - `supabase/migrations/20251201131410_create_call_history_table.sql`
   - `supabase/migrations/20251201131436_create_calcom_integration.sql`
   - `supabase/migrations/20251201132251_fix_language_codes.sql`
   - `supabase/migrations/20251201133229_update_agents_to_multi_language.sql`

3. Para cada archivo:
   - Haz clic en "New query"
   - Copia y pega el contenido del archivo SQL
   - Haz clic en "Run" (ejecutar)
   - Verifica que no haya errores

### 3. Desplegar Edge Functions

1. Instala Supabase CLI si no lo tienes:
   ```bash
   npm install -g supabase
   ```

2. Inicia sesión en Supabase:
   ```bash
   supabase login
   ```

3. Vincula tu proyecto local con el proyecto de Supabase:
   ```bash
   supabase link --project-ref <tu-project-ref>
   ```
   *Nota: El project-ref lo encuentras en Settings > General del dashboard*

4. Despliega todas las Edge Functions:
   ```bash
   supabase functions deploy fetch-calls
   supabase functions deploy register-call
   supabase functions deploy scrape-clinic
   supabase functions deploy retell-webhook
   supabase functions deploy calcom-check-availability
   supabase functions deploy calcom-fetch-event-types
   supabase functions deploy calcom-create-booking
   ```

5. Configura las variables de entorno para las funciones:
   - Ve a **Edge Functions** en el dashboard
   - Haz clic en "Manage environment variables"
   - Añade las siguientes variables:
     - `RETELL_API_KEY`: tu API key de Retell AI
     - `CALCOM_API_KEY`: tu API key de Cal.com
     - Cualquier otra variable que necesiten tus funciones

### 4. Configurar Variables de Entorno del Frontend

Crea un archivo `.env.local` con las siguientes variables:

```env
VITE_SUPABASE_URL=https://<tu-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

Encuentra estos valores en:
- **Settings > API** en tu dashboard de Supabase
- **URL**: Project URL
- **anon key**: anon/public key

### 5. Desplegar Frontend

Puedes desplegar el frontend en varias plataformas:

#### Opción A: Vercel (Recomendado)

1. Ve a [https://vercel.com](https://vercel.com)
2. Importa tu repositorio de GitHub
3. Configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Haz clic en "Deploy"

#### Opción B: Netlify

1. Ve a [https://netlify.com](https://netlify.com)
2. Arrastra la carpeta `dist` después de ejecutar `npm run build`
3. O conecta tu repositorio de GitHub
4. Configura las variables de entorno en Site settings > Environment variables

#### Opción C: Build Manual

```bash
npm install
npm run build
```

Luego sube el contenido de la carpeta `dist` a tu servidor web.

### 6. Configuración de Autenticación (Opcional)

Si necesitas autenticación de usuarios:

1. Ve a **Authentication > Providers** en Supabase
2. Configura los proveedores que necesites (Google, GitHub, etc.)
3. Actualiza las URLs de redirección en **Authentication > URL Configuration**

### 7. Configuración de Row Level Security (RLS)

Las tablas ya tienen RLS configurado. Para verificar o ajustar:

1. Ve a **Database > Tables**
2. Selecciona una tabla
3. Haz clic en "RLS policies"
4. Revisa y ajusta las políticas según tus necesidades

### 8. Configuración de Integraciones Externas

#### Cal.com

1. Obtén tu API key de Cal.com en [https://app.cal.com/settings/developer/api-keys](https://app.cal.com/settings/developer/api-keys)
2. Guarda las credenciales en la tabla `calcom_integration`:
   - `api_key`: tu Cal.com API key
   - `username`: tu username de Cal.com

#### Retell AI

1. Obtén tu API key de Retell AI en [https://app.retellai.com/settings](https://app.retellai.com/settings)
2. Añade la API key como variable de entorno en Edge Functions
3. Configura el webhook URL en Retell AI:
   - URL: `https://<tu-project-ref>.supabase.co/functions/v1/retell-webhook`

## Desarrollo Local

### Requisitos

- Node.js 18+
- npm o yarn
- Supabase CLI

### Instalación

```bash
# Instalar dependencias
npm install

# Iniciar Supabase local
supabase start

# Aplicar migraciones
supabase db reset

# Iniciar servidor de desarrollo
npm run dev
```

### Comandos Útiles

```bash
# Desarrollo
npm run dev          # Inicia el servidor de desarrollo
npm run build        # Construye para producción
npm run preview      # Vista previa de la build
npm run typecheck    # Verifica tipos TypeScript
npm run lint         # Ejecuta el linter

# Supabase
supabase status      # Ver estado de servicios locales
supabase db reset    # Resetear base de datos local
supabase functions serve <nombre>  # Servir función localmente
```

## Estructura del Proyecto

```
.
├── src/
│   ├── components/    # Componentes React
│   ├── hooks/         # React hooks personalizados
│   ├── services/      # Servicios (Supabase, Cal.com, Retell)
│   ├── types/         # Definiciones TypeScript
│   └── pages/         # Páginas de la aplicación
├── supabase/
│   ├── functions/     # Edge Functions
│   └── migrations/    # Migraciones SQL
└── public/            # Archivos estáticos

```

## Troubleshooting

### Error de CORS en Edge Functions

Si recibes errores de CORS, verifica que las funciones incluyan los headers correctos:

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
});
```

### Error de autenticación Cal.com

Verifica que estás usando el parámetro query correcto:
- ✅ Correcto: `?apiKey=cal_live_...`
- ❌ Incorrecto: `Authorization: Bearer cal_live_...`

### Edge Functions no se actualizan

Después de desplegar, espera 1-2 minutos para que los cambios se propaguen. También puedes forzar un redespliegue:

```bash
supabase functions deploy <nombre> --no-verify-jwt
```

## Soporte

Para problemas o preguntas, crea un issue en el repositorio.

## Licencia

Privado - Todos los derechos reservados
