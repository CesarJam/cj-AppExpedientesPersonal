import { createRouter, createWebHistory } from 'vue-router'

// Importamos las vistas
import Login from '../views/Login.vue'
import Directorio from '../views/Directorio.vue'
import Dashboard from '../views/Dashboard.vue'
import Expediente from '../views/Expediente.vue'
import NoAutorizado from '../views/NoAutorizado.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/',
    name: 'Directorio',
    component: Directorio
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    // El ":id" permite pasar el identificador del empleado en la URL
    path: '/expediente/:id', 
    name: 'Expediente',
    component: Expediente,
    props: true // Esto inyecta el ":id" como una prop dentro de Expediente.vue
  },
  {
    path: '/no-autorizado',
    name: 'NoAutorizado',
    component: NoAutorizado
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router