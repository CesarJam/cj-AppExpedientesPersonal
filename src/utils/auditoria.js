import { supabase } from '../lib/supabase'

/**
 * Registra una acción en la bitácora de auditoría.
 * @param {string} accion - Ej: 'CREAR', 'EDITAR', 'ELIMINAR', 'EXPORTAR'
 * @param {string} modulo - Ej: 'DIRECTORIO', 'EXPEDIENTE_PDF', 'SISTEMA'
 * @param {string} descripcion - Resumen de lo que pasó.
 * @param {string} empleadoAfectado - Nombre o RFC del empleado (Opcional).
 * @param {object} detalles - Objeto JSON con datos extra (Opcional).
 */
export const registrarAuditoria = async (accion, modulo, descripcion, empleadoAfectado = null, detalles = null) => {
  try {
    const { error } = await supabase.from('auditoria_logs').insert([
      {
        accion: accion,
        modulo: modulo,
        descripcion: descripcion,
        empleado_afectado: empleadoAfectado,
        detalles: detalles
      }
    ])
    
    // Solo mostramos el error en consola para no interrumpir al usuario si falla el log
    if (error) console.error('Error guardando log de auditoría:', error)
  } catch (err) {
    console.error('Excepción en auditoría:', err)
  }
}