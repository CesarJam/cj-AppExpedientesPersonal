<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { registrarAuditoria } from '../utils/auditoria'

const emit = defineEmits(['cerrar'])

const cargando = ref(true)

// 1. MÉTRICAS GENERALES Y DE EXPEDIENTES
const metricas = ref({
    totalEmpleados: 0,
    expedientesCompletos: 0,
    expedientesIncompletos: 0,
    documentosPendientes: 0,
    globalSun: 0,
    globalBas: 0,
    globalCon: 0
})

// 2. MÉTRICAS POR ÁREA
const AREAS_OFICIALES = ['JEFATURA', 'DELEGACION', 'SLEN', 'SAPJPE', 'SAPJE', 'UG']
const metricasAreas = ref({})
// Inicializamos el objeto de áreas con ceros
AREAS_OFICIALES.forEach(area => {
    metricasAreas.value[area] = { sun: 0, bas: 0, con: 0, total: 0 }
})

// 3. LISTADO DE COMISIONADOS
const comisionados = ref([])

const CATEGORIAS_OFICIALES = [
    'F.U.M.S.P. 01 (Formato Único)', 'Nombramiento', 'Evaluación de Reclutamiento',
    'Solicitud de empleo', 'Currículum Vitae', 'Cartas de recomendación',
    'Constancia de escolaridad', 'Antecedentes no penales', 'Constancia de no inhabilitado',
    'Acta de nacimiento', 'Cartilla militar', 'Constancia del SAT', 'C.U.R.P.',
    'Credencial del INE', 'Examen médico', 'Comprobante de domicilio',
    'Fotografías (Infantil)', 'Alta del ISSSTE', 'Baja de la persona que sustituye',
    'Contrato de cuenta bancaria'
]

const calcularMetricas = async () => {
    try {
        cargando.value = true

        // Traemos TODOS los datos necesarios de los empleados activos
        const { data: empleados, error: errEmp } = await supabase
            .from('empleados')
            .select('id, estatus, nombre_completo, puesto, adscripcion, comisionado')
            .eq('estatus', 'Activo')

        if (errEmp) throw errEmp

        const { data: documentos, error: errDoc } = await supabase
            .from('documentos')
            .select('empleado_id, tipo')

        if (errDoc) throw errDoc

        metricas.value.totalEmpleados = empleados.length

        // Contadores temporales para expedientes
        let completos = 0
        let incompletos = 0
        let pendientes = 0
        const docsPorEmpleado = {}

        empleados.forEach(emp => {
            // Preparamos para el conteo de expedientes
            docsPorEmpleado[emp.id] = new Set()

            // Normalizamos textos para evitar errores de mayúsculas/minúsculas
            const puestoStr = (emp.puesto || '').toUpperCase()
            const adscripcionStr = (emp.adscripcion || '')
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()

            // --- A. CONTEO GLOBAL DE PUESTOS ---
            if (puestoStr.includes('SUN')) metricas.value.globalSun++
            if (puestoStr.includes('BAS')) metricas.value.globalBas++
            if (puestoStr.includes('CON')) metricas.value.globalCon++

            // --- B. CONTEO POR ÁREA ---
            AREAS_OFICIALES.forEach(area => {
                if (adscripcionStr.includes(area)) {
                    metricasAreas.value[area].total++
                    if (puestoStr.includes('SUN')) metricasAreas.value[area].sun++
                    if (puestoStr.includes('BAS')) metricasAreas.value[area].bas++
                    if (puestoStr.includes('CON')) metricasAreas.value[area].con++
                }
            })

            // --- C. DETECCIÓN DE COMISIONADOS ---
            if (emp.comisionado === true) {
                comisionados.value.push(emp)
            }
        })

        // Procesamos los documentos para saber el estado de los expedientes (Lógica original)
        documentos.forEach(doc => {
            if (docsPorEmpleado[doc.empleado_id] && CATEGORIAS_OFICIALES.includes(doc.tipo)) {
                docsPorEmpleado[doc.empleado_id].add(doc.tipo)
            }
        })

        const totalRequisitos = CATEGORIAS_OFICIALES.length
        empleados.forEach(emp => {
            const subidos = docsPorEmpleado[emp.id].size
            const faltan = totalRequisitos - subidos

            if (faltan === 0) completos++
            else {
                incompletos++
                pendientes += faltan
            }
        })

        metricas.value.expedientesCompletos = completos
        metricas.value.expedientesIncompletos = incompletos
        metricas.value.documentosPendientes = pendientes

        // Ordenamos a los comisionados por área y luego alfabéticamente
        comisionados.value.sort((a, b) => a.adscripcion.localeCompare(b.adscripcion))

    } catch (error) {
        console.error('Error al calcular métricas:', error)
    } finally {
        cargando.value = false
    }
}

onMounted(calcularMetricas)

// Función para exportar todo el Dashboard a CSV
const exportarDashboardCSV = () => {
  const filas = []

  // --- SECCIÓN 1: VISIÓN GENERAL ---
  filas.push(['REPORTE GERENCIAL - CONSEJERÍA JURÍDICA'])
  filas.push([]) // Fila vacía
  filas.push(['--- VISION GENERAL ---'])
  filas.push(['Métrica', 'Total'])
  filas.push(['Total Empleados', metricas.value.totalEmpleados])
  filas.push(['Expedientes Completos (100%)', metricas.value.expedientesCompletos])
  filas.push(['Expedientes Incompletos', metricas.value.expedientesIncompletos])
  filas.push(['Documentos Pendientes', metricas.value.documentosPendientes])
  filas.push(['Total SUN', metricas.value.globalSun])
  filas.push(['Total BAS', metricas.value.globalBas])
  filas.push(['Total CON', metricas.value.globalCon])
  filas.push([])
  filas.push([])

  // --- SECCIÓN 2: DESGLOSE POR ÁREA ---
  filas.push(['--- DESGLOSE POR AREA ---'])
  filas.push(['Área', 'Total Empleados', 'SUN', 'BAS', 'CON'])
  AREAS_OFICIALES.forEach(area => {
    const data = metricasAreas.value[area]
    const nombreArea = area === 'DELEGACION' ? 'DELEGACIÓN' : area
    filas.push([nombreArea, data.total, data.sun, data.bas, data.con])
  })
  filas.push([])
  filas.push([])

  // --- SECCIÓN 3: PERSONAL COMISIONADO ---
  filas.push(['--- PERSONAL COMISIONADO ---'])
  filas.push(['Nombre Completo', 'Puesto', 'Adscripción'])
  
  if (comisionados.value.length === 0) {
    filas.push(['Sin personal comisionado actualmente'])
  } else {
    comisionados.value.forEach(emp => {
      filas.push([
        `"${emp.nombre_completo || ''}"`,
        `"${emp.puesto || ''}"`,
        `"${emp.adscripcion || ''}"`
      ])
    })
  }

  // Convertimos a texto con formato CSV (separado por punto y coma)
  const contenidoCSV = filas.map(fila => fila.join(';')).join('\n')
  
  // Agregamos BOM (\ufeff) para que Excel lea los acentos correctamente
  const blob = new Blob(['\ufeff' + contenidoCSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  
  // Nombre del archivo con la fecha del día
  const fecha = new Date().toISOString().split('T')[0]
  link.setAttribute('download', `Reporte_Dashboard_${fecha}.csv`)

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  //Registro de Auditoria
  registrarAuditoria(
    'EXPORTAR',
    'DASHBOARD',
    'Descargó el reporte gerencial de métricas en formato CSV',
    'Reporte General',
    { 
      total_empleados_activos: metricas.value.totalEmpleados,
      total_comisionados: comisionados.value.length
    }
  )
}
</script>

<template>
    <div class="p-6 max-w-7xl mx-auto transition-colors duration-300 space-y-8">

        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Administrativo</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Resumen analítico del personal Activo y Expedientes.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button @click="exportarDashboardCSV" :disabled="cargando" class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-sm disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Exportar CSV
        </button>
      </div>
    </div>

        <div v-if="cargando" class="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
            <div v-for="i in 8" :key="i" class="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>

        <div v-else class="space-y-8 animate-fade-in">

            <div>
                <h2 class="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Visión General
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                        class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center text-center">
                        <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Total Empleados</p>
                        <p class="text-4xl font-black text-gray-800 dark:text-white">{{ metricas.totalEmpleados }}</p>
                        <div
                            class="mt-3 flex gap-3 text-[10px] font-bold uppercase w-full justify-center bg-gray-50 dark:bg-gray-900/50 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span class="text-indigo-600 dark:text-indigo-400" title="Supernumerarios">SUN: {{
                                metricas.globalSun }}</span>
                            <span class="text-teal-600 dark:text-teal-400" title="Base">BAS: {{ metricas.globalBas
                                }}</span>
                            <span class="text-purple-600 dark:text-purple-400" title="Confianza">CON: {{
                                metricas.globalCon }}</span>
                        </div>
                    </div>
                    <div
                        class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-green-200 dark:border-green-800/50 flex flex-col justify-center items-center text-center">
                        <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Expedientes 100%</p>
                        <p class="text-4xl font-black text-green-600 dark:text-green-400">{{
                            metricas.expedientesCompletos }}</p>
                    </div>
                    <div
                        class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800/50 flex flex-col justify-center items-center text-center">
                        <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Incompletos</p>
                        <p class="text-4xl font-black text-amber-500 dark:text-amber-500">{{
                            metricas.expedientesIncompletos }}</p>
                    </div>
                    <div
                        class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-red-200 dark:border-red-800/50 flex flex-col justify-center items-center text-center">
                        <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Docs
                            Pendientes</p>
                        <p class="text-4xl font-black text-red-500 dark:text-red-400">{{ metricas.documentosPendientes
                            }}</p>
                    </div>
                </div>
            </div>

            <hr class="border-gray-200 dark:border-gray-700">

            <div>
                <h2 class="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-teal-500" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Desglose de Puestos por Área
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div v-for="area in AREAS_OFICIALES" :key="area"
                        class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">

                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-black text-gray-800 dark:text-white tracking-tight">
                                {{ area === 'DELEGACION' ? 'DELEGACIÓN' : area }}
                            </h3>
                            <span
                                class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                Total: {{ metricasAreas[area].total }}
                            </span>
                        </div>

                        <div class="space-y-2">
                            <div
                                class="flex justify-between items-center text-sm bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800">
                                <span>SUN</span> <span>{{ metricasAreas[area].sun }}</span>
                            </div>
                            <div
                                class="flex justify-between items-center text-sm bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded text-teal-700 dark:text-teal-400 font-bold border border-teal-100 dark:border-teal-800">
                                <span>BAS</span> <span>{{ metricasAreas[area].bas }}</span>
                            </div>
                            <div
                                class="flex justify-between items-center text-sm bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded text-purple-700 dark:text-purple-400 font-bold border border-purple-100 dark:border-purple-800">
                                <span>CON</span> <span>{{ metricasAreas[area].con }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <hr class="border-gray-200 dark:border-gray-700">

            <div>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-500" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Personal Comisionado
                    </h2>
                    <span
                        class="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 text-xs font-black px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                        Total: {{ comisionados.length }}
                    </span>
                </div>

                <div v-if="comisionados.length === 0"
                    class="bg-white dark:bg-gray-800 p-8 rounded-xl text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 italic">
                    No hay personal con estatus de comisionado actualmente.
                </div>

                <div v-else
                    class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead
                                class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th class="p-4">Nombre Completo</th>
                                    <th class="p-4 text-center">Puesto</th>
                                    <th class="p-4">Adscripción / Detalle</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                                <tr v-for="emp in comisionados" :key="'com-' + emp.id"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td class="p-4 font-bold text-sm text-gray-800 dark:text-gray-200">{{
                                        emp.nombre_completo }}</td>
                                    <td class="p-4 text-center">
                                        <span class="text-[10px] font-black uppercase px-2 py-1 rounded border" :class="{
                                            'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800': (emp.puesto || '').toUpperCase().includes('SUN'),
                                            'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800': (emp.puesto || '').toUpperCase().includes('BAS'),
                                            'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800': (emp.puesto || '').toUpperCase().includes('CON'),
                                            'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600': !['SUN', 'BAS', 'CON'].some(p => (emp.puesto || '').toUpperCase().includes(p))
                                        }">
                                            {{ emp.puesto || 'N/A' }}
                                        </span>
                                    </td>
                                    <td class="p-4 text-xs text-gray-600 dark:text-gray-400">{{ emp.adscripcion }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>