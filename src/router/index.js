import { createRouter, createWebHistory } from 'vue-router'

// Lazy load components
const Login = () => import('../views/Login.vue')
const Tasks = () => import('../views/Tasks.vue')
const Upload = () => import('../views/Upload.vue')
const Gallery = () => import('../views/Gallery.vue')
const Result = () => import('../views/Result.vue')

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/login',
    redirect: '/'
  },
  {
    path: '/upload',
    name: 'Upload',
    component: Upload,
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: Tasks,
    meta: { requiresAuth: true }
  },
  {
    path: '/result/:id',
    name: 'Result',
    component: Result,
    meta: { requiresAuth: true }
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: Gallery,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auth guard: redirect to login if token missing
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !token) {
    if (to.name !== 'Login') {
                                                               }
  } else {
    next();
  }
});

export default router
