import axios from 'axios';

// configure base URL and timeout; log value during dev
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
console.log("[api] baseURL =", baseURL);
const api = axios.create({
    baseURL,
    timeout: 10000, // 10s para evitar peticiones colgadas
});

// Interceptor para inyectar dinámicamente el Token JWT desde localStorage
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

export default api;
