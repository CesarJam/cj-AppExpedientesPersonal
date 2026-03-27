# 🗂️ Sistema de Gestión de Expedientes V2 - Consejería Jurídica

Plataforma web integral para la administración del directorio de personal y la gestión digital de expedientes de Recursos Humanos. Desarrollada con enfoque **Mobile-First**, validaciones estrictas de captura y capacidades de Aplicación Web Progresiva (PWA).

## ✨ Novedades de la Versión 2 (PWA)
* **Instalable (PWA):** El sistema ahora se puede instalar como una aplicación nativa en Windows, macOS, Android e iOS, ofreciendo una experiencia a pantalla completa sin los controles del navegador.
* **Sesiones Ininterrumpidas:** Renovación del ciclo de vida de autenticación de Supabase. Los refrescos de token ocurren en segundo plano sin borrar los formularios o recargar la vista del usuario.
* **Visor de Documentos Nativo:** Lector integrado para archivos PDF, JPG y PNG con atajos de teclado (tecla `ESC` para cerrar).

## 🚀 Características Principales

### 📊 Dashboard Gerencial
* Panel de métricas en tiempo real.
* Conteo general de empleados y desglose por tipo de contratación (S.U.N., B.A.S., C.O.N.).
* Auditoría del estado de los expedientes (completos, incompletos y vacíos).
* Reporte rápido de personal comisionado.

### 👥 Directorio y Búsqueda Avanzada
* Buscador en tiempo real por Nombre, RFC o Área.
* Filtros acumulativos por Puesto y Estatus de Comisión (Todo el personal / Solo Comisionados / No Comisionados).
* Exportación instantánea del directorio filtrado a Excel (formato CSV compatible con caracteres en español).
* Etiquetas visuales para identificar rápidamente al personal comisionado.

### 🔒 Formularios y Validación de Datos (Nivel Empresarial)
* **RFC:** Forzado a mayúsculas, sin espacios accidentales y límite de 13 caracteres.
* **Número de Empleado y Contacto de Emergencia:** Bloqueo de caracteres alfabéticos (acepta estrictamente solo dígitos).
* **Adscripciones Estandarizadas:** Uso de listas desplegables para evitar errores tipográficos en áreas oficiales (JEFATURA, DELEGACIÓN, SAPJPE, SAPJPE(ACAPULCO), SAPJE, UNIDAD DE GÉNERO).
* **Gestión de Comisiones:** Checkbox inteligente que despliega opciones secundarias (Comisionado Interno/Externo) y campo de observaciones de ancho completo.

### 📁 Gestión de Expedientes y Storage
* Almacenamiento seguro en **Supabase Storage**.
* Normalización automática del nombre de los archivos al subirlos (eliminación de acentos, tildes y caracteres especiales) para evitar errores "Bad Request".
* Interfaz de Checklist de requisitos que calcula dinámicamente el progreso (0% - 100%) del expediente.
* Soporte para múltiples formatos: `.pdf`, `.png`, `.jpg`, `.jpeg`.

### 🎨 Diseño y Experiencia de Usuario (UX/UI)
* **100% Responsivo:** Navbar y sistema de grill que se adaptan dinámicamente desde pantallas ultra anchas hasta teléfonos móviles.
* **Modo Oscuro/Claro:** Integrado al sistema con persistencia en el navegador (`localStorage`).
* **Navegación Fluida:** Atajos de teclado (`ESC`) para cerrar modales, auto-scroll al inicio al cambiar de vistas y barras de desplazamiento (scroll) independientes para modales largos.

## 🛠️ Stack Tecnológico

* **Frontend:** Vue 3 (Composition API) + Vite
* **Estilos:** Tailwind CSS v3
* **Backend as a Service:** Supabase (PostgreSQL, Auth, Storage)
* **PWA:** vite-plugin-pwa
* **Enrutamiento:** Vue Router

## ⚙️ Instalación y Desarrollo Local

1. Clonar el repositorio:
    ```
    git clone https://github.com/CesarJam/cj-AppExpedientesPersonal
    ```

2. Instalar dependencias:
    ```
    npm install
    ```

3. Configurar variables de entorno:
    Crear un archivo .env en la raíz con las credenciales de Supabase:

    ```
    VITE_SUPABASE_URL=tu_url_de_supabase
    VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
    ```
4. Levantar el servidor de desarrollo: 
    ```
    npm run dev
    ```
### 🏗️ Despliegue (Producción)
* Este proyecto está optimizado para su despliegue continuo (CI/CD) a través de Netlify.
    ```
    npm run build
    ```