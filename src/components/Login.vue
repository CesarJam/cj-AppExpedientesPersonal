<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase'

const cargando = ref(false)

const iniciarSesion = async () => {
  try {
    cargando.value = true
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Mantenemos tu redirección dinámica corregida
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
  } catch (error) {
    alert('Error: ' + error.message)
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4 transition-colors duration-300">

    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <h1
          class="text-xl md:text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight leading-tight mb-6">
          Consejería Jurídica del Poder Ejecutivo
        </h1>

        <div class="flex justify-center my-6">
          <img src="/src/images/logo.png" alt="Logo Institucional"
            class="h-32 w-auto object-contain drop-shadow-md dark:brightness-110 dark:contrast-125 transition-all duration-300" />
        </div>

        <div class="h-1 w-20 bg-blue-600 mx-auto mt-4 rounded-full"></div>

        <p class="mt-3 text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
          Expedientes de Personal
        </p>
      </div>

      <div
        class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-200 dark:border-gray-700 text-center transition-colors">

        <div
          class="mb-6 bg-blue-50 dark:bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-800">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-blue-600 dark:text-blue-400" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">Acceso Restringido</h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mb-8">
          Identifícate con tu cuenta institucional para gestionar el directorio y expedientes.
        </p>

        <button @click="iniciarSesion" :disabled="cargando"
          class="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-6 h-6" alt="Google" />
          <span>{{ cargando ? 'Conectando...' : 'Entrar con Google' }}</span>
        </button>
      </div>

      <footer class="mt-8 text-center space-y-2">
        <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
          Versión 1.0 &copy; 2026 cesarJam94
        </p>
        <div class="flex justify-center opacity-40 grayscale hover:grayscale-0 transition duration-500">
          <img src="https://www.svgrepo.com/show/512317/github-142.svg" class="h-6 w-6 dark:invert" alt="Logo" />
        </div>
      </footer>
    </div>

  </div>
</template>