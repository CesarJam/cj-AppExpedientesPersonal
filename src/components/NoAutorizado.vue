<script setup>
import { supabase } from '../supabase'

defineProps(['email'])

const cerrarSesion = async () => {
  await supabase.auth.signOut()
  // Al cerrar sesión, App.vue detectará el cambio y mostrará el Login automáticamente
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center border-t-4 border-red-500">
      
      <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
      
      <p class="text-gray-600 mb-6">
        El usuario <span class="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{{ email }}</span> no tiene permisos de administrador para ver este panel.
      </p>

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-left">
        <p class="text-xs text-yellow-800 flex gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          Si crees que esto es un error, contacta al administrador del sistema.
        </p>
      </div>

      <button 
        @click="cerrarSesion" 
        class="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
      >
        <span>← Volver al Inicio</span>
      </button>

    </div>
  </div>
</template>