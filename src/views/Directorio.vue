<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import ModalEmpleado from '../components/ModalEmpleado.vue'
import { registrarAuditoria } from '../utils/auditoria'
import { useRouter } from 'vue-router'

const empleados = ref([])
const cargando = ref(true)
const mostrarModal = ref(false)
const empleadoAEditar = ref(null) 
const busqueda = ref('')
const filtroPuesto = ref('')
const filtroComisionado = ref('')
const router = useRouter()

const verExpediente = (empleado) => {
  router.push(`/expediente/${empleado.id}`)
}

const empleadosFiltrados = computed(() => {
  const texto = busqueda.value.toLowerCase().trim()
  const puestoSeleccionado = filtroPuesto.value.toUpperCase() // SUN, BAS, CON

  return empleados.value.filter(emp => {
    // 1. Verificamos si coincide con el texto (Nombre, RFC o Adscripción)
    const coincideTexto = texto === '' ||
      (emp.nombre_completo || '').toLowerCase().includes(texto) ||
      (emp.rfc || '').toLowerCase().includes(texto) ||
      (emp.adscripcion || '').toLowerCase().includes(texto)

    // 2. Verificamos si coincide con el desplegable de Puesto
    // Si el filtro está vacío (''), dejamos pasar todos. Si no, verificamos que contenga las siglas.
    const coincidePuesto = puestoSeleccionado === '' ||
      (emp.puesto || '').toUpperCase().includes(puestoSeleccionado)

    // 3. Verificamos si coincide con el checkbox de Comisionado
    const esComisionado = emp.comisionado === true || String(emp.comisionado) === 'true' || (emp.adscripcion || '').toUpperCase().includes('COMISIONADO')
    
    let coincideComisionado = true // Por defecto (si es '') pasan todos
    if (filtroComisionado.value === 'SI') {
      coincideComisionado = esComisionado
    } else if (filtroComisionado.value === 'NO') {
      coincideComisionado = !esComisionado
    }

    // El empleado debe cumplir con AMBAS condiciones para aparecer en la tabla
    return coincideTexto && coincidePuesto && coincideComisionado
  })
})

const obtenerEmpleados = async () => {
  try {
    cargando.value = true
    const { data, error } = await supabase.from('empleados').select('*').order('nombre_completo')
    if (error) throw error
    empleados.value = data
  } catch (error) {
    alert('Error: ' + error.message)
  } finally {
    cargando.value = false
  }
}

// Función para abrir modal en modo "Nuevo"
const abrirNuevo = () => {
  empleadoAEditar.value = null
  mostrarModal.value = true
}

// Función para abrir modal en modo "Editar"
const abrirEditar = (empleado) => {
  empleadoAEditar.value = empleado
  mostrarModal.value = true
}

onMounted(obtenerEmpleados)


// Función para exportar el directorio actual a Excel (CSV)
const exportarExcel = () => {
  if (empleadosFiltrados.value.length === 0) return

  const cabeceras = ['No. Empleado','Nombre Completo', 'RFC', 'Puesto', 'Adscripción', 'Estatus']

  const filas = empleadosFiltrados.value.map(emp => [
    `"${emp.numero_empleado || ''}"`,
    `"${emp.nombre_completo || ''}"`,
    `"${emp.rfc || ''}"`,
    `"${emp.puesto || ''}"`,
    `"${emp.adscripcion || ''}"`,
    `"${emp.estatus || ''}"`
  ])

  // AQUÍ ESTÁ EL CAMBIO: Usamos punto y coma (;) en los join
  const contenidoCSV = [
    cabeceras.join(';'),
    ...filas.map(fila => fila.join(';'))
  ].join('\n')

  const blob = new Blob(['\ufeff' + contenidoCSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url

  const fecha = new Date().toISOString().split('T')[0]
  link.setAttribute('download', `Directorio_Empleados_${fecha}.csv`)

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  registrarAuditoria(
    'EXPORTAR',
    'DIRECTORIO',
    'Descargó el directorio completo de empleados',
    'Múltiples',
    { total_registros: empleadosFiltrados.value.length }
  )
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto transition-colors duration-300">

    <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white transition-colors duration-300">Directorio de Personal
      </h1>

      <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full lg:w-auto">

        <div class="relative w-full lg:w-64 xl:w-72 shrink-0">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input v-model="busqueda" type="text" placeholder="Buscar por nombre, RFC o Área..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-400">

          <button v-if="busqueda" @click="busqueda = ''"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            &times;
          </button>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
          <select v-model="filtroPuesto"
            class="w-full sm:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm font-medium">
            <option value="">Todos los puestos</option>
            <option value="SUN">SUN (Supernumerario)</option>
            <option value="BAS">BAS (Base)</option>
            <option value="CON">CON (Confianza)</option>
          </select>

          <select v-model="filtroComisionado"
          class="w-full sm:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm font-medium shrink-0">
          <option value="">Todo el personal</option>
          <option value="SI">Solo Comisionados</option>
          <option value="NO">No Comisionados</option>
        </select>
        </div>

        <div class="flex gap-2 w-full lg:w-auto">
          <button @click="exportarExcel" :disabled="empleadosFiltrados.length === 0"
            class="flex-1 lg:flex-none justify-center flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-md transition font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar directorio actual">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span class="hidden sm:inline lg:hidden xl:inline">Exportar</span>
          </button>

          <button @click="abrirNuevo"
            class="flex-1 lg:flex-none justify-center flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition font-medium whitespace-nowrap"
            title="Agregar nuevo empleado">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
        </div>

      </div>
    </div>

    <div
      class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead
            class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-bold border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="p-4">Nombre</th>
              <th class="p-4">RFC / Núm. Empleado</th>
              <th class="p-4">Puesto / Adscripción</th>
              <th class="p-4 text-center">Estatus</th>
              <th class="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="cargando">
              <td colspan="5" class="p-12 text-center text-gray-400 font-medium italic">
                Cargando directorio de personal...
              </td>
            </tr>

            <tr v-else-if="empleadosFiltrados.length === 0">
              <td colspan="5" class="p-12 text-center text-gray-500 dark:text-gray-400">
                <p class="font-bold text-lg">No se encontraron coincidencias</p>
                <p class="text-sm opacity-70">Verifica el nombre o RFC ingresado.</p>
              </td>
            </tr>

            <tr v-for="emp in empleadosFiltrados" :key="emp.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group">
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <img v-if="emp.foto_url" :src="emp.foto_url"
                    class="h-9 w-9 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-600" />
                  <div v-else
                    class="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs border border-blue-200 dark:border-blue-800">
                    {{ emp.nombre_completo.charAt(0) }}
                  </div>
                  <span class="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {{ emp.nombre_completo }}
                  </span>
                </div>
              </td>
              <td class="p-4">
                <div class="text-xs font-mono text-gray-500 dark:text-gray-400">{{ emp.rfc }}</div>
                <div v-if="emp.numero_empleado" class="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {{ emp.numero_empleado }}
                </div>
              </td>
              <td class="p-4">
                <div class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ emp.puesto }}</div>
                <div class="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{{ emp.adscripcion
                }}</div>
              </td>
              <td class="p-4 text-center">
                <span :class="emp.estatus === 'Activo'
                  ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                  : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border">
                  {{ emp.estatus }}
                </span>
              </td>
              <td class="p-4">
                <div class="flex justify-center gap-2">
                  <button @click="abrirEditar(emp)"
                    class="p-2 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
                    title="Editar Datos">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>

                  <button @click="verExpediente(emp)" class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-lg text-xs font-black hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all border border-blue-100 dark:border-blue-800">
                    EXPEDIENTE
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
        <div v-if="cargando" class="p-10 text-center text-gray-400 italic">Cargando...</div>
        <div v-else-if="empleadosFiltrados.length === 0" class="p-10 text-center text-gray-500 italic">Sin resultados.
        </div>

        <div v-for="emp in empleadosFiltrados" :key="'mob-' + emp.id" class="p-4 bg-white dark:bg-gray-800">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <img v-if="emp.foto_url" :src="emp.foto_url"
                class="h-12 w-12 rounded-full object-cover border-2 border-blue-50 dark:border-gray-700" />
              <div v-else
                class="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                {{ emp.nombre_completo.charAt(0) }}
              </div>
              <div>
                <h3 class="font-bold text-gray-900 dark:text-white leading-tight">{{ emp.nombre_completo }}</h3>
                <div class="flex items-center gap-2 mt-1">
                  <p class="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">{{ emp.rfc }}</p>
                  <span v-if="emp.numero_empleado" class="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold border border-blue-100 dark:border-blue-800">
                    {{ emp.numero_empleado }}
                  </span>
                </div>
              </div>
            </div>
            <span
              :class="emp.estatus === 'Activo' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'"
              class="text-[9px] font-black px-2 py-0.5 rounded border border-current uppercase">
              {{ emp.estatus }}
            </span>
          </div>

          <div
            class="grid grid-cols-2 gap-2 mb-4 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <div>
              <p class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500">Puesto</p>
              <p class="text-xs font-medium text-gray-800 dark:text-gray-200">{{ emp.puesto }}</p>
            </div>
            <div>
              <p class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500">Adscripción</p>
              <p class="text-xs font-medium text-gray-800 dark:text-gray-200">{{ emp.adscripcion }}</p>
            </div>
          </div>

          <div class="flex gap-2">
            <button @click="verExpediente(emp)" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none transition-transform active:scale-95">
              Ver Expediente
            </button>
            <button @click="abrirEditar(emp)"
              class="px-5 bg-gray-100 dark:bg-gray-700 text-amber-600 dark:text-amber-500 rounded-xl active:scale-95 transition-transform border border-gray-200 dark:border-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <ModalEmpleado v-if="mostrarModal" :empleadoSeleccionado="empleadoAEditar" @cerrar="mostrarModal = false"
      @guardado="obtenerEmpleados" />
  </div>
</template>