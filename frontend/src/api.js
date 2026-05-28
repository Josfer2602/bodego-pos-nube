import axios from 'axios';

// configure base URL and timeout; log value during dev
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
console.log("[api] baseURL =", baseURL);
const api = axios.create({
    baseURL,
    timeout: 10000, // 10s para evitar peticiones colgadas
});

// Interceptor REQUEST: inyectar dinámicamente el Token JWT desde localStorage
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Interceptor RESPONSE: detectar 401 y limpiar sesión expirada
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Token expirado o inválido — limpiar sesión y redirigir al login
            localStorage.removeItem('token');
            localStorage.removeItem('activeProject');
            // Redirigir solo si no estamos ya en /login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
