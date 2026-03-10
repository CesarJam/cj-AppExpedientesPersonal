# 📂  CJ Expediente de Personal - Recursos Humanos

Sistema de gestión web diseñado para digitalizar y organizar los expedientes del personal. Permite a los administradores mantener un control preciso de la documentación requerida para nuevo ingreso y gestionar el estatus de los empleados.

## ✨ Características Principales

* **🔒 Autenticación Segura:** Acceso restringido por lista blanca mediante Google Auth.
* **🗂️ Directorio Dinámico:** Búsqueda en tiempo real multifiltro (Nombre, RFC, Adscripción).
* **📄 Gestión Documental:** Subida de archivos PDF categorizados a la nube (Supabase Storage).
* **👁️ Visor Integrado:** Lectura de documentos PDF directamente en la aplicación sin abrir nuevas pestañas.
* **🖼️ Perfiles Visuales:** Soporte para fotografías de perfil de los empleados.
* **📊 Exportación de Datos:** Descarga del directorio actual en formato Excel (CSV).
* **🌙 Interfaz Moderna:** Diseño responsivo con Modo Oscuro nativo usando Tailwind CSS.

## 🛠️ Tecnologías Utilizadas
* **Frontend:** Vue 3, Vite, Tailwind CSS.
* **Backend & Base de Datos:** Supabase (PostgreSQL, Auth, Storage).
* **Despliegue:** Netlify.