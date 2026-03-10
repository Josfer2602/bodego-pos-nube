import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Store, LogOut, ShieldCheck, ChevronRight } from 'lucide-react';

const ProjectSelector = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, selectProject, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get('/projects/');
                // Convertir logo_url relativa a URL completa
                const projectsWithFullUrls = response.data.map(p => {
                    if (p.logo_url && p.logo_url.startsWith('/uploads/')) {
                        return { ...p, logo_url: `${api.defaults.baseURL}${p.logo_url}` };
                    }
                    return p;
                });
                setProjects(projectsWithFullUrls);
            } catch (error) {
                console.error("Error fetching projects", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const handleSelect = (projectId) => {
        selectProject(projectId);
        navigate('/');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-10 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Hola, {user?.username}</h1>
                        <p className="text-slate-500 mt-1 text-sm md:text-base">Selecciona la sucursal o proyecto a gestionar</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Panel Admin
                            </button>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 bg-white px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 transition-colors shadow-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            Salir
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm mt-8">
                        <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Sin proyectos asignados</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-6">
                            No tienes acceso a ninguna sucursal. {(user?.role === 'superadmin' || user?.role === 'admin') ? 'Dirígete al Panel Admin para crear o vincular una nueva.' : 'Contacta al administrador para que asigne tu usuario a un proyecto.'}
                        </p>
                        {(user?.role === 'superadmin' || user?.role === 'admin') && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                            >
                                <ShieldCheck className="w-5 h-5" />
                                Ir al Panel de Control
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => handleSelect(project.id)}
                                className="text-left bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all group"
                            >
                                <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Store className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">{project.name}</h3>
                                <p className="text-slate-500 text-sm line-clamp-2 h-10">
                                    {project.description || 'Sucursal activa para ventas e inventario.'}
                                </p>
                                <div className="mt-6 flex items-center text-blue-600 font-medium text-sm group-hover:underline">
                                    Entrar a sucursal <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectSelector;
