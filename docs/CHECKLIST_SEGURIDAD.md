# Checklist de seguridad — Importadora A&N

> **Proyecto:** Catálogo web y panel administrativo de Importadora A&N  
> **Repositorio revisado:** `importadora-an-catalogo-main.zip`  
> **Fecha de creación:** 27/07/2026 21:40 (America/La_Paz)  
> **Estado general inicial:** Riesgo medio–alto hasta verificar y corregir Supabase  
> **Objetivo:** Registrar cada hallazgo, corrección, prueba y decisión para no perder el contexto del trabajo.

---

## Cómo usar este documento

Estados sugeridos:

- [ ] Pendiente
- [~] En proceso
- [x] Resuelto
- [!] Bloqueado
- [-] No aplica

Cuando se resuelva un punto, completar:

- **Fecha y hora de resolución**
- **Responsable**
- **Descripción de lo realizado**
- **Evidencia o archivo modificado**
- **Prueba realizada**
- **Resultado**

Formato sugerido:

```md
- [x] Tarea
  - Fecha y hora: 28/07/2026 10:30
  - Responsable: Daniel
  - Descripción: Se habilitó RLS y se creó una política de lectura pública limitada.
  - Evidencia: Captura de Supabase / archivo SQL / commit.
  - Prueba: Consulta anónima desde navegador y Postman.
  - Resultado: El usuario anónimo solo puede leer las columnas públicas.
```

---

# 1. Resumen ejecutivo de la auditoría

## Hallazgos principales

- [x] Verificar si RLS está habilitado en todas las tablas expuestas.
- [x] Verificar las políticas RLS de `productos_publicos`.
- [x] Verificar las políticas RLS de `inventario_privado`.
- [x] Verificar las políticas RLS de `configuracion_publica`.
- [x] Verificar las políticas de `storage.objects` para el bucket `productos`.
- [ ] Desactivar el registro público de nuevos usuarios.
- [~] Crear control de roles real.
- [~] Evitar que cualquier usuario autenticado sea tratado como administrador.
- [ ] Confirmar que ninguna llave `service_role`, `sb_secret_`, contraseña o token privado esté expuesto.
- [-] Corregir la lógica de “ocultar precios”. Decisión: es privacidad visual frente a clientes cercanos, no confidencialidad técnica.
- [ ] Reducir consultas `select('*')`.
- [ ] Mejorar integridad de guardado entre tablas públicas y privadas.
- [ ] Agregar controles de sesión y seguridad operativa.
- [ ] Fijar una versión exacta de Supabase JS.
- [ ] Evaluar CSP y cabeceras de seguridad.
- [ ] Documentar y probar cada corrección.

---

# 2. Inventario técnico actual

## Archivos revisados

- [x] `index.html`
- [x] `dmmpadmin/index.html`
- [x] `js/config.js`
- [x] `js/catalog.js`
- [x] `js/admin.js`
- [x] `css/styles.css`
- [x] `README.md`

## Servicios detectados

- Supabase Database
- Supabase Auth
- Supabase Storage
- GitHub Pages o alojamiento estático equivalente
- WhatsApp mediante enlace
- CDN jsDelivr para Supabase JS
- Google Fonts

## Tablas detectadas

- `productos_publicos`
- `inventario_privado`
- `configuracion_publica`

## Storage detectado

- Bucket: `productos`

## Ruta administrativa detectada

```text
/dmmpadmin/
```

## Método de autenticación detectado

```javascript
db.auth.signInWithPassword({
  email,
  password
})
```

---

# 3. Credenciales y llaves

## 3.1 Llave pública de Supabase

Se encontró una llave pública en `js/config.js`.

```text
Tipo: sb_publishable_
```

### Evaluación

La llave publicable de Supabase puede estar en el frontend. No debe considerarse secreta.

La seguridad debe depender de:

- RLS;
- políticas de Storage;
- roles;
- restricciones de Auth;
- permisos mínimos.

### Checklist

- [x] Confirmar que la llave encontrada es `sb_publishable_`.
- [x] Confirmar que no se encontró `service_role` en el ZIP.
- [x] Confirmar que no se encontró `sb_secret_` en el ZIP.
- [x] Confirmar que no se encontró una contraseña de base de datos.
- [x] Confirmar que no se encontró un JWT secret.
- [x] Confirmar que no se encontraron tokens de sesión fijos.
- [ ] Revisar el historial completo del repositorio GitHub.
- [ ] Buscar secretos en commits anteriores.
- [ ] Buscar secretos en ramas antiguas.
- [ ] Buscar secretos en GitHub Actions.
- [ ] Buscar secretos en archivos `.env`.
- [ ] Buscar secretos en issues, pull requests y documentación.
- [ ] Activar GitHub Secret Scanning si el repositorio lo permite.
- [ ] Rotar cualquier secreto privado si se encuentra en el historial.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 4. Supabase Auth

## 4.1 Desactivar registro público

### Riesgo

Aunque el panel no muestre un botón de registro, una persona puede intentar usar directamente:

```javascript
supabase.auth.signUp(...)
```

Si Supabase permite nuevos registros, podría crear una cuenta.

El código actual considera administrador a cualquier usuario autenticado.

### Acción

Ruta aproximada:

```text
Supabase
→ Authentication
→ Providers
→ Email
→ Allow new users to sign up
→ OFF
```

### Checklist

- [ ] Confirmar si el registro público está habilitado.
- [ ] Desactivar “Allow new users to sign up”.
- [ ] Confirmar que solo administradores pueden crear usuarios.
- [ ] Probar que un visitante no pueda registrar una cuenta.
- [ ] Documentar cómo se crearán usuarios nuevos.
- [ ] Definir procedimiento para eliminar o bloquear usuarios.
- [ ] Definir procedimiento para restablecer contraseñas.
- [ ] Definir procedimiento para revocar sesiones.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

## 4.2 Revisar usuarios actuales

### Checklist

- [ ] Listar todos los usuarios de `Authentication → Users`.
- [ ] Confirmar nombre y propietario de cada cuenta.
- [ ] Eliminar cuentas de prueba innecesarias.
- [ ] Bloquear cuentas desconocidas.
- [ ] Verificar correos correctamente escritos.
- [ ] Confirmar que Daniel tenga una cuenta propia.
- [ ] Confirmar que Mildred tenga una cuenta propia.
- [ ] Evitar compartir una sola cuenta entre varias personas.
- [ ] Cambiar contraseñas temporales.
- [ ] Usar contraseñas únicas de al menos 12 caracteres.
- [ ] Revisar sesiones activas.
- [ ] Revocar sesiones antiguas o sospechosas.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

## 4.3 MFA para administradores

### Checklist

- [ ] Verificar si MFA está disponible y habilitado en el proyecto.
- [ ] Definir si será obligatorio para superadministradores.
- [ ] Activar MFA para Daniel.
- [ ] Activar MFA para Mildred.
- [ ] Guardar códigos de recuperación en un lugar seguro.
- [ ] Probar inicio de sesión con MFA.
- [ ] Probar recuperación de cuenta.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

## 4.4 Rate limits y fuerza bruta

### Checklist

- [ ] Revisar `Authentication → Rate Limits`.
- [ ] Confirmar límites de intentos de inicio de sesión.
- [ ] Confirmar límites de recuperación de contraseña.
- [ ] Evitar mensajes que revelen si un correo existe.
- [ ] Registrar intentos fallidos relevantes.
- [ ] Evaluar CAPTCHA si aumenta el riesgo.
- [ ] Probar varios intentos fallidos consecutivos.
- [ ] Confirmar que Supabase aplique limitación.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 5. Control de roles

## 5.1 Problema actual

El frontend trata como administrador a cualquier sesión válida:

```javascript
if (session) await loadProducts();
```

No se comprueba:

- rol;
- correo autorizado;
- perfil;
- lista blanca;
- permiso específico.

## 5.2 Roles requeridos

### Superadministrador

Permisos sugeridos:

- administrar usuarios;
- editar productos;
- editar precios;
- editar stock;
- editar configuración;
- subir y eliminar imágenes;
- ver costos;
- ver rentabilidad;
- cambiar roles.

### Editor o colaborador

Permisos sugeridos:

- crear y editar productos;
- editar descripción;
- editar imágenes;
- editar stock;
- según decisión, editar precios;
- no administrar usuarios;
- no cambiar roles;
- no ver configuraciones críticas.

### Solo lectura

Permisos sugeridos:

- ver productos;
- ver stock permitido;
- no modificar;
- no subir;
- no eliminar;
- no administrar usuarios.

## 5.3 Diseño recomendado

Crear una tabla similar a:

```sql
create table public.perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  rol text not null check (rol in ('superadmin', 'editor', 'lectura')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Checklist

- [ ] Definir roles definitivos.
- [ ] Definir permisos exactos por rol.
- [ ] Crear tabla `perfiles` o equivalente.
- [ ] Relacionar perfiles con `auth.users`.
- [ ] Agregar campo `activo`.
- [ ] Agregar validación de roles.
- [ ] Habilitar RLS en `perfiles`.
- [ ] Crear políticas para que cada usuario vea su perfil.
- [ ] Permitir que solo superadmin administre perfiles.
- [ ] Insertar perfil de Daniel.
- [ ] Insertar perfil de Mildred.
- [ ] Probar cuenta superadmin.
- [ ] Probar cuenta editor.
- [ ] Probar cuenta solo lectura.
- [ ] Probar cuenta autenticada sin perfil.
- [ ] Bloquear cuentas con `activo = false`.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 6. Row Level Security — RLS

## 6.1 Consulta de auditoría inicial

Ejecutar en Supabase SQL Editor una consulta de solo lectura para conocer el estado de RLS:

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname in ('public', 'storage')
order by schemaname, tablename;
```

Consultar políticas existentes:

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

Consultar grants:

```sql
select
  grantee,
  table_schema,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
order by table_schema, table_name, grantee, privilege_type;
```

### Checklist

- [ ] Ejecutar consulta de estado RLS.
- [ ] Guardar resultado.
- [ ] Ejecutar consulta de políticas.
- [ ] Guardar resultado.
- [ ] Ejecutar consulta de grants.
- [ ] Guardar resultado.
- [ ] Revisar que no existan políticas `true` demasiado abiertas.
- [ ] Revisar que `anon` no tenga permisos privados.
- [ ] Revisar que `authenticated` no tenga permisos excesivos.
- [ ] Revisar que cada operación tenga política explícita.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

## 6.2 Tabla `productos_publicos`

### Acceso esperado

Usuario anónimo:

- puede leer productos visibles;
- no puede insertar;
- no puede actualizar;
- no puede eliminar.

Editor o superadmin:

- puede leer;
- puede insertar;
- puede actualizar;
- puede eliminar según decisión.

Solo lectura:

- puede leer;
- no puede modificar.

### Checklist

- [ ] Confirmar que RLS esté habilitado.
- [ ] Revisar política `SELECT` para `anon`.
- [ ] Limitar lectura pública a productos activos o visibles.
- [ ] Revisar política `SELECT` para autenticados.
- [ ] Crear política `INSERT` para editor y superadmin.
- [ ] Crear política `UPDATE` para editor y superadmin.
- [ ] Crear política `DELETE` solo si realmente se necesita.
- [ ] Evitar políticas basadas únicamente en `authenticated`.
- [ ] Verificar `WITH CHECK`.
- [ ] Probar lectura anónima.
- [ ] Probar escritura anónima.
- [ ] Probar escritura con editor.
- [ ] Probar escritura con solo lectura.
- [ ] Probar eliminación con editor.
- [ ] Probar eliminación con superadmin.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

## 6.3 Tabla `inventario_privado`

### Datos sensibles

- stock;
- precio base;
- costo propio;
- factor de costo;
- multiplicadores;
- precio mayorista;
- precio minorista;
- ganancias;
- rentabilidad.

### Acceso esperado

Usuario anónimo:

- ningún acceso.

Solo lectura:

- acceso según decisión del negocio.

Editor:

- acceso a campos necesarios.

Superadmin:

- acceso completo.

### Checklist

- [ ] Confirmar que RLS esté habilitado.
- [ ] Bloquear totalmente a `anon`.
- [ ] Evitar política genérica para todo `authenticated`.
- [ ] Crear política de lectura por rol.
- [ ] Crear política de actualización por rol.
- [ ] Definir quién puede ver `precio_base`.
- [ ] Definir quién puede ver `factor_costo`.
- [ ] Definir quién puede ver ganancias.
- [ ] Definir quién puede modificar multiplicadores.
- [ ] Definir quién puede modificar stock.
- [ ] Definir quién puede modificar precios.
- [ ] Revisar `WITH CHECK`.
- [ ] Probar consulta anónima directa.
- [ ] Probar consulta con solo lectura.
- [ ] Probar actualización con solo lectura.
- [ ] Probar actualización con editor.
- [ ] Probar actualización con superadmin.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

## 6.4 Tabla `configuracion_publica`

### Acceso esperado

Usuario anónimo puede leer únicamente:

- nombre de empresa;
- logo;
- plantilla pública de WhatsApp;
- estado de mostrar precios;
- otras configuraciones estrictamente públicas.

No puede modificar.

Editor:

- permisos según decisión.

Superadmin:

- puede modificar.

### Checklist

- [ ] Confirmar que RLS esté habilitado.
- [ ] Revisar columnas realmente públicas.
- [ ] Separar configuración pública de configuración privada si fuera necesario.
- [ ] Permitir lectura pública solo de los campos necesarios.
- [ ] Bloquear inserción anónima.
- [ ] Bloquear actualización anónima.
- [ ] Bloquear eliminación anónima.
- [ ] Permitir actualización solo a roles autorizados.
- [ ] Probar lectura anónima.
- [ ] Probar actualización anónima.
- [ ] Probar actualización con editor.
- [ ] Probar actualización con superadmin.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 7. Supabase Storage

## 7.1 Bucket `productos`

### Acceso esperado

Usuario anónimo:

- puede ver imágenes públicas;
- no puede subir;
- no puede reemplazar;
- no puede eliminar;
- no puede listar archivos privados innecesariamente.

Editor:

- puede subir;
- puede actualizar;
- puede eliminar según permisos.

Superadmin:

- acceso completo.

### Checklist

- [ ] Confirmar si el bucket es público.
- [ ] Confirmar que solo contiene imágenes públicas.
- [ ] Revisar políticas de `storage.objects`.
- [ ] Restringir políticas a `bucket_id = 'productos'`.
- [ ] Crear política pública solo para lectura.
- [ ] Bloquear subida anónima.
- [ ] Bloquear actualización anónima.
- [ ] Bloquear eliminación anónima.
- [ ] Permitir subida por rol.
- [ ] Permitir actualización por rol.
- [ ] Permitir eliminación por rol.
- [ ] Evitar que cualquier autenticado borre cualquier archivo.
- [ ] Definir estructura de carpetas.
- [ ] Limitar tipos MIME.
- [ ] Limitar tamaño máximo.
- [ ] Evitar nombres de archivo peligrosos.
- [ ] Generar nombres únicos.
- [ ] Probar subida anónima.
- [ ] Probar eliminación anónima.
- [ ] Probar subida con editor.
- [ ] Probar eliminación con solo lectura.
- [ ] Probar eliminación de archivo ajeno o fuera de ruta.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 8. Ocultar precios correctamente

## 8.1 Problema actual

El catálogo ejecuta una consulta similar a:

```javascript
db.from('productos_publicos').select('*')
```

Luego decide visualmente si muestra o no el precio.

Aunque el precio no aparezca en pantalla, puede seguir llegando al navegador.

### Alternativas

- **Alternativa A:** vista pública sin precios.
- **Alternativa B:** dos vistas, una con precios y otra sin precios.
- **Alternativa C:** función RPC que decida qué devolver.
- **Alternativa D:** mantener precios únicamente en tabla privada.

### Checklist

- [ ] Decidir si “ocultar precios” debe ser solo visual o realmente confidencial.
- [ ] Listar columnas que necesita el catálogo público.
- [ ] Eliminar `select('*')` del catálogo público.
- [ ] Crear vista pública segura.
- [ ] Evitar enviar precios cuando `mostrar_precios = false`.
- [ ] Evitar enviar costos internos en cualquier caso.
- [ ] Actualizar `js/catalog.js`.
- [ ] Probar respuesta en Network.
- [ ] Probar consulta REST directa.
- [ ] Confirmar que el precio oculto no esté en el JSON.
- [ ] Confirmar que costos y ganancias nunca lleguen al navegador público.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 9. Protección del panel administrativo

## 9.1 Problema actual

La ruta `dmmpadmin` no es secreta ni constituye una protección.

El HTML administrativo puede abrirse sin sesión. Lo importante es que los datos y las acciones estén bloqueados por Supabase.

### Checklist

- [ ] Mantener redirección o pantalla de login cuando no existe sesión.
- [ ] No cargar datos administrativos antes de validar sesión.
- [ ] Consultar el perfil y rol después del login.
- [ ] Bloquear acceso si el usuario no tiene perfil.
- [ ] Bloquear acceso si `activo = false`.
- [ ] Ocultar funciones según rol.
- [ ] Aplicar las mismas restricciones en RLS.
- [ ] Mostrar mensaje claro de “sin permisos”.
- [ ] Evitar confiar solo en botones ocultos.
- [ ] Probar manipulación del atributo `hidden`.
- [ ] Probar llamadas directas desde consola.
- [ ] Probar acceso con token de usuario solo lectura.
- [ ] Probar acceso con usuario autenticado sin rol.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 10. Sesiones

### Checklist

- [ ] Confirmar dónde se almacena la sesión.
- [ ] Revisar comportamiento al cerrar navegador.
- [ ] Revisar comportamiento del botón “Salir”.
- [ ] Confirmar que `signOut()` se ejecute correctamente.
- [ ] Revocar tokens al cerrar sesión si corresponde.
- [ ] Probar sesión vencida.
- [ ] Probar refresh token.
- [ ] Mostrar sesión expirada de forma clara.
- [ ] Revocar sesiones de usuarios retirados.
- [ ] Documentar que no se use el panel en equipos públicos.
- [ ] Evaluar tiempo máximo de sesión.
- [ ] Evaluar MFA para reducir impacto de contraseña robada.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 11. Integridad de datos

## 11.1 Guardado en dos tablas

Actualmente se actualizan tablas en paralelo. Puede ocurrir que una operación tenga éxito y la otra falle.

### Recomendación

Crear una función PostgreSQL o RPC transaccional.

### Checklist

- [ ] Identificar todas las operaciones que modifican más de una tabla.
- [ ] Diseñar función transaccional.
- [ ] Validar permisos dentro de la función.
- [ ] Usar `security invoker` cuando corresponda.
- [ ] Evitar `security definer` sin controles estrictos.
- [ ] Actualizar frontend para llamar la RPC.
- [ ] Probar fallo intencional en una tabla.
- [ ] Confirmar rollback completo.
- [ ] Registrar errores de forma clara.
- [ ] Evitar duplicados.
- [ ] Revisar claves foráneas.
- [ ] Revisar restricciones `NOT NULL`.
- [ ] Revisar restricciones de precios y stock.
- [ ] Evitar valores negativos no permitidos.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 12. Validaciones de datos

### Checklist general

- [ ] Validar stock como entero no negativo.
- [ ] Validar precio base mayor o igual a cero.
- [ ] Validar multiplicadores.
- [ ] Validar factor de costo.
- [ ] Validar precio mayorista.
- [ ] Validar precio minorista.
- [ ] Evitar `NaN`.
- [ ] Evitar valores infinitos.
- [ ] Limitar longitud de nombres.
- [ ] Limitar longitud de descripciones.
- [ ] Limitar longitud de plantilla de WhatsApp.
- [ ] Validar URL del logo.
- [ ] Validar URL de imágenes.
- [ ] Validar tipos MIME.
- [ ] Validar tamaño de imágenes.
- [ ] Aplicar validaciones también en base de datos.
- [ ] Crear restricciones `CHECK`.
- [ ] Probar valores negativos.
- [ ] Probar textos extremadamente largos.
- [ ] Probar caracteres especiales.
- [ ] Probar datos nulos.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 13. XSS e inyección de contenido

## Evaluación inicial

No se encontró un XSS evidente. El código usa funciones de escape y `textContent` en varios puntos.

### Checklist

- [x] Revisar uso de `textContent`.
- [x] Revisar funciones de escape existentes.
- [ ] Buscar todos los usos de `innerHTML`.
- [ ] Revisar todos los datos insertados con plantillas HTML.
- [ ] Evitar insertar descripción sin escapar.
- [ ] Evitar insertar nombre sin escapar.
- [ ] Evitar insertar plantilla de WhatsApp como HTML.
- [ ] Validar URLs antes de usarlas en `src` o `href`.
- [ ] Bloquear esquemas peligrosos como `javascript:`.
- [ ] Probar payloads XSS en nombre.
- [ ] Probar payloads XSS en descripción.
- [ ] Probar payloads XSS en plantilla WhatsApp.
- [ ] Probar payloads XSS en URL de logo.
- [ ] Probar payloads XSS en campos de imágenes.

### Payload de prueba inofensivo

```html
<img src=x onerror=alert('XSS')>
```

Solo debe utilizarse en entorno de prueba.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 14. Dependencias externas

## 14.1 Supabase JS desde CDN

Actualmente se usa una ruta similar a:

```text
https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm
```

### Checklist

- [ ] Identificar versión actual estable utilizada.
- [ ] Fijar versión exacta.
- [ ] Probar login.
- [ ] Probar lectura pública.
- [ ] Probar CRUD administrativo.
- [ ] Probar Storage.
- [ ] Documentar versión.
- [ ] Crear procedimiento de actualización.
- [ ] Revisar changelog antes de actualizar.
- [ ] Evaluar uso de npm y build local en el futuro.
- [ ] Evaluar Subresource Integrity cuando sea compatible.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 15. Cabeceras y política CSP

## Cabeceras recomendadas

```text
Content-Security-Policy
Referrer-Policy
X-Content-Type-Options
Permissions-Policy
Strict-Transport-Security
```

### Checklist

- [ ] Confirmar alojamiento actual.
- [ ] Confirmar si GitHub Pages permite las cabeceras necesarias.
- [ ] Evaluar Cloudflare delante de GitHub Pages.
- [ ] Diseñar CSP.
- [ ] Permitir solo orígenes necesarios.
- [ ] Incluir Supabase.
- [ ] Incluir jsDelivr.
- [ ] Incluir Google Fonts.
- [ ] Incluir imágenes autorizadas.
- [ ] Incluir WhatsApp en navegación.
- [ ] Probar CSP en modo `Report-Only`.
- [ ] Corregir bloqueos legítimos.
- [ ] Activar CSP definitiva.
- [ ] Configurar `X-Content-Type-Options: nosniff`.
- [ ] Configurar `Referrer-Policy`.
- [ ] Configurar `Permissions-Policy`.
- [ ] Confirmar HTTPS.
- [ ] Confirmar HSTS si aplica.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 16. Consultas mínimas

### Checklist

- [ ] Buscar todos los `select('*')`.
- [ ] Listar columnas utilizadas realmente.
- [ ] Reemplazar consultas públicas.
- [ ] Reemplazar consultas administrativas cuando sea razonable.
- [ ] Evitar descargar datos financieros innecesarios.
- [ ] Evitar descargar metadatos internos.
- [ ] Medir respuesta antes y después.
- [ ] Confirmar que el catálogo siga funcionando.
- [ ] Confirmar que el panel siga funcionando.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 17. Logs y auditoría

### Objetivo

Poder saber quién cambió un producto, qué cambió, cuándo y desde qué rol.

### Checklist

- [ ] Crear tabla de auditoría.
- [ ] Registrar `user_id`.
- [ ] Registrar fecha y hora.
- [ ] Registrar tabla afectada.
- [ ] Registrar ID del registro.
- [ ] Registrar acción.
- [ ] Registrar valores anteriores.
- [ ] Registrar valores nuevos.
- [ ] Proteger tabla de auditoría con RLS.
- [ ] Evitar que editores borren logs.
- [ ] Permitir lectura solo a superadmin.
- [ ] Definir tiempo de conservación.
- [ ] Probar cambio de precio.
- [ ] Probar cambio de stock.
- [ ] Probar eliminación.
- [ ] Confirmar que se registre al responsable.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 18. Backups y recuperación

### Checklist

- [ ] Confirmar política de backups de Supabase.
- [ ] Confirmar plan actual.
- [ ] Exportar esquema SQL.
- [ ] Exportar datos críticos.
- [ ] Guardar copia fuera de Supabase.
- [ ] Definir frecuencia de respaldo.
- [ ] Definir responsable.
- [ ] Probar restauración.
- [ ] Documentar procedimiento.
- [ ] Respaldar bucket de imágenes.
- [ ] Guardar copia del repositorio.
- [ ] Crear tags o releases estables en GitHub.
- [ ] Confirmar que una eliminación accidental sea recuperable.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 19. Seguridad del repositorio GitHub

### Checklist

- [ ] Confirmar si el repositorio es público o privado.
- [ ] Revisar colaboradores.
- [ ] Eliminar colaboradores innecesarios.
- [ ] Activar MFA en GitHub.
- [ ] Proteger rama principal.
- [ ] Requerir pull request para cambios críticos.
- [ ] Evitar force push.
- [ ] Activar Dependabot.
- [ ] Activar secret scanning.
- [ ] Revisar historial de commits.
- [ ] Revisar archivos eliminados.
- [ ] Revisar GitHub Actions.
- [ ] Evitar secretos en variables del repositorio público.
- [ ] Crear `.gitignore`.
- [ ] Excluir `.env`.
- [ ] Excluir respaldos.
- [ ] Excluir archivos SQL con secretos.
- [ ] Crear release de versión segura.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 20. Pruebas de seguridad

## 20.1 Matriz de usuarios

| Perfil | Sesión | Resultado esperado |
|---|---:|---|
| Visitante | No | Solo catálogo público |
| Usuario registrado sin perfil | Sí | Acceso denegado |
| Usuario inactivo | Sí | Acceso denegado |
| Solo lectura | Sí | Ver, no modificar |
| Editor | Sí | Modificar según permisos |
| Superadmin | Sí | Administración completa |

## 20.2 Pruebas anónimas

- [ ] Leer productos públicos.
- [ ] Leer inventario privado.
- [ ] Leer configuración.
- [ ] Modificar producto.
- [ ] Modificar stock.
- [ ] Modificar precios.
- [ ] Subir imagen.
- [ ] Eliminar imagen.
- [ ] Crear usuario.
- [ ] Abrir panel administrativo.

## 20.3 Pruebas autenticadas

- [ ] Usuario sin perfil.
- [ ] Usuario inactivo.
- [ ] Solo lectura intentando actualizar.
- [ ] Editor intentando administrar usuarios.
- [ ] Editor intentando cambiar rol.
- [ ] Editor intentando borrar imagen no permitida.
- [ ] Superadmin realizando todas las operaciones.

## 20.4 Herramientas de prueba

- Navegador y DevTools.
- Consola JavaScript.
- Network.
- Supabase SQL Editor.
- Postman o Insomnia.
- `curl`.
- Cuenta de prueba por rol.

### Registro de resolución

- Fecha y hora:
- Responsable:
- Descripción:
- Evidencia:
- Prueba:
- Resultado:

---

# 21. Orden recomendado de implementación

## Fase 1 — Contención inmediata

- [ ] Desactivar registro público.
- [ ] Revisar usuarios actuales.
- [ ] Cambiar contraseñas débiles.
- [ ] Confirmar ausencia de llaves privadas.
- [ ] Revisar RLS.
- [ ] Revisar Storage.
- [ ] Bloquear cualquier escritura anónima.

## Fase 2 — Autorización

- [ ] Crear tabla de perfiles.
- [ ] Definir roles.
- [ ] Crear políticas por rol.
- [ ] Modificar frontend para consultar rol.
- [ ] Bloquear usuarios sin perfil.
- [ ] Probar cada rol.

## Fase 3 — Privacidad de datos

- [ ] Corregir ocultamiento real de precios.
- [ ] Separar datos públicos y privados.
- [ ] Eliminar `select('*')`.
- [ ] Confirmar que costos no lleguen al catálogo.

## Fase 4 — Integridad y Storage

- [ ] Crear guardado transaccional.
- [ ] Revisar políticas del bucket.
- [ ] Limitar MIME y tamaño.
- [ ] Probar eliminación y subida.

## Fase 5 — Endurecimiento

- [ ] Fijar versión Supabase JS.
- [ ] Evaluar CSP.
- [ ] Agregar cabeceras.
- [ ] Añadir logs.
- [ ] Revisar GitHub.
- [ ] Definir backups.
- [ ] Ejecutar pruebas completas.

---

# 22. Registro cronológico de cambios

## 27/07/2026 21:40 — Creación del checklist

- **Responsable:** ChatGPT / Daniel
- **Estado:** Completado
- **Descripción:** Se creó este documento a partir de la auditoría estática inicial del código.
- **Archivos revisados:** HTML, JavaScript, CSS y README incluidos en el ZIP.
- **Resultado:** Se organizó el trabajo en fases y tareas verificables.
- **Pendiente principal:** Revisar configuración real de Supabase, especialmente RLS, Auth y Storage.

---

## Plantilla para nueva entrada

```md
## DD/MM/AAAA HH:mm — Título de la tarea

- **Responsable:**
- **Estado:** Pendiente / En proceso / Resuelto / Bloqueado
- **Descripción:**
- **Cambios realizados:**
- **Archivos modificados:**
- **SQL ejecutado:**
- **Pruebas realizadas:**
- **Resultado:**
- **Pendientes:**
- **Commit o evidencia:**
```

---

# 23. Decisiones pendientes del negocio

- [ ] ¿El editor puede ver precio base?
- [ ] ¿El editor puede ver la ganancia del proveedor?
- [ ] ¿El editor puede ver rentabilidad?
- [ ] ¿El editor puede modificar precio base?
- [ ] ¿El editor puede modificar multiplicadores?
- [ ] ¿El editor puede eliminar productos?
- [ ] ¿El editor puede eliminar imágenes?
- [ ] ¿Solo lectura puede ver stock?
- [ ] ¿Solo lectura puede ver precios internos?
- [ ] ¿Mildred será superadmin o editora?
- [ ] ¿Los precios ocultos deben ser realmente confidenciales?
- [ ] ¿Los productos se eliminan o solo se desactivan?
- [ ] ¿Se necesita conservar historial de cambios?
- [ ] ¿Cuánto tiempo deben conservarse los logs?

---

# 24. Criterios para considerar el sistema seguro

- [ ] Ningún usuario anónimo puede modificar datos.
- [ ] Ningún usuario anónimo puede leer `inventario_privado`.
- [ ] Ningún usuario anónimo puede subir o borrar imágenes.
- [ ] El registro público está desactivado.
- [ ] Cada usuario tiene un rol.
- [ ] Un usuario sin rol no puede entrar.
- [ ] Solo los roles autorizados pueden modificar.
- [ ] Las políticas se aplican en Supabase, no solo en la interfaz.
- [ ] Los precios ocultos no llegan al navegador cuando deben ser confidenciales.
- [ ] No existe ninguna llave privada en el repositorio.
- [ ] Las sesiones pueden revocarse.
- [ ] Existe respaldo.
- [ ] Existe registro de cambios críticos.
- [ ] Se probaron los escenarios anónimo, lectura, editor y superadmin.
- [ ] El resultado de las pruebas quedó documentado.

---

# 25. Próximo paso

El siguiente paso recomendado es ejecutar en Supabase las consultas de auditoría de solo lectura de la sección **6.1**, copiar los resultados y agregarlos a este documento.

No realizar cambios masivos ni crear políticas nuevas hasta revisar primero:

1. estado de RLS;
2. políticas existentes;
3. grants;
4. usuarios actuales;
5. configuración de registro;
6. políticas de Storage.


---

# 16. Registro de auditoría y decisiones — 28/07/2026

## 28/07/2026 — Verificación de Supabase y Storage

- [x] RLS habilitado en `administradores`, `configuracion_publica`, `inventario_privado` y `productos_publicos`.
- [x] Lectura pública limitada a catálogo y configuración pública.
- [x] Escritura de catálogo, inventario y configuración condicionada por `es_administrador()`.
- [x] Función `public.es_administrador()` revisada: usa `auth.uid()`, `SECURITY DEFINER`, propietario `postgres` y `search_path=public`.
- [x] Los roles `anon`, `authenticated` y `PUBLIC` no pueden crear objetos en el esquema `public`.
- [x] Bucket `productos` público solo para visualización por URL.
- [x] Subida, actualización y eliminación de fotografías limitada a administradores.
- [x] Bucket limitado a 5 MB y a JPEG, PNG y WebP.
- [x] Confirmados dos administradores legítimos: Daniel y Mildred.
- [x] Confirmado que la llave `sb_publishable_` visible en GitHub no es una credencial administrativa.

### Conclusión

El backend no depende de ocultar el código fuente. Las políticas RLS y de Storage son la barrera real. GitHub Pages publica inevitablemente HTML, CSS y JavaScript; un visitante puede ver la estructura del panel, pero no obtiene datos privados ni permisos de escritura por quitar el atributo `hidden`.

## 28/07/2026 — Decisión sobre ocultar costos

- [-] No se tratará el botón “ocultar costo” como una medida de seguridad.
- Motivo: su finalidad es evitar que un cliente situado junto al administrador vea el costo en pantalla.
- La información seguirá disponible únicamente para usuarios autorizados por RLS.

## 28/07/2026 — Nuevo modelo de roles acordado

- [~] **Administrador**: Daniel y Mildred. Acceso total, incluida la administración de usuarios y roles.
- [~] **Editor**: pensado para el cuñado. Puede consultar y modificar productos, precios, stock, fotografías, catálogo y mensaje de WhatsApp; no puede administrar usuarios ni cambiar roles.
- [~] **Solo lectura**: pensado para un ayudante. Puede consultar productos, inventario y rentabilidad, pero no puede guardar, subir, eliminar ni modificar información.

### Cambios pendientes

- [ ] Agregar columna `rol` a `public.administradores`.
- [ ] Restringir los valores a `administrador`, `editor` y `lectura`.
- [ ] Reemplazar `es_administrador()` por comprobaciones de rol compatibles con RLS.
- [ ] Crear políticas diferenciadas para lectura y escritura.
- [ ] Corregir `showSession()` para comprobar autorización antes de mostrar `#admin-view`.
- [ ] Cerrar la sesión automáticamente si la cuenta autenticada no tiene registro autorizado.
- [ ] Mostrar el nombre y rol del usuario conectado.
- [ ] Añadir sección “Usuarios” visible solo para administradores.
- [ ] Permitir asignar o retirar acceso a usuarios ya creados en Supabase Auth.
- [ ] Deshabilitar todos los controles de edición para el rol `lectura`.
- [ ] Ocultar acciones de usuarios para el rol `editor`.
- [ ] Probar cada rol con una cuenta independiente.

### Nota de arquitectura

Una página estática no puede guardar una clave `service_role` ni crear usuarios de Supabase Auth de forma segura desde el navegador. En la primera versión, el administrador creará o invitará la cuenta desde Supabase Authentication y luego le asignará un rol desde el panel. Una invitación completamente integrada requerirá una Supabase Edge Function que conserve la clave privada fuera de GitHub Pages.

## 28/07/2026 15:48 — Roles y carga segura del panel

**Responsable:** Daniel / ChatGPT  
**Estado:** Implementado en código; pendiente publicación y pruebas en GitHub Pages  

### Cambios realizados

- Se añadieron los roles `administrador`, `editor` y `solo_lectura` en Supabase.
- Las dos cuentas existentes quedaron confirmadas como `administrador`.
- Se actualizaron las políticas RLS para separar lectura, edición y administración.
- El HTML inicial de `/dmmpadmin/` ya no contiene la estructura del panel administrativo.
- El panel se inyecta en el DOM únicamente después de validar sesión y rol contra `public.administradores`.
- El código del panel se carga dinámicamente después de autorizar al usuario.
- El rol `solo_lectura` recibe campos deshabilitados y no muestra acciones de guardado ni eliminación.
- Las secciones de configuración del catálogo y plantilla de WhatsApp se muestran únicamente al rol `administrador`.
- Se añadió una insignia con el nombre y rol del usuario conectado.

### Archivos modificados

- `dmmpadmin/index.html`
- `js/admin-auth.js` (nuevo)
- `js/admin-template.js` (nuevo)
- `js/admin-panel.js` (renombrado desde `admin.js` y adaptado)
- `css/styles.css`

### Seguridad

La ocultación del panel es una mejora de exposición y experiencia de usuario. La autorización real continúa dependiendo de Supabase Auth, RLS y las funciones `es_administrador()`, `puede_editar()` y `puede_ver_panel()`.

### Pruebas pendientes

- [ ] Administrador puede entrar y editar todo.
- [ ] Editor puede editar productos, inventario y fotografías.
- [ ] Editor no puede modificar configuración general ni roles.
- [ ] Solo lectura puede consultar, pero no guardar ni eliminar.
- [ ] Usuario autenticado sin fila en `administradores` recibe acceso denegado.
- [ ] Usuario anónimo no puede consultar inventario privado.
- [ ] Cerrar sesión limpia el panel y vuelve al login.


---

# Actualización 28/07/2026 — v0.7.0

- [x] Cliente único de Supabase mediante `js/supabase-client.js`.
- [x] Validación de roles antes de inyectar el panel administrativo.
- [x] Tablas de ventas, detalle, movimientos y liquidaciones con RLS habilitado.
- [x] Escrituras de ventas y liquidaciones protegidas mediante funciones `SECURITY DEFINER` con validación de rol.
- [x] No se permite eliminar ventas desde el flujo normal; se utiliza anulación.
- [x] Dashboard consulta únicamente información permitida por RLS y funciones autorizadas.
- [ ] Confirmar que el registro público de Supabase Auth esté desactivado.
- [ ] Revisar historial completo del repositorio en busca de secretos antiguos.
- [ ] Fijar versión exacta de Supabase JS.
- [ ] Configurar CSP y cabeceras de seguridad cuando el alojamiento lo permita.
