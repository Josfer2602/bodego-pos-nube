import React, { createContext, useState, useEffect, useContext } from 'react';
import api from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [activeProject, setActiveProject] = useState(null);
    const [projectDetails, setProjectDetails] = useState(null); // Guarará moneda, tema y logo

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            fetchCurrentUser();
        } else {
            localStorage.removeItem('token');
            setUser(null);
            setLoading(false);
        }
    }, [token]);

    // Cada que el activeProject cambia, bajaremos sus detalles del backend
    useEffect(() => {
        if (activeProject && user) {
            fetchProjectDetails(activeProject);
        } else {
            setProjectDetails(null);
        }
    }, [activeProject, user]);

    const fetchCurrentUser = async () => {
        try {
            const response = await api.get('/users/me');
            setUser(response.data);

            const storedProjectId = localStorage.getItem('activeProject');
            if (storedProjectId) {
                setActiveProject(parseInt(storedProjectId));
            }
        } catch (error) {
            console.error("Error fetching user data", error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectDetails = async (projectId) => {
        try {
            // Cache busting for project details
            const response = await api.get(`/projects/?_=${new Date().getTime()}`);
            const p = response.data.find(proj => proj.id === projectId);
            if (p) {
                // Convertir logo_url relativa a URL completa si existe
                if (p.logo_url && p.logo_url.startsWith('/uploads/')) {
                    // Si api.defaults.baseURL es '/api' (entorno dev con proxy), 
                    // necesitamos la URL real del backend o usar el origen actual
                    const baseURL = api.defaults.baseURL;
                    if (baseURL === '/api' || baseURL.startsWith('/')) {
                        // Modo desarrollo con proxy Vite
                        p.logo_url = `http://127.0.0.1:8001${p.logo_url}`;
                    } else {
                        // Modo producción o URL completa configurada
                        const cleanBase = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL;
                        p.logo_url = `${cleanBase}${p.logo_url}`;
                    }
                }
                setProjectDetails(p);
            }
        } catch (error) {
            console.error("Error trayendo config de la sucursal", error);
        }
    }

    const refreshProjectDetails = () => {
        if (activeProject) {
            fetchProjectDetails(activeProject);
        }
    };

    const login = async (username, password) => {
        console.log('[AuthContext] login()', { username, password: password ? '***' : '' });
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        console.log('[AuthContext] POST /auth/login to', api.defaults.baseURL || '(relative)');
        const response = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        console.log('[AuthContext] login response', response.status, response.data);
        const newToken = response.data.access_token;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        await fetchCurrentUser(); // Esperar a que el usuario esté cargado antes de retornar
        return response.data;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setActiveProject(null);
        setProjectDetails(null);
        localStorage.removeItem('activeProject');
    };

    const selectProject = (projectId) => {
        setActiveProject(projectId);
        localStorage.setItem('activeProject', projectId);
    };

    return (
        <AuthContext.Provider value={{
            user, token, login, logout, activeProject, projectDetails, selectProject, refreshProjectDetails, loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
