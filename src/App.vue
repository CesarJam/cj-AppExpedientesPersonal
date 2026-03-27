<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './lib/supabase'
import { useRouter, useRoute } from 'vue-router'


// Inicializamos el Router
const router = useRouter()
const route = useRoute()

// Variables de estado global
const session = ref(null)
const esAdmin = ref(false)
const cargandoVerificacion = ref(true)

// Variable para el Modo Oscuro
const isDark = ref(false)


// Función que consulta a la base de datos
const verificarPermisos = async (email) => {
  if (!email) return

  const { data, error } = await supabase
    .from('admins')
    .select('email')
    .eq('email', email)
    .single()

  if (data && !error) {
    esAdmin.value = true
    // Si acaba de iniciar sesión y estaba en /login, lo mandamos al inicio
    if (route.path === '/login') router.push('/')
  } else {
    esAdmin.value = false
    router.push('/no-autorizado')
  }
  cargandoVerificacion.value = false
}

onMounted(() => {
  // Manejo del tema oscuro
  if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }

  // Verificación de sesión inicial
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
    if (data.session) {
      verificarPermisos(data.session.user.email)
    } else {
      cargandoVerificacion.value = false
      router.push('/login')
    }
  })

  // Listener de cambios de sesión
  supabase.auth.onAuthStateChange((_event, _session) => {
    session.value = _session
    if (_session) {
      // LA MAGIA: Solo verificamos permisos y mostramos la pantalla de carga 
      // si aún NO hemos confirmado que es Admin en esta sesión activa.
      // Si ya está dentro, el refresco del token ocurre en silencio sin borrar la vista.
      if (!esAdmin.value) {
        cargandoVerificacion.value = true
        verificarPermisos(_session.user.email)
      }
    } else {
      esAdmin.value = false
      cargandoVerificacion.value = false
      router.push('/login')
    }
  })
})

const cerrarSesion = async () => {
  await supabase.auth.signOut()
}


// Función que se ejecuta al darle clic al botón del sol/luna
const toggleTema = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

const toggleVista = () => {
  if (route.path === '/dashboard') {
    router.push('/')
  } else {
    router.push('/dashboard')
  }
}

</script>

<template>
  <!-- Pantalla de carga -->
  <div v-if="cargandoVerificacion" class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
    <p class="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Verificando acceso...</p>
  </div>

  <!-- Si no hay sesión o no es admin, mostramos la vista sin Navbar (Login o NoAutorizado) -->
  <RouterView v-else-if="!session || !esAdmin" :email="session?.user?.email" />

  <!-- Interfaz principal con Navbar (Solo se muestra si hay sesión y es Admin) -->
  <div v-else class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
    <nav
      class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm sticky top-0 z-10 transition-colors duration-300 gap-3">
      
      <div class="flex items-center justify-between w-full sm:w-auto gap-4">
        <div class="flex items-center gap-3">
          <!-- OJO: Si moviste imágenes, revisa la ruta de este logo -->
          <img src="/src/images/logo.png" alt="Logo" class="h-10 sm:h-14 w-auto object-contain drop-shadow-sm dark:brightness-110 transition-all" />

          <div class="flex flex-col">
            <span class="text-xs sm:text-lg font-bold text-blue-600 dark:text-blue-400 tracking-tight leading-none">
              Consejería Jurídica
              <span class="hidden sm:inline"> - Expedientes</span>
            </span>
            <span class="text-[9px] sm:text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 mt-1 rounded border border-blue-100 dark:border-blue-800 font-mono w-fit truncate max-w-[150px] sm:max-w-none">
              {{ session.user.email }}
            </span>
          </div>
        </div>

        <button @click="toggleTema" class="sm:hidden p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm shrink-0" title="Cambiar tema">
          <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </button>
      </div>

      <div class="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 border-t border-gray-100 dark:border-gray-700 pt-2 sm:border-0 sm:pt-0">
        
        <button @click="toggleTema" class="hidden sm:block p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm mr-2" title="Cambiar tema">
          <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </button>

        <!-- Botón de navegación Dinámico -->
        <button @click="toggleVista"
          class="flex items-center justify-center flex-1 sm:flex-none gap-2 text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 sm:py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <span>{{ route.path === '/dashboard' ? 'Ver Directorio' : 'Métricas' }}</span>
        </button>

        <button @click="cerrarSesion" title="Cerrar Sesión"
          class="flex items-center justify-center gap-2 shrink-0 sm:flex-none text-red-500 hover:text-red-700 font-bold transition hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 sm:py-1.5 rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50  dark:bg-red-900/20 ">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="hidden sm:inline text-xs md:text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </nav>

    <!-- AQUÍ SE INYECTAN LAS VISTAS (Directorio, Dashboard, Expediente) -->
    <main class="animate-fade-in">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>