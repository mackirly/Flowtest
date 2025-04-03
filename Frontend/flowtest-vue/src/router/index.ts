// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Импорт компонентов страниц
import Dashboard from '../views/Dashboard.vue';
import TestCases from '../views/TestCases.vue';
import TestRuns from '../views/TestRuns.vue';
import Scheduler from '../views/Scheduler.vue';
import Login from '../views/Login.vue';
import MainLayout from '../views/MainLayout.vue';
import SettingsPage from '../views/SettingsPage.vue';
import Reports from '../views/Reports.vue';
import ProfileSettings from '../views/ProfileSettings.vue';


// Определение маршрутов
const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/login.html' }, 
  { path: '/login.html', name: 'Login', component: Login },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/test-cases', name: 'TestCases', component: TestCases },
  { path: '/test-runs', name: 'TestRuns', component: TestRuns },
  { path: '/scheduler', name: 'Scheduler', component: Scheduler },
  { path: '/mainlayout', name: 'MainLayout', component: MainLayout },
  { path: '/settings', name: 'Settings', component: SettingsPage },
  { path: '/reports', name: 'Reports', component: Reports },
  { path: '/profile-settings', name: 'ProfileSettings', component: ProfileSettings},
];


// Создание экземпляра маршрутизатора
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('access_token');
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login.html');  // Перенаправляем на страницу логина, если не авторизован
  } else {
    next();
  }
});

export default router;
