<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './supabase'
import Directorio from './components/Directorio.vue'
import Login from './components/Login.vue'
import Expediente from './components/Expediente.vue'
import NoAutorizado from './components/NoAutorizado.vue'
import Dashboard from './components/Dashboard.vue'

const session = ref(null)
const esAdmin = ref(false)
const empleadoActivo = ref(null)
const cargandoVerificacion = ref(true)
const mostrarDashboard = ref(false)

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
  } else {
    esAdmin.value = false
  }
  cargandoVerificacion.value = false
}

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
    if (data.session) verificarPermisos(data.session.user.email)
    else cargandoVerificacion.value = false
  })

  supabase.auth.onAuthStateChange((_event, _session) => {
    session.value = _session
    if (_session) {
      cargandoVerificacion.value = true
      verificarPermisos(_session.user.email)
    } else {
      esAdmin.value = false
      cargandoVerificacion.value = false
      empleadoActivo.value = null
    }
  })
})

const cerrarSesion = async () => {
  await supabase.auth.signOut()
  empleadoActivo.value = null
  esAdmin.value = false
}

// Variable para el Modo Oscuro
const isDark = ref(false)

// Al cargar la app, revisamos si el usuario ya tenía el modo oscuro activado antes
onMounted(() => {
  // Revisamos localStorage o la preferencia del sistema operativo
  if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})

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
// 3. FUNCIÓN PARA ABRIR/CERRAR EL DASHBOARD
const toggleDashboard = () => {
  empleadoActivo.value = null // Cierra el expediente si estaba abierto
  mostrarDashboard.value = !mostrarDashboard.value
}
</script>

<template>
  <div v-if="session && cargandoVerificacion" class="min-h-screen flex items-center justify-center bg-gray-100">
    <p class="text-gray-500 font-medium">Verificando acceso...</p>
  </div>

  <Login v-else-if="!session" />

  <NoAutorizado v-else-if="!esAdmin" :email="session.user.email" />

  <div v-else class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
    <nav
      class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm sticky top-0 z-10 transition-colors duration-300 gap-3">
      
      <div class="flex items-center justify-between w-full sm:w-auto gap-4">
        <div class="flex items-center gap-3">
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
          <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>
      </div>

      <div class="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 border-t border-gray-100 dark:border-gray-700 pt-2 sm:border-0 sm:pt-0">
        
        <button @click="toggleTema" class="hidden sm:block p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm mr-2" title="Cambiar tema">
          <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>

        <button @click="toggleDashboard"
          class="flex items-center justify-center flex-1 sm:flex-none gap-2 text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 sm:py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <svg v-if="!mostrarDashboard" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>{{ mostrarDashboard ? 'Ver Directorio' : 'Métricas' }}</span>
        </button>

        <button @click="cerrarSesion"
          class="flex-1 sm:flex-none text-center text-xs md:text-sm text-red-500 hover:text-red-700 font-bold transition hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 sm:py-1.5 rounded-lg border border-transparent hover:border-red-100 dark:hover:border-red-900/40 bg-red-50/50 sm:bg-transparent dark:bg-red-900/10 sm:dark:bg-transparent">
          Cerrar Sesión
        </button>
      </div>
    </nav>

    <main class="animate-fade-in">
      <Expediente v-if="empleadoActivo" :empleado="empleadoActivo" @volver="empleadoActivo = null" />
      <Dashboard v-else-if="mostrarDashboard" @cerrar="mostrarDashboard = false" />
      <Directorio v-else @seleccionar="(emp) => { empleadoActivo = emp; mostrarDashboard = false }" />
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