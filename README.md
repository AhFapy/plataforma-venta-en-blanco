# Plataforma Venta en Blanco

Next.js 15 + Supabase + Vercel. Estética del brandbook de Trud Sales.

Incluye: acceso por código al email (sin contraseñas, solo alumnos dados de alta), bienvenida con perfil (3 objetivos, 3 puntos a mejorar, situación, horas), inicio con ruta de 6 meses y siguiente lección, cursos con módulos que se desbloquean por progreso o por días desde el alta, comunidad por canales (posts, comentarios, likes, fijar), directos con enlace y grabación, ranking mensual/histórico/por promoción con niveles, directorio de miembros, y panel de admin (alumnos en riesgo, altas, contenido, directos, asistencia, puntos manuales). Alta automática desde GHL por webhook.

## Puesta en marcha (en este orden)

1. **Supabase**: proyecto nuevo (no el del panel). SQL Editor → pegar y ejecutar `supabase/migrations/0001_init.sql`.
2. **Email (obligatorio antes de abrir)**
   - Authentication → SMTP: conectar Resend (o Postmark) con un remitente de trudsales.com. Sin esto Supabase solo manda unos pocos emails por hora y el día del lanzamiento nadie podrá entrar.
   - Authentication → Rate Limits: subir el límite de emails a 300/h.
   - Authentication → Email Templates → Magic Link: asunto `Tu código de acceso: {{ .Token }}` y cuerpo `supabase/email-codigo.html`.
   - Authentication → URL Configuration: Site URL = el dominio final; añadir `https://DOMINIO/auth/callback` a Redirect URLs.
   - Authentication → Providers → Email: desactivar "Allow new users to sign up".
3. **Vercel**: importar el repo, variables de `.env.example` (las de Supabase en Settings → API). `WEBHOOK_SECRET`: cualquier cadena larga aleatoria.
4. **Alumnos**: exportar contactos de la comunidad de GHL a CSV y ejecutar
   `node --env-file=.env.local scripts/importar-alumnos.mjs alumnos.csv --admin=javiermarco@trudsales.com,EMAIL_AHMED`
   Reconoce columnas email, nombre (o first_name/last_name), telefono, promocion y fecha_alta (DD/MM/AAAA). Se puede repetir sin duplicar.
5. **Alta automática**: en GHL, workflow al cerrar venta → Webhook POST a `https://DOMINIO/api/webhooks/alta`, header `x-webhook-secret`, body `{"email":"{{contact.email}}","first_name":"{{contact.first_name}}","last_name":"{{contact.last_name}}","phone":"{{contact.phone}}"}`. El mismo workflow manda el WhatsApp/email de bienvenida con el enlace.
6. **Vídeos**: subirlos a Bunny Stream (biblioteca privada, bloqueo por dominio) y pegar la URL de embed en cada lección desde Admin → Contenido. También acepta Vimeo, YouTube oculto, Loom o .mp4.
7. **Dominio**: p. ej. `alumnos.trudsales.com` apuntando a Vercel.

## Puntos

Resultado en el canal Resultados +50 · asistencia a directo +15 (la marca el equipo) · lección +10 · publicación +3 · comentario +1. Si se borra el post/comentario/asistencia, se retiran. El equipo puede sumar o restar puntos a mano (Admin → Alumnos → ⋯).

## Seguridad

Todo el control de acceso está en la base de datos (RLS), no solo en la interfaz: un alumno no puede leer datos privados de otros (email, teléfono, objetivos), ni ver el vídeo de un módulo bloqueado, ni marcar lecciones bloqueadas, ni darse puntos, ni cambiarse el rol. Alumno desactivado = sin acceso a nada.

## Fase 2 (no incluido)

Tracker de 3.000 €, tareas/entregables con corrección, quizzes y certificado, bolsa de trabajo con acceso de empresas, asistente IA y role-play, reserva de llamadas 1-1, Trustpilot automático, afiliados, notificaciones push, entradas del evento.
