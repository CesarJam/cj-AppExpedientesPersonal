<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { registrarAuditoria } from '../utils/auditoria'

const props = defineProps(['empleadoSeleccionado'])
const emit = defineEmits(['cerrar', 'guardado'])

const cargando = ref(false)
const modoEdicion = ref(false)
const confirmandoEliminar = ref(false)

// Variables para la foto
const archivoFoto = ref(null)
const previewFoto = ref(null)
const fotoEliminada = ref(false) // Para saber si le dio clic a la "X"

const form = ref({
  nombre_completo: '',
  rfc: '',
  puesto: '',
  adscripcion: '',
  estatus: 'Activo',
  foto_url: null,
  contacto_emergencia: ''
})

onMounted(() => {
  if (props.empleadoSeleccionado) {
    modoEdicion.value = true
    form.value = { ...props.empleadoSeleccionado }
    previewFoto.value = props.empleadoSeleccionado.foto_url
  }
})

const manejarFoto = (event) => {
  const file = event.target.files[0]
  if (file) {
    archivoFoto.value = file
    previewFoto.value = URL.createObjectURL(file)
    fotoEliminada.value = false
  }
}

// Función para limpiar la foto
const quitarFoto = () => {
  archivoFoto.value = null
  previewFoto.value = null
  fotoEliminada.value = true
  form.value.foto_url = null
}

// Ayudante para sacar la ruta exacta del archivo en Storage
const extraerRutaStorage = (url) => {
  if (!url) return null
  // Si la foto es nueva (en el nuevo bucket)
  if (url.includes('/fotos_perfil/')) {
    return url.split('/fotos_perfil/')[1]
  }
  // Si la foto era vieja (del bucket de expedientes)
  if (url.includes('/expedientes/')) {
    return url.split('/expedientes/')[1]
  }
  return null
}

const guardar = async () => {
  try {
    cargando.value = true
    let errorQuery;

    // 1. Limpieza de Storage: Si cambió la foto o la borró, eliminamos la anterior
    const fotoAnteriorUrl = props.empleadoSeleccionado?.foto_url
    if (fotoAnteriorUrl && (archivoFoto.value || fotoEliminada.value)) {
      const rutaAnterior = extraerRutaStorage(fotoAnteriorUrl)
      if (rutaAnterior) {
        // Usamos el bucket correspondiente según dónde estaba guardada
        const bucketOrigen = fotoAnteriorUrl.includes('/fotos_perfil/') ? 'fotos_perfil' : 'expedientes'
        await supabase.storage.from(bucketOrigen).remove([rutaAnterior])
      }
    }

    // 2. Si hay una nueva foto, subirla al NUEVO BUCKET
    if (archivoFoto.value) {
      const nombreLimpio = archivoFoto.value.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_')
      // Ya no ponemos "fotos_perfil/" en la ruta porque el bucket ya se llama así
      const ruta = `${Date.now()}_${nombreLimpio}`

      const { error: errStorage } = await supabase.storage
        .from('fotos_perfil') // <-- CAMBIO DE BUCKET AQUÍ
        .upload(ruta, archivoFoto.value)

      if (errStorage) throw errStorage

      const { data: urlData } = supabase.storage
        .from('fotos_perfil') // <-- CAMBIO DE BUCKET AQUÍ
        .getPublicUrl(ruta)

      form.value.foto_url = urlData.publicUrl
    }

    // 3. Guardar datos en la base de datos
    if (modoEdicion.value) {
      const { error } = await supabase.from('empleados').update(form.value).eq('id', props.empleadoSeleccionado.id)
      errorQuery = error
      // Después del update exitoso:
      if (!error) {
        registrarAuditoria(
          'EDITAR',
          'DIRECTORIO',
          `Modificó los datos del empleado`,
          form.value.nombre_completo,
          { estatus_nuevo: form.value.estatus, rfc: form.value.rfc }
        )
      }
    } else {
      const { error } = await supabase.from('empleados').insert([form.value])
      errorQuery = error
      if (!error) {
        registrarAuditoria(
          'CREAR',
          'DIRECTORIO',
          `Registró un nuevo empleado en el sistema`,
          form.value.nombre_completo,
          { rfc: form.value.rfc, puesto: form.value.puesto }
        )
      }
    }

    if (errorQuery) throw errorQuery
    emit('guardado')
    emit('cerrar')
  } catch (error) {
    alert('Error al guardar: ' + error.message)
  } finally {
    cargando.value = false
  }
}

const eliminar = async () => {
  try {
    cargando.value = true

    // Si eliminamos al empleado, también borramos su foto de Storage
    if (props.empleadoSeleccionado.foto_url) {
      const rutaAnterior = extraerRutaStorage(props.empleadoSeleccionado.foto_url)
      if (rutaAnterior) {
        const bucketOrigen = props.empleadoSeleccionado.foto_url.includes('/fotos_perfil/') ? 'fotos_perfil' : 'expedientes'
        await supabase.storage.from(bucketOrigen).remove([rutaAnterior])
      }
    }

    const { error } = await supabase.from('empleados').delete().eq('id', props.empleadoSeleccionado.id)
    if (error) throw error
    registrarAuditoria(
      'ELIMINAR',
      'DIRECTORIO',
      'Eliminó el registro de un empleado',
      props.empleadoSeleccionado.nombre_completo,
      { rfc: props.empleadoSeleccionado.rfc }
    )
    emit('guardado')
    emit('cerrar')
  } catch (error) {
    alert('Error al eliminar: ' + error.message)
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-colors duration-300">

    <div
      class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transition-colors duration-300">

      <div :class="modoEdicion ? 'bg-amber-500 dark:bg-amber-600' : 'bg-blue-600 dark:bg-blue-700'"
        class="px-6 py-4 flex justify-between items-center text-white transition-colors duration-300">
        <h3 class="font-bold text-lg">{{ modoEdicion ? 'Editar Empleado' : 'Nuevo Empleado' }}</h3>
        <button @click="$emit('cerrar')"
          class="text-2xl hover:text-gray-200 dark:hover:text-gray-300 transition">&times;</button>
      </div>

      <div class="p-6 space-y-4">

        <div class="flex flex-col items-center mb-2">
          <div class="relative group">
            <label class="cursor-pointer block">
              <div
                class="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden transition group-hover:border-blue-500 dark:group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 shadow-sm">
                <img v-if="previewFoto" :src="previewFoto" class="h-full w-full object-cover" />
                <svg v-else xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input type="file" class="hidden" accept="image/*" @change="manejarFoto" />
            </label>

            <button v-if="previewFoto" @click.prevent="quitarFoto"
              class="absolute -top-1 -right-1 bg-white dark:bg-gray-800 text-red-500 dark:text-red-400 rounded-full p-1.5 hover:bg-red-50 dark:hover:bg-gray-700 transition shadow-md border border-gray-100 dark:border-gray-600 opacity-0 group-hover:opacity-100"
              title="Quitar foto">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <span class="text-[10px] text-gray-400 dark:text-gray-500 mt-2 uppercase font-bold tracking-wider">Foto de
            Perfil</span>
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nombre Completo</label>
          <input v-model="form.nombre_completo" type="text"
            class="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">RFC</label>
          <input v-model="form.rfc" type="text"
            class="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase transition-colors">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Puesto</label>
            <input v-model="form.puesto" type="text"
              class="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ej. SUN - BAS - CON">
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Estatus</label>
            <select v-model="form.estatus"
              class="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
              <option value="Activo">Activo</option>
              <option value="Baja">Baja</option>
              <option value="Licencia">Licencia</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Adscripción</label>
            <input v-model="form.adscripcion" type="text"
              class="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Contacto de Emergencia</label>
            <input v-model="form.contacto_emergencia" type="text" placeholder="Ej. 744 123 4567"
              class="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
          </div>
        </div>
      </div>

      <div
        class="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-between items-center border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div v-if="modoEdicion">
          <button v-if="!confirmandoEliminar" @click="confirmandoEliminar = true"
            class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium transition">
            Eliminar Empleado
          </button>

          <div v-else class="flex items-center gap-2 animate-fade-in">
            <span class="text-xs font-bold text-red-600 dark:text-red-400">¿Borrar?</span>
            <button @click="eliminar"
              class="bg-red-600 dark:bg-red-700 text-white text-xs px-3 py-1.5 rounded hover:bg-red-700 dark:hover:bg-red-600 font-bold transition">Sí</button>
            <button @click="confirmandoEliminar = false"
              class="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-3 py-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 font-bold transition">No</button>
          </div>
        </div>
        <div v-else></div>

        <div class="flex gap-2" v-if="!confirmandoEliminar">
          <button @click="$emit('cerrar')"
            class="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition text-sm font-medium">Cancelar</button>
          <button @click="guardar" :disabled="cargando"
            class="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition disabled:opacity-50 text-sm font-bold flex items-center gap-2">
            <svg v-if="cargando" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
              viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            {{ cargando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Guardar') }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>