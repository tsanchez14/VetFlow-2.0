# VetFlow 2.0 - Guía de Deploy en Render

Esta guía te ayudará a subir tu proyecto VetFlow 2.0 a Render.com configurándolo como un sitio estático usando *Vite*.

## 1. Requisitos Previos
1. Un repositorio en GitHub, GitLab o Bitbucket con el código subido de VetFlow 2.0.
2. Asegurate de que el archivo `.env` NO esté subido al repositorio (por defecto ya fue añadido a `.gitignore`).
3. Crear una cuenta gratuita en [Render](https://render.com/).

## 2. Configuración del Repositorio
Asegurate de que estos dos archivos (ya creados en este proyecto) estén en la rama principal (main) de tu código:
- `vite.config.js`: Define todas las páginas que Vite debe compilar dentro de `/pages/`, el `admin/index.html` y el `index.html`.
- `render.yaml`: (Blueprint) Es un archivo declarativo de Render que le indica los pasos exactos a seguir para automatizar el deploy.

## 3. Despliegue Paso a Paso (Vía Blueprint - Recomendado)
Debido a que el proyecto cuenta con un archivo `render.yaml`, la forma más sencilla es usar Render Blueprints:

1. Ingresa a la consola tu cuenta de Render.
2. Hacé clic en el botón superior derecho **"New"** y seleccioná **"Blueprint"**.
3. Conecta tu cuenta (GitHub/GitLab) y seleccioná el repositorio de `VetFlow-2.0`.
4. Render leerá automáticamente el archivo `render.yaml` y sabrá qué debe ejecutar.
5. Haz click en **"Apply"** y se comenzará a instalar la aplicación web estática bajo el nombre `vetflow-static` y a compilar todo en la carpeta `dist`.

*Alternative (Manual):* Si preferís, podés hacerlo manualmente seleccionando "New" > "Static Site", conectando tu repo y colocando:
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

## 4. Configuración de Variables de Entorno (Secreto / Credenciales)
Dado que VetFlow es una Single Page Application, necesita conectarse con Supabase; estas llaves **NO DEBEN** estar en el código fuente. 

Deberás colocarlas directo desde el panel de Render:
1. Andá al Dashboard de Render y seleccioná tu proyecto `vetflow-static`.
2. En el menú lateral izquierdo, seleccioná la pestaña **"Environment"**.
3. Hacé clic en **"Add Environment Variable"** y añade exactamente estas variables con sus respectivos valores sacados de tu cuenta de Supabase:
   - `VITE_SUPABASE_URL` = (Tu URL de Supabase)
   - `VITE_SUPABASE_ANON_KEY` = (Tu Public Anon Key)
   - `VITE_SUPABASE_SERVICE_ROLE_KEY` = (Tu Service Role Secret Key)
4. Hacé clic en **"Save Changes"**.
5. Render podría iniciar un nuevo 'Deploy' de manera automática para inyectar estos códigos. De no ser así, selecciona **"Manual Deploy" > "Clear build cache & deploy"**.

## 5. ¡A Disfrutar!
Podrás ingresar a tu panel mediante la URL entregada por `.onrender.com`. El sistema funcionará perfectamente en producción, los tiempos de carga estarán optimizados y el proyecto encriptado.
