import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Shield, ShieldCheck, UserMinus, UserCheck, Plus, Lock, Users, Briefcase, Image as ImageIcon, Settings, PauseCircle, PlayCircle, Trash2, X, Loader2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const AdminPanel = () => {
    const { user, selectProject, activeProject, refreshProjectDetails } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [projectUsers, setProjectUsers] = useState([]); // users linked to current project
    const [selectedProjectId, setSelectedProjectId] = useState(null); // project in focus

    // Formularios
    const [projectForm, setProjectForm] = useState({
        name: '',
        description: '',
        currency: 'PEN',
        theme_color: '#2563eb',
        membership_type: 'mensual',
        print_receipt: true,
        receipt_paper_width: '80mm',
        receipt_header: "RUC: 10000000000\nAv. Principal 123\nTel: 987 654 321",
        receipt_footer: "¡Gracias por su compra!",
        print_logo: true
    });
    const [editingProject, setEditingProject] = useState(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', role: 'client' });
    const [assignForm, setAssignForm] = useState({ user_id: '', project_id: '' });
    const [showModal, setShowModal] = useState(false);

    // Estados para Borrado Custom
    const [projToDelete, setProjToDelete] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

    // Estados para Creación/Edición Custom
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateSuccess, setShowCreateSuccess] = useState(false);

    // Estados para Reset de Contraseña
    const [resetUser, setResetUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    // Logs System
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [logsContent, setLogsContent] = useState('');
    const [loadingLogs, setLoadingLogs] = useState(false);

    const handleViewLogs = async () => {
        setShowLogsModal(true);
        setLoadingLogs(true);
        try {
            const response = await api.get('/logs');
            setLogsContent(response.data.logs || 'Sin contenido.');
        } catch (error) {
            setLogsContent(`Error al cargar logs: ${error.message}`);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Alta Unificada (Superadmin)
    const [unifiedForm, setUnifiedForm] = useState({
        name: '', description: '', currency: 'PEN', theme_color: '#2563eb', membership_type: 'mensual',
        username: '', password: '', role: 'admin'
    });
    const [unifiedLogo, setUnifiedLogo] = useState(null);

    // Upload Logo File Ref
    const fileInputRef = useRef(null);
    const [selectedProjectForLogo, setSelectedProjectForLogo] = useState(null);

    useEffect(() => {
        fetchProjects();
        if (user.role === 'superadmin' || user.role === 'admin') fetchUsers();
    }, [user]);

    const openCreateModal = () => {
        setEditingProject(null);
        setSelectedProjectId(null);
        setProjectUsers([]);
        setUnifiedForm({
            name: '', description: '', currency: 'PEN', theme_color: '#2563eb', membership_type: 'mensual',
            username: '', password: '', role: 'admin'
        });
        setUnifiedLogo(null);
        setUserForm({ username: '', password: '', role: 'client' });
        setAssignForm({ user_id: '', project_id: '' });
        setShowModal(true);
    };

    const openEditModal = async (p) => {
        setEditingProject(p);
        setSelectedProjectId(p.id);
        setProjectForm({
            name: p.name,
            description: p.description || '',
            currency: p.currency,
            theme_color: p.theme_color,
            membership_type: p.membership_type || 'mensual',
            print_receipt: p.print_receipt !== undefined ? p.print_receipt : true,
            receipt_paper_width: p.receipt_paper_width || '80mm',
            receipt_header: p.receipt_header || "RUC: 10000000000\nAv. Principal 123\nTel: 987 654 321",
            receipt_footer: p.receipt_footer || "¡Gracias por su compra!",
            print_logo: p.print_logo !== undefined ? p.print_logo : true
        });
        setAssignForm({ user_id: '', project_id: String(p.id) });
        setUserForm({ username: '', password: '', role: 'client' });
        // Fetch users for this specific project
        try {
            const resp = await api.get(`/projects/${p.id}/users`);
            setProjectUsers(resp.data);
        } catch (e) {
            setProjectUsers([]);
        }
        setShowModal(true);
    };

    const fetchProjectUsers = async (projectId) => {
        if (!projectId) return;
        try {
            const resp = await api.get(`/projects/${projectId}/users`);
            setProjectUsers(resp.data);
        } catch (e) {
            setProjectUsers([]);
        }
    };

    const fetchProjects = async () => {
        try {
            // Cache busting con timestamp para evitar respuestas obsoletas del navegador
            const resp = await api.get(`/projects/?_=${new Date().getTime()}`);
            // Convertir logo_url relativa a URL completa
            const projectsWithFullUrls = resp.data.map(p => {
                if (p.logo_url && p.logo_url.startsWith('/uploads/')) {
                    return { ...p, logo_url: `${api.defaults.baseURL.replace('/api', '')}${p.logo_url}` };
                }
                return p;
            });
            setProjects(projectsWithFullUrls);
        } catch (e) {
            console.error("Error fetching projects:", e);
        }
    };

    const fetchUsers = async () => {
        try {
            const resp = await api.get('/users/');
            setUsers(resp.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleUnifiedSubmit = async (e) => {
        e.preventDefault();
        // setShowModal(false); // COMENTADO: Mantener abierto para feedback
        setIsCreating(true);
        try {
            // 1. Crear Sucursal
            const projectResp = await api.post('/projects/', {
                name: unifiedForm.name,
                description: unifiedForm.description,
                currency: unifiedForm.currency,
                theme_color: unifiedForm.theme_color,
                membership_type: unifiedForm.membership_type
            });
            const projectId = projectResp.data.id;

            // 2. Subir Logo si existe
            if (unifiedLogo) {
                const logoData = new FormData();
                logoData.append('file', unifiedLogo);
                await api.post(`/projects/${projectId}/logo`, logoData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            // 3. Crear Usuario Administrador
            const userResp = await api.post('/users/', {
                username: unifiedForm.username,
                password: unifiedForm.password,
                role: unifiedForm.role
            });
            const userId = userResp.data.id;

            // 4. Asignar Acceso
            await api.post(`/projects/${projectId}/assign/${userId}`);

            setUnifiedLogo(null);
            setUnifiedForm({
                name: '', description: '', currency: 'PEN', theme_color: '#2563eb', membership_type: 'mensual',
                username: '', password: '', role: 'admin'
            });
            await fetchProjects();
            await fetchUsers();
            
            // Si es la sucursal activa, refrescar detalles globales
            if (activeProject === projectId) {
                refreshProjectDetails();
            }

            setIsCreating(false);
            setShowModal(false); // CERRAR AQUÍ, NO AL INICIO
            setShowCreateSuccess(true);

            setTimeout(() => {
                setShowCreateSuccess(false);
            }, 2500);
        } catch (error) {
            setIsCreating(false);
            toast.error(error.response?.data?.detail || 'Error en el alta unificada');
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        // setShowModal(false); // COMENTADO: Mantener abierto para feedback
        setIsCreating(true);
        try {
            if (editingProject) {
                await api.put(`/projects/${editingProject.id}`, projectForm);
            } else {
                await api.post('/projects/', projectForm);
            }
            await fetchProjects();
            
            // Si es la sucursal activa, refrescar detalles globales
            if (activeProject === editingProject.id) {
                refreshProjectDetails();
            }

            setIsCreating(false);
            setShowModal(false); // CERRAR AQUÍ
            setShowCreateSuccess(true);
            setTimeout(() => {
                setShowCreateSuccess(false);
                setEditingProject(null);
            }, 1500); // Reducido de 2500 a 1500
        } catch (error) {
            setIsCreating(false);
            toast.error(error.response?.data?.detail || 'Error al procesar sucursal');
        }
    };

    const handleEditProject = (p) => {
        setEditingProject(p);
        setProjectForm({
            name: p.name,
            description: p.description || '',
            currency: p.currency,
            theme_color: p.theme_color,
            membership_type: p.membership_type || 'mensual'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteProject = (project) => {
        setProjToDelete(project);
        setShowDeleteConfirm(true);
    };

    const executeDelete = async () => {
        if (!projToDelete) return;
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        try {
            await api.delete(`/projects/${projToDelete.id}`);
            setIsDeleting(false);
            setShowDeleteSuccess(true);
            fetchProjects();
            setTimeout(() => {
                setShowDeleteSuccess(false);
                setProjToDelete(null);
            }, 2500);
        } catch (error) {
            setIsDeleting(false);
            toast.error(error.response?.data?.detail || 'Error al eliminar');
            setProjToDelete(null);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const userResp = await api.post('/users/', userForm);
            // Auto-assign to current project if editing one
            if (selectedProjectId) {
                await api.post(`/projects/${selectedProjectId}/assign/${userResp.data.id}`);
                fetchProjectUsers(selectedProjectId);
            }
            setUserForm({ username: '', password: '', role: 'client' });
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al crear usuario');
        }
    };

    const handleAssignUser = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projects/${assignForm.project_id}/assign/${assignForm.user_id}`);
            setAssignForm({ user_id: '', project_id: selectedProjectId ? String(selectedProjectId) : '' });
            // Refresh scoped list
            if (selectedProjectId) fetchProjectUsers(selectedProjectId);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error en asignación');
        }
    };

    const toggleProjectStatus = async (project_id, current_status) => {
        const newStatus = current_status === 'active' ? 'suspended' : 'active';
        try {
            await api.put(`/projects/${project_id}`, { status: newStatus });
            fetchProjects();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error cambiando status');
        }
    };

    const toggleUserStatus = async (user_id) => {
        try {
            await api.put(`/users/${user_id}/status`);
            toast.success('Estado del usuario actualizado');
            if (selectedProjectId) fetchProjectUsers(selectedProjectId);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error cambiando estado');
        }
    };


    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Si es para el alta unificada
        if (!selectedProjectForLogo) {
            setUnifiedLogo(file);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post(`/projects/${selectedProjectForLogo}/logo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Logo subido exitosamente.');
            fetchProjects();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error subiendo logo');
        }
        e.target.value = null; // reset
        setSelectedProjectForLogo(null);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/users/${resetUser.id}/password`, { new_password: newPassword });
            toast.success(`Contraseña actualizada para ${resetUser.username}`);
            setResetUser(null);
            setNewPassword('');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al cambiar contraseña');
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden relative" style={{ background: 'linear-gradient(135deg, var(--color-primary-bg) 0%, #ffffff 100%)' }}>
            {/* Elementos decorativos de fondo */}
            <div className="absolute top-[-5%] right-[-5%] w-[500px] h-[500px] rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: 'var(--color-primary)' }}></div>

            {/* Top Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-white/50 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10 relative">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                        style={{ 
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                            color: 'white',
                            boxShadow: '0 10px 20px -5px color-mix(in srgb, var(--color-primary) 40%, transparent)'
                        }}
                    >
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Consola Global</h1>
                        <p className="text-xs text-gray-500 font-medium hidden md:block">Gestión de sucursales y usuarios del sistema.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Rol: {user.role}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Panel Maestro</p>
                    </div>
                    {user.role === 'superadmin' && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleViewLogs}
                                className="text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-sm"
                            >
                                <FileText className="w-4 h-4" /> Logs Servidor
                            </button>
                            <button
                                onClick={openCreateModal}
                                className="text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm hover:-translate-y-0.5 active:translate-y-0"
                                style={{ 
                                    background: 'linear-gradient(135deg, var(--color-accent) 0%, #d83f0d 100%)',
                                    boxShadow: '0 8px 20px -4px color-mix(in srgb, var(--color-accent) 40%, transparent)' 
                                }}
                            >
                                <Plus className="w-4 h-4" /> Nueva Sucursal
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">

            {/* Modal de Registro/Edición Unificado */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>

                    {/* Modal Content */}
                    <div className="glass-panel bg-white/95 w-full max-w-4xl rounded-3xl shadow-2xl ring-1 ring-black/5 relative overflow-hidden animate-fade-in-up">
                        <div className="absolute top-0 right-0 w-48 h-48 rounded-full -mr-24 -mt-24 opacity-30 pointer-events-none"
                            style={{ backgroundColor: 'var(--color-primary-bg)' }}></div>

                        <div className="p-4 md:p-6 relative">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                                    {editingProject ? (
                                        <><Settings className="w-7 h-7" style={{ color: 'var(--color-primary)' }} /> Configuración de Sucursal</>
                                    ) : (
                                        <><Briefcase className="w-7 h-7" style={{ color: 'var(--color-primary)' }} /> Alta Rápida de Sucursal</>
                                    )}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Banner de Edición */}
                            {editingProject && (
                                <div className="bg-amber-50 text-amber-800 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-3 border border-amber-200">
                                    <Settings className="w-5 h-5 text-amber-500" />
                                    <span className="text-sm">Editando sucursal: <b className="text-base">{editingProject.name}</b></span>
                                </div>
                            )}

                            <form onSubmit={editingProject ? handleCreateProject : handleUnifiedSubmit}>
                                {editingProject ? (
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                        {/* Columna Izquierda: Formulario (Detalles + Ticket settings) */}
                                        <div className="md:col-span-3 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                            <h3 className="text-xs font-black uppercase tracking-widest pb-2 border-b font-mono" style={{ color: 'var(--color-primary)' }}>Detalles del Local</h3>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="sm:col-span-2">
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Comercial</label>
                                                    <input
                                                        className="w-full border-gray-200 border px-3 py-2 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                                        placeholder="Nombre de la tienda"
                                                        required
                                                        value={projectForm.name}
                                                        onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Membresía</label>
                                                    <select
                                                        className="w-full border-gray-200 border px-3 py-2 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white font-semibold"
                                                        value={projectForm.membership_type}
                                                        onChange={e => setProjectForm({ ...projectForm, membership_type: e.target.value })}
                                                    >
                                                        <option value="mensual">Mensual</option>
                                                        <option value="trimestral">Trimestral</option>
                                                        <option value="anual">Anual</option>
                                                        <option value="permanente">Permanente</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Moneda</label>
                                                    <select
                                                        className="w-full border-gray-200 border px-3 py-2 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white font-semibold"
                                                        value={projectForm.currency}
                                                        onChange={e => setProjectForm({ ...projectForm, currency: e.target.value })}
                                                    >
                                                        <option value="PEN">Soles (S/)</option>
                                                        <option value="USD">Dólares ($)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Color de Tema</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            className="w-10 h-10 rounded-xl border cursor-pointer p-0 overflow-hidden"
                                                            value={projectForm.theme_color}
                                                            onChange={e => setProjectForm({ ...projectForm, theme_color: e.target.value })}
                                                        />
                                                        <span className="text-xs font-mono text-gray-500 uppercase">{projectForm.theme_color}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Logo Comercial</label>
                                                    <div
                                                        onClick={() => { setSelectedProjectForLogo(editingProject.id); fileInputRef.current.click(); }}
                                                        className="group relative flex justify-center px-4 py-2 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                                                    >
                                                        <div className="space-y-1 text-center">
                                                            {editingProject.logo_url && !selectedProjectForLogo ? (
                                                                <div className="flex flex-col items-center">
                                                                    <ImageIcon className="h-5 w-5 text-blue-500 mb-0.5" />
                                                                    <span className="text-[10px] text-blue-600 font-bold truncate max-w-[120px]">Editar Logo</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <ImageIcon className="mx-auto h-5 w-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Subir</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CONFIGURACIÓN Y DISEÑO DE TICKET */}
                                            <div className="pt-4 border-t border-gray-100 space-y-4">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 pb-2 border-b font-mono flex items-center gap-2">
                                                    🎨 Diseño y Configuración de Ticket
                                                </h3>

                                                {/* Switch Impresión */}
                                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-150">
                                                    <div>
                                                        <span className="block text-sm font-bold text-gray-700">Imprimir boletas</span>
                                                        <span className="block text-xs text-gray-400">Ofrecer ticket al completar venta</span>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={projectForm.print_receipt}
                                                            onChange={e => setProjectForm({ ...projectForm, print_receipt: e.target.checked })}
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                    </label>
                                                </div>

                                                {projectForm.print_receipt && (
                                                    <div className="space-y-4 animate-fade-in-up">
                                                        {/* Ancho del papel & Mostrar Logo */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-bold text-gray-700 mb-1">Ancho del Papel</label>
                                                                <select
                                                                    className="w-full border-gray-200 border px-3 py-2 rounded-xl outline-none bg-white font-semibold"
                                                                    value={projectForm.receipt_paper_width}
                                                                    onChange={e => setProjectForm({ ...projectForm, receipt_paper_width: e.target.value })}
                                                                >
                                                                    <option value="80mm">80mm (Estándar)</option>
                                                                    <option value="58mm">58mm (Portátil/Mini)</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col justify-end">
                                                                <label className="relative inline-flex items-center cursor-pointer mb-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="sr-only peer"
                                                                        checked={projectForm.print_logo}
                                                                        onChange={e => setProjectForm({ ...projectForm, print_logo: e.target.checked })}
                                                                    />
                                                                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                                                    <span className="ml-2 text-xs font-bold text-gray-600">Imprimir Logo</span>
                                                                </label>
                                                            </div>
                                                        </div>

                                                        {/* Encabezado del ticket */}
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 mb-1">Encabezado (RUC / Dirección / Teléfono)</label>
                                                            <textarea
                                                                rows="3"
                                                                className="w-full border-gray-200 border px-3 py-2 rounded-xl outline-none font-mono text-xs focus:ring-4 focus:ring-emerald-50 transition-all resize-none"
                                                                placeholder="RUC: 10000000000&#10;Av. Principal 123&#10;Tel: 987654321"
                                                                value={projectForm.receipt_header}
                                                                onChange={e => setProjectForm({ ...projectForm, receipt_header: e.target.value })}
                                                            />
                                                        </div>

                                                        {/* Agradecimiento / Footer */}
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 mb-1">Pie de Página (Mensaje de Agradecimiento)</label>
                                                            <input
                                                                className="w-full border-gray-200 border px-3 py-2 rounded-xl outline-none text-sm focus:ring-4 focus:ring-emerald-50 transition-all"
                                                                placeholder="¡Gracias por su compra!"
                                                                value={projectForm.receipt_footer}
                                                                onChange={e => setProjectForm({ ...projectForm, receipt_footer: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-2">
                                                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-bold shadow-md transition-all active:scale-[0.98]">
                                                    Guardar Cambios de Sucursal
                                                </button>
                                            </div>
                                        </div>

                                        {/* Columna Derecha: Vista Previa en Vivo del Ticket */}
                                        <div className="md:col-span-2 bg-slate-100 rounded-2xl p-4 flex flex-col items-center justify-start border border-slate-200 min-h-[300px]">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 font-mono">Vista Previa del Ticket</span>
                                            
                                            {projectForm.print_receipt ? (
                                                <div 
                                                    className={`bg-white p-4 shadow-md border-t-4 border-slate-400 font-mono text-gray-800 transition-all duration-300 select-none overflow-hidden ${
                                                        projectForm.receipt_paper_width === '58mm' ? 'w-[200px] text-[9px]' : 'w-[260px] text-xs'
                                                    }`}
                                                    style={{ borderStyle: 'solid dashed dashed dashed', borderWidth: '4px 1px 1px 1px', borderColor: '#94a3b8 #cbd5e1 #cbd5e1 #cbd5e1' }}
                                                >
                                                    {/* Logo Mockup */}
                                                    {projectForm.print_logo && editingProject.logo_url && (
                                                        <div className="flex justify-center mb-3">
                                                            <img 
                                                                src={editingProject.logo_url} 
                                                                alt="logo mockup" 
                                                                className="h-10 object-contain filter grayscale opacity-70"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Nombre Tienda */}
                                                    <div className="text-center font-bold uppercase border-b border-dashed pb-2 mb-2">
                                                        {projectForm.name || 'MI NEGOCIO'}
                                                    </div>

                                                    {/* Encabezado */}
                                                    <div className="text-center text-[10px] text-gray-500 whitespace-pre-line leading-relaxed mb-3">
                                                        {projectForm.receipt_header || 'Sin datos de RUC/Dirección'}
                                                    </div>

                                                    {/* Detalles Venta Estáticos */}
                                                    <div className="border-t border-b border-dashed py-2 my-2 text-[10px] space-y-1">
                                                        <div className="flex justify-between">
                                                            <span>1x Lady Speed</span>
                                                            <span>{projectForm.currency === 'PEN' ? 'S/' : '$'} 11.70</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>1x Oralsone</span>
                                                            <span>{projectForm.currency === 'PEN' ? 'S/' : '$'} 27.00</span>
                                                        </div>
                                                    </div>

                                                    {/* Totales */}
                                                    <div className="space-y-1 text-right font-bold text-[11px] mb-3">
                                                        <div className="flex justify-between text-gray-400">
                                                            <span>Subtotal</span>
                                                            <span>{projectForm.currency === 'PEN' ? 'S/' : '$'} 38.70</span>
                                                        </div>
                                                        <div className="flex justify-between text-emerald-600">
                                                            <span>Descuento</span>
                                                            <span>-{projectForm.currency === 'PEN' ? 'S/' : '$'} 13.70</span>
                                                        </div>
                                                        <div className="flex justify-between text-base font-black border-t pt-1 mt-1">
                                                            <span>TOTAL</span>
                                                            <span>{projectForm.currency === 'PEN' ? 'S/' : '$'} 25.00</span>
                                                        </div>
                                                    </div>

                                                    {/* Pie de boleta */}
                                                    <div className="text-center text-[10px] text-gray-400 mt-4 border-t border-dashed pt-2 italic">
                                                        {projectForm.receipt_footer || '¡Gracias por su preferencia!'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center flex-1 text-center p-6 text-slate-400">
                                                    <AlertTriangle className="w-10 h-10 mb-2 opacity-40 text-slate-500 animate-bounce" />
                                                    <p className="text-xs font-bold uppercase tracking-wider">Impresión Desactivada</p>
                                                    <p className="text-[10px] mt-1">Activa el switch para diseñar la boleta</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Columna 1: Tienda */}
                                        <div className="space-y-3.5">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-blue-600/60 pb-2 border-b font-mono">1. Local & Negocio</h3>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Comercial</label>
                                                <input
                                                    className="w-full border-gray-200 border px-3 py-2 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                                    placeholder="Nombre de la tienda"
                                                    required
                                                    value={unifiedForm.name}
                                                    onChange={e => setUnifiedForm({ ...unifiedForm, name: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Membresía</label>
                                                    <select
                                                        className="w-full border-gray-200 border px-3 py-2 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white"
                                                        value={unifiedForm.membership_type}
                                                        onChange={e => setUnifiedForm({ ...unifiedForm, membership_type: e.target.value })}
                                                    >
                                                        <option value="mensual">Mensual</option>
                                                        <option value="trimestral">Trimestral</option>
                                                        <option value="anual">Anual</option>
                                                        <option value="permanente">Permanente</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Moneda</label>
                                                    <select
                                                        className="w-full border-gray-200 border px-3 py-2 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white"
                                                        value={unifiedForm.currency}
                                                        onChange={e => setUnifiedForm({ ...unifiedForm, currency: e.target.value })}
                                                    >
                                                        <option value="PEN">Soles (S/)</option>
                                                        <option value="USD">Dólares ($)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Color de Tema</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            className="w-12 h-12 rounded-xl border-2 border-gray-100 cursor-pointer p-0 overflow-hidden shadow-sm"
                                                            value={unifiedForm.theme_color}
                                                            onChange={e => setUnifiedForm({ ...unifiedForm, theme_color: e.target.value })}
                                                        />
                                                        <span className="text-xs font-mono text-gray-500 uppercase">{unifiedForm.theme_color}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">Logo</label>
                                                    <div
                                                        onClick={() => { setSelectedProjectForLogo(null); fileInputRef.current.click(); }}
                                                        className="group relative flex justify-center px-4 py-2 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                                                    >
                                                        <div className="space-y-1 text-center">
                                                            {unifiedLogo ? (
                                                                <div className="flex flex-col items-center">
                                                                    <ImageIcon className="h-5 w-5 text-blue-500 mb-1" />
                                                                    <p className="text-[10px] text-blue-600 font-black truncate max-w-[120px]">
                                                                        {unifiedLogo.name}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <ImageIcon className="mx-auto h-5 w-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Subir</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Columna 2: Usuario */}
                                        <div className="space-y-3.5">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-green-600/60 pb-2 border-b font-mono">2. Administrador Maestro</h3>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Usuario</label>
                                                <input
                                                    className="w-full border-gray-200 border px-3 py-2 rounded-xl focus:ring-4 focus:ring-green-50 outline-none transition-all"
                                                    placeholder="admin_sucursal"
                                                    required
                                                    value={unifiedForm.username}
                                                    onChange={e => setUnifiedForm({ ...unifiedForm, username: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                                                <input
                                                    className="w-full border-gray-200 border px-3 py-2 rounded-xl focus:ring-4 focus:ring-green-50 outline-none transition-all"
                                                    type="password"
                                                    required
                                                    value={unifiedForm.password}
                                                    onChange={e => setUnifiedForm({ ...unifiedForm, password: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Rol</label>
                                                <select
                                                    className="w-full border-gray-200 border px-3 py-2 rounded-xl focus:ring-4 focus:ring-green-50 outline-none transition-all bg-white"
                                                    value={unifiedForm.role}
                                                    onChange={e => setUnifiedForm({ ...unifiedForm, role: e.target.value })}
                                                >
                                                    <option value="admin">Administrador (Dueño)</option>
                                                    <option value="client">Vendedor</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 pt-2">
                                            <button className="w-full text-white py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-[0.98]"
                                                style={{ backgroundColor: 'var(--color-primary)' }}>
                                                Crear Sucursal & Admin
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>

                            {/* Usuarios: Solo se gestionan si la sucursal ya existe (Edición) */}
                            {editingProject && (
                                <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-purple-600/60 pb-3 border-b mb-4 font-mono flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Personal de Sucursal
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Registrar nuevo usuario para esta tienda */}
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Añadir Nuevo Usuario</p>
                                            <form onSubmit={handleCreateUser} className="space-y-2.5">
                                                <input
                                                    className="w-full border border-gray-200 bg-white px-3 py-2 rounded-xl outline-none text-sm focus:ring-4 focus:ring-purple-50 transition-all"
                                                    placeholder="Nombre de usuario"
                                                    value={userForm.username}
                                                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                                    required
                                                />
                                                <input
                                                    className="w-full border border-gray-200 bg-white px-3 py-2 rounded-xl outline-none text-sm focus:ring-4 focus:ring-purple-50 transition-all"
                                                    type="password"
                                                    placeholder="Contraseña"
                                                    value={userForm.password}
                                                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                    required
                                                />
                                                <select
                                                    className="w-full border border-gray-200 bg-white px-3 py-2 rounded-xl outline-none text-sm"
                                                    value={userForm.role}
                                                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                                >
                                                    <option value="client">Vendedor (Cajero)</option>
                                                    <option value="admin">Administrador Local</option>
                                                </select>
                                                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                                                    <Plus className="w-4 h-4" /> Registrar Usuario
                                                </button>
                                            </form>
                                        </div>

                                        {/* Lista de usuarios con scroll */}
                                        <div className="flex flex-col h-full">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-3">Usuarios Registrados</p>
                                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50 flex-1 min-h-[150px]">
                                                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                                    {projectUsers.length === 0 ? (
                                                        <p className="text-xs text-gray-300 text-center p-8 italic">Sin usuarios asignados</p>
                                                    ) : (
                                                        projectUsers.map(u => (
                                                            <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-white transition-colors">
                                                                <span className="text-sm font-semibold text-gray-700">{u.username}</span>
                                                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${u.role === 'superadmin' ? 'bg-red-100 text-red-600' :
                                                                    u.role === 'admin' ? 'bg-blue-100 text-blue-600' :
                                                                        'bg-gray-100 text-gray-500'
                                                                    }`}>{u.role}</span>
                                                                    {user.role === 'superadmin' && (
                                                                        <div className="flex items-center gap-1 ml-3">
                                                                            <button
                                                                                onClick={() => { setResetUser(u); setNewPassword(''); }}
                                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                                                title="Cambiar contraseña"
                                                                            >
                                                                                <ShieldCheck className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => toggleUserStatus(u.id)}
                                                                                className={`p-1.5 rounded-lg transition-colors border border-transparent ${u.is_active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100' : 'text-red-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'}`}
                                                                                title={u.is_active ? "Anular usuario" : "Activar usuario"}
                                                                            >
                                                                                {u.is_active ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Branch List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Settings className="w-4 h-4 text-slate-400" /> Sucursales Registradas
                    </h2>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{projects.length} total</span>
                </div>
                <div className="divide-y divide-gray-100">
                    {projects.map(p => (
                        <div key={p.id} className={`p-6 flex flex-col lg:flex-row gap-6 lg:items-center justify-between transition-colors ${p.status === 'suspended' ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}>

                            <div className="flex items-center gap-5 w-full lg:w-1/3">
                                <div className="w-16 h-16 rounded-xl border border-gray-100 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform hover:scale-105">
                                    {p.logo_url ?
                                        <img src={p.logo_url} alt="logo" className="w-full h-full object-contain" /> :
                                        <ImageIcon className="text-gray-200 w-8 h-8" />
                                    }
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg text-gray-800">{p.name}</h3>
                                    <div className="flex gap-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {p.status === 'active' ? 'En Línea' : 'Suspendido'}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                                            style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', borderColor: 'var(--color-primary-border)' }}>
                                            {p.membership_type?.toUpperCase() || 'MENSUAL'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex flex-wrap gap-2 justify-end">
                                {user.role === 'superadmin' && (
                                    <>

                                        <button onClick={() => openEditModal(p)}
                                            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-all"
                                            style={{ color: 'var(--color-primary)' }} title="Editar">
                                            <Settings className="w-5 h-5" />
                                        </button>
                                    </>
                                )}

                                {user.role === 'superadmin' && (
                                    <>
                                        <button
                                            onClick={() => toggleProjectStatus(p.id, p.status)}
                                            className={`p-2.5 border rounded-xl shadow-sm transition-all ${p.status === 'active' ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' : 'bg-green-50 border-green-100 text-green-600 hover:bg-green-100'}`}
                                            title={p.status === 'active' ? 'Suspender' : 'Reactivar'}
                                        >
                                            {p.status === 'active' ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProject(p)}
                                            className="p-2.5 bg-red-600 hover:bg-red-700 text-white border-transparent rounded-xl shadow-sm transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </>
                                )}

                                {/* Entrar a la tienda - visible para todos */}
                                <button
                                    onClick={() => { selectProject(p.id); navigate('/'); }}
                                    disabled={p.status === 'suspended' && user.role !== 'superadmin'}
                                    className="flex items-center gap-2 px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition text-sm"
                                    style={{ backgroundColor: 'var(--color-primary)' }}
                                    title="Entrar al punto de venta"
                                >
                                    Entrar →
                                </button>
                            </div>

                        </div>
                    ))}
                    {projects.length === 0 && <div className="p-12 text-center text-gray-400 text-sm font-medium">No hay sucursales registradas en el sistema.</div>}
                </div>
            </div>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg"
            />
            </div> {/* end scrollable content */}

            {/* Modal de Confirmación de Borrado */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { if (!isDeleting) setShowDeleteConfirm(false); }}></div>
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in duration-200 p-8 text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">¿Estás seguro?</h3>
                        <p className="text-gray-500 mb-8 leading-relaxed px-2">
                            Estás a punto de eliminar la sucursal <span className="font-bold text-gray-800">"{projToDelete?.name}"</span>.
                            Esta acción es irreversible y se perderán todos los datos vinculados.
                        </p>
                        <div className="flex gap-3 mt-4 relative">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-6 py-3.5 rounded-2xl font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeDelete}
                                className="flex-1 px-6 py-3.5 rounded-2xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 transition-all active:scale-95"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay de Procesamiento / Cargando */}
            {isDeleting && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
                            <Loader2 className="w-20 h-20 text-blue-600 animate-spin absolute top-0 left-0" />
                        </div>
                        <p className="mt-6 text-lg font-black text-gray-800 tracking-tight animate-pulse uppercase">Eliminando sucursal...</p>
                        <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">Limpiando base de datos y adjuntos</p>
                    </div>
                </div>
            )}

            {/* Modal de Éxito al Eliminar */}
            {showDeleteSuccess && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="fixed inset-0 bg-green-600/10 backdrop-blur-sm"></div>
                    <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-green-200 border border-green-50 text-center relative animate-in zoom-in slide-in-from-bottom-10 duration-500">
                        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-green-100/50">
                            <CheckCircle2 className="w-14 h-14 text-green-500" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-800 mb-2">¡Listo!</h3>
                        <p className="text-green-600 font-bold text-lg">La sucursal ha sido eliminada por completo.</p>
                    </div>
                </div>
            )}

            {/* Overlay de Carga (Creación/Actualización) */}
            {isCreating && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
                            <Loader2 className="w-20 h-20 text-blue-600 animate-spin absolute top-0 left-0" />
                        </div>
                        <p className="mt-6 text-lg font-black text-gray-800 tracking-tight animate-pulse uppercase">Configurando sucursal...</p>
                        <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">Preparando base de datos y accesos</p>
                    </div>
                </div>
            )}

            {/* Modal de Éxito al Crear/Actualizar */}
            {showCreateSuccess && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="fixed inset-0 backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}></div>
                    <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-blue-200 border border-blue-50 text-center relative animate-in zoom-in slide-in-from-bottom-10 duration-500">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-blue-100/50">
                            <CheckCircle2 className="w-14 h-14 text-blue-500" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-800 mb-2">¡Completado!</h3>
                        <p className="text-blue-600 font-bold text-lg">La sucursal ha sido procesada exitosamente.</p>
                    </div>
                </div>
            )}
            {/* Modal de Cambio de Contraseña */}
            {resetUser && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="fixed inset-0 backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }} onClick={() => setResetUser(null)}></div>
                    <div className="bg-white rounded-3xl p-8 shadow-2xl relative w-full max-w-sm animate-in zoom-in slide-in-from-bottom-10 duration-300">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                            <Lock className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-1 text-gray-800">Cambiar Contraseña</h3>
                        <p className="text-center text-sm text-gray-500 mb-6">Nuevo acceso para <b>{resetUser.username}</b></p>
                        
                        <form onSubmit={handleResetPassword}>
                            <input
                                type="text"
                                required
                                placeholder="Nueva contraseña"
                                className="w-full border-gray-200 border-2 px-4 py-3 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none transition-all mb-4"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                            <div className="flex gap-3 mt-2">
                                <button type="button" onClick={() => setResetUser(null)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-[0.98]" style={{ backgroundColor: 'var(--color-primary)' }}>
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Logs Modal */}
            {showLogsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[80vh] overflow-hidden">
                        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-slate-400" />
                                <h2 className="font-bold text-lg">Visor de Logs del Sistema</h2>
                            </div>
                            <button onClick={() => setShowLogsModal(false)} className="text-slate-400 hover:text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-900 p-4 overflow-y-auto font-mono text-sm relative">
                            {loadingLogs ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p>Cargando logs del servidor...</p>
                                </div>
                            ) : (
                                <pre className="text-green-400 whitespace-pre-wrap break-all">
                                    {logsContent}
                                </pre>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
