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
      // Esto detecta automáticamente si estás en localhost o en Netlify
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
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center">
      <div class="mb-6 bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h1 class="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</h1>
      <p class="text-gray-500 mb-8">Identifícate para gestionar los expedientes.</p>
      
      <button 
        @click="iniciarSesion" 
        :disabled="cargando"
        class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition shadow-sm"
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-6 h-6" alt="Google" />
        <span>{{ cargando ? 'Conectando...' : 'Entrar con Google' }}</span>
      </button>
    </div>
  </div>
</template>