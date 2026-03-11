<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabase'
import { registrarAuditoria } from '../utils/auditoria'

const props = defineProps(['empleado'])
const emit = defineEmits(['volver'])

const documentos = ref([])
const subiendo = ref(false)
const archivoSeleccionado = ref(null)
const docConfirmando = ref(null)
const mensajeExito = ref('')

//variables de pdf
const pdfSeleccionado = ref(null)
const abrirVisorPDF = async (urlCompleta) => {
    try {
        // 1. Extraemos la ruta interna del archivo (le quitamos el dominio público)
        const rutaStorage = urlCompleta.split('/expedientes/')[1]

        if (!rutaStorage) throw new Error("Ruta de archivo no válida")

        // 2. Pedimos a Supabase una URL firmada válida por 60 segundos
        const { data, error } = await supabase.storage
            .from('expedientes')
            .createSignedUrl(rutaStorage, 60)

        if (error) throw error

        // 3. Pasamos esta URL temporal segura a nuestro visor
        pdfSeleccionado.value = data.signedUrl

        // Opcional: Registrar en la auditoría que alguien abrió este documento
        registrarAuditoria('VISUALIZAR', 'EXPEDIENTE_PDF', 'Abrió un documento confidencial', props.empleado.nombre_completo, { archivo: rutaStorage })

    } catch (error) {
        alert('Error al generar enlace seguro: ' + error.message)
    }
}
const cerrarVisorPDF = () => {
    pdfSeleccionado.value = null
}

// 1. LISTA DE CATEGORÍAS
const CATEGORIAS = [
    'F.U.M.S.P. 01 (Formato Único)',
    'Nombramiento',
    'Evaluación de Reclutamiento',
    'Solicitud de empleo',
    'Currículum Vitae',
    'Cartas de recomendación',
    'Constancia de escolaridad',
    'Antecedentes no penales',
    'Constancia de no inhabilitado',
    'Acta de nacimiento',
    'Cartilla militar',
    'Constancia del SAT',
    'C.U.R.P.',
    'Credencial del INE',
    'Examen médico',
    'Comprobante de domicilio',
    'Fotografías (Infantil)',
    'Alta del ISSSTE',
    'Baja de la persona que sustituye',
    'Contrato de cuenta bancaria',
    'Otros Documentos'
]

// Hacemos que la primera opción por defecto sea el Formato Único
const categoriaSeleccionada = ref(CATEGORIAS[0])

// 2. AGRUPAR DOCUMENTOS POR CATEGORÍA (Lógica visual)
const documentosAgrupados = computed(() => {
    const grupos = {}

    // Primero, inicializamos todas las categorías oficiales como listas vacías
    CATEGORIAS.forEach(cat => grupos[cat] = [])

    // Si por alguna razón "Otros Documentos" no está en tu lista, lo creamos de respaldo
    if (!grupos['Otros Documentos']) grupos['Otros Documentos'] = []

    documentos.value.forEach(doc => {
        // Obtenemos la categoría del documento, o 'Otros Documentos' si no tiene
        const cat = doc.tipo || 'Otros Documentos'

        // ¿La categoría de este PDF viejo/nuevo existe en nuestra lista actual de grupos?
        if (grupos[cat]) {
            grupos[cat].push(doc)
        } else {
            // Si es una categoría vieja (ej. "Identificación Oficial"), la mandamos a "Otros Documentos"
            grupos['Otros Documentos'].push(doc)
        }
    })

    return grupos
})

// 3. CÁLCULO DE PROGRESO DEL EXPEDIENTE
// Tomamos todas las categorías oficiales, excepto "Otros Documentos" que es opcional
const categoriasOficiales = CATEGORIAS.filter(cat => cat !== 'Otros Documentos')

const estadoExpediente = computed(() => {
    // Creamos una lista rápida de lo que ya se subió para no hacer bucles innecesarios
    const categoriasSubidas = new Set(documentos.value.map(doc => doc.tipo))

    // Evaluamos cada documento oficial
    const checklist = categoriasOficiales.map(cat => ({
        nombre: cat,
        completado: categoriasSubidas.has(cat)
    }))

    const total = checklist.length
    const completados = checklist.filter(item => item.completado).length
    // Calculamos el porcentaje (evitando dividir entre 0)
    const porcentaje = total === 0 ? 0 : Math.round((completados / total) * 100)

    return { porcentaje, completados, total, checklist }
})

const cargarDocumentos = async () => {
    const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('empleado_id', props.empleado.id)
        .order('created_at', { ascending: false })

    if (error) alert('Error: ' + error.message)
    else documentos.value = data
}

const subirDocumento = async () => {
    if (!archivoSeleccionado.value) return

    try {
        subiendo.value = true
        const archivo = archivoSeleccionado.value

        const nombreLimpio = archivo.name.replace(/\s+/g, '_')
        // Carpeta organizada por RFC y luego por Categoría
        //const rutaStorage = `${props.empleado.rfc}/${categoriaSeleccionada.value}/${Date.now()}_${nombreLimpio}`
        const categoriaLimpia = categoriaSeleccionada.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_')
        const rutaStorage = `${props.empleado.rfc}/${categoriaLimpia}/${Date.now()}_${nombreLimpio}`
        const { error: errorStorage } = await supabase.storage
            .from('expedientes')
            .upload(rutaStorage, archivo)

        if (errorStorage) throw errorStorage

        const { data: dataUrl } = supabase.storage
            .from('expedientes')
            .getPublicUrl(rutaStorage)

        const { error: errorSQL } = await supabase
            .from('documentos')
            .insert([{
                empleado_id: props.empleado.id,
                nombre_archivo: archivo.name,
                url_storage: dataUrl.publicUrl,
                tipo: categoriaSeleccionada.value // <--- Guardamos la categoría
            }])

        if (errorSQL) throw errorSQL
        registrarAuditoria(
            'CREAR',
            'EXPEDIENTE_PDF',
            `Subió un nuevo documento al expediente: ${categoriaSeleccionada.value}`,
            props.empleado.nombre_completo,
            {
                categoria: categoriaSeleccionada.value,
                archivo: archivo.name,
                rfc_empleado: props.empleado.rfc
            }
        )
        mensajeExito.value = `¡Guardado en ${categoriaSeleccionada.value}!`
        setTimeout(() => {
            mensajeExito.value = ''
        }, 3000)
        //alert('Documento guardado en ' + categoriaSeleccionada.value)
        archivoSeleccionado.value = null
        cargarDocumentos()
    } catch (error) {
        alert('Error: ' + error.message)
    } finally {
        subiendo.value = false
    }
}

const eliminarDocumento = async (doc) => {
    try {
        const rutaStorage = doc.url_storage.split('/expedientes/')[1]
        if (rutaStorage) {
            const { error: errorStorage } = await supabase.storage.from('expedientes').remove([rutaStorage])
            if (errorStorage) throw errorStorage
        }

        const { error: errorSQL } = await supabase.from('documentos').delete().eq('id', doc.id)
        if (errorSQL) throw errorSQL

        registrarAuditoria(
            'ELIMINAR',
            'EXPEDIENTE_PDF',
            `Eliminó un documento del expediente: ${doc.tipo || 'Sin Categoría'}`,
            props.empleado.nombre_completo,
            {
                categoria_eliminada: doc.tipo,
                archivo_eliminado: doc.nombre_archivo,
                rfc_empleado: props.empleado.rfc
            }
        )

        // Éxito
        docConfirmando.value = null // Limpiamos el estado
        cargarDocumentos()
    } catch (error) {
        alert('Error al eliminar: ' + error.message)
    }
}

const manejarSeleccion = (event) => {
    archivoSeleccionado.value = event.target.files[0]
}

onMounted(cargarDocumentos)
</script>

<template>
    <div class="p-6 max-w-7xl mx-auto transition-colors duration-300">

        <button @click="$emit('volver')"
            class="mb-6 flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Regresar al Directorio
        </button>

        <div
            class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="flex items-center gap-4">
                    <img v-if="empleado.foto_url" :src="empleado.foto_url"
                        class="h-16 w-16 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-600" />
                    <div v-else
                        class="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-2xl shadow-sm border border-blue-200 dark:border-blue-800">
                        {{ empleado.nombre_completo.charAt(0) }}
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">{{ empleado.nombre_completo }}</h2>
                        <div class="flex flex-col sm:flex-row sm:gap-4 mt-1">
                            <p class="text-sm text-gray-500 dark:text-gray-400">RFC: <span
                                    class="font-mono text-gray-700 dark:text-gray-300">{{ empleado.rfc }}</span></p>
                            
                            <p class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                Emergencia: 
                                <span class="font-medium text-gray-700 dark:text-gray-300">
                                    {{ empleado.contacto_emergencia || 'No registrado' }}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
                <span
                    class="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-100 dark:border-blue-800 shadow-sm">
                    {{ empleado.adscripcion }}
                </span>
            </div>

            <div class="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 w-full">
                <div class="flex justify-between items-center mb-1.5">
                    <span class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado del
                        Expediente</span>
                    <span class="text-sm font-black transition-colors"
                        :class="estadoExpediente.porcentaje === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'">
                        {{ estadoExpediente.porcentaje }}%
                    </span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div class="h-2.5 rounded-full transition-all duration-700 ease-out"
                        :class="estadoExpediente.porcentaje === 100 ? 'bg-green-500' : 'bg-blue-600'"
                        :style="`width: ${estadoExpediente.porcentaje}%`">
                    </div>
                </div>
                <p class="text-[11px] text-gray-400 mt-1.5 font-medium">{{ estadoExpediente.completados }} de {{
                    estadoExpediente.total }} documentos obligatorios subidos.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">


            <div class="lg:col-span-2 space-y-6">
                <div v-for="(docs, categoria) in documentosAgrupados" :key="categoria">
                    <div v-if="docs.length > 0" class="mb-2">
                        <h3
                            class="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-600"></span>
                            {{ categoria }}
                        </h3>

                        <div
                            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 transition-colors duration-300">

                            <div v-if="docs.length === 0" class="p-4 text-sm text-gray-400 dark:text-gray-500 italic">
                                Sin documentos cargados en esta sección.
                            </div>

                            <div v-for="doc in docs" :key="doc.id"
                                class="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group">

                                <div class="flex items-center gap-3 truncate pr-4">
                                    <div
                                        class="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <span class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate"
                                        :title="doc.nombre_archivo">{{ doc.nombre_archivo }}</span>
                                </div>

                                <div class="flex items-center gap-3 shrink-0">

                                    <template v-if="docConfirmando !== doc.id">
                                        <button @click="abrirVisorPDF(doc.url_storage)"
                                            class="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline uppercase transition">Abrir
                                            PDF</button>

                                        <button @click="docConfirmando = doc.id"
                                            class="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                                            title="Eliminar documento">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                                                viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </template>

                                    <template v-else>
                                        <span
                                            class="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase">¿Borrar?</span>
                                        <button @click="eliminarDocumento(doc)"
                                            class="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800/60 font-bold transition">Sí</button>
                                        <button @click="docConfirmando = null"
                                            class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-bold transition">No</button>
                                    </template>

                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>



            <div class="space-y-6 h-fit sticky top-24">
                
                <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Checklist de Requisitos
                    </h3>

                    <div class="max-h-64 overflow-y-auto pr-2 space-y-2.5 custom-scrollbar">
                        <div v-for="item in estadoExpediente.checklist" :key="item.nombre" class="flex items-start gap-3">
                            <div class="mt-0.5 shrink-0">
                                <svg v-if="item.completado" class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                </svg>
                                <svg v-else class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <span class="text-xs leading-tight" :class="item.completado ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200 font-medium'">
                                {{ item.nombre }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <h3 class="font-bold text-gray-800 dark:text-white mb-4">Cargar Documento</h3>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">1. Seleccionar Categoría</label>
                            <select v-model="categoriaSeleccionada" class="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                                <option v-for="cat in CATEGORIAS" :key="cat" :value="cat">{{ cat }}</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">2. Archivo PDF</label>
                            <div class="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition relative">
                                <input type="file" @change="manejarSeleccion" accept=".pdf" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ archivoSeleccionado ? archivoSeleccionado.name : 'Click para buscar archivo' }}
                                </p>
                            </div>
                        </div>

                        <button @click="subirDocumento" :disabled="!archivoSeleccionado || subiendo" class="w-full bg-blue-600 dark:bg-blue-700 text-white font-bold py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50">
                            {{ subiendo ? 'Guardando...' : 'Subir al Expediente' }}
                        </button>

                        <div v-if="mensajeExito" class="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2 text-sm font-medium animate-fade-in">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ mensajeExito }}
                        </div>
                    </div>
                </div>
                
            </div>

        </div>

        <div v-if="pdfSeleccionado"
            class="fixed inset-0 bg-black/80 flex flex-col z-[100] backdrop-blur-sm animate-fade-in">
            <div class="flex justify-between items-center p-4 text-white bg-gray-900 shadow-md">
                <div class="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <h3 class="font-bold text-lg tracking-wide">Visor de Documento</h3>
                </div>

                <div class="flex items-center gap-4">
                    <a :href="pdfSeleccionado" target="_blank"
                        class="text-xs font-bold bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition border border-gray-700 hover:border-gray-600">
                        Abrir en pestaña externa
                    </a>
                    <button @click="cerrarVisorPDF"
                        class="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition"
                        title="Cerrar visor">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="flex-1 w-full p-2 md:p-6 pt-2">
                <iframe :src="pdfSeleccionado" class="w-full h-full rounded-xl bg-white shadow-2xl border-0"
                    title="Visor PDF"></iframe>
            </div>
        </div>

    </div>
</template>