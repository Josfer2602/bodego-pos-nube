import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Search, X, Loader2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

const Clients = () => {
    const { activeProject } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', document_id: '', phone: '', email: '' });
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (activeProject) fetchClients();
    }, [activeProject]);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/clients/?project_id=${activeProject}`);
            setClients(res.data);
        } catch (error) {
            toast.error("Error al cargar clientes");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingId(client.id);
            setFormData({
                name: client.name,
                document_id: client.document_id || '',
                phone: client.phone || '',
                email: client.email || ''
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', document_id: '', phone: '', email: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = { ...formData, project_id: activeProject };
            if (editingId) {
                await api.put(`/clients/${editingId}`, payload);
                toast.success("Cliente actualizado");
            } else {
                await api.post('/clients/', payload);
                toast.success("Cliente creado");
            }
            setShowModal(false);
            fetchClients();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar cliente?")) return;
        try {
            await api.delete(`/clients/${id}`);
            toast.success("Cliente eliminado");
            fetchClients();
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.document_id && c.document_id.includes(searchQuery))
    );

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-600" />
                            Directorio de Clientes
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">Gestiona tu cartera de clientes frecuentes.</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                        <Plus className="w-5 h-5" /> Nuevo Cliente
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o DNI/RUC..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-bold border-b border-slate-200">Nombre</th>
                                    <th className="p-4 font-bold border-b border-slate-200">DNI / RUC</th>
                                    <th className="p-4 font-bold border-b border-slate-200 hidden md:table-cell">Contacto</th>
                                    <th className="p-4 font-bold border-b border-slate-200 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-slate-400">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                            Cargando clientes...
                                        </td>
                                    </tr>
                                ) : filteredClients.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-slate-500 font-medium">
                                            No se encontraron clientes.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClients.map(client => (
                                        <tr key={client.id} className="hover:bg-slate-50/80 transition border-b border-slate-100 last:border-0 group">
                                            <td className="p-4 font-bold text-slate-700">{client.name}</td>
                                            <td className="p-4 text-slate-500 font-mono text-sm">{client.document_id || '-'}</td>
                                            <td className="p-4 text-slate-500 text-sm hidden md:table-cell">
                                                {client.phone && <div>{client.phone}</div>}
                                                {client.email && <div className="text-xs text-slate-400">{client.email}</div>}
                                                {(!client.phone && !client.email) && '-'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenModal(client)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="Editar">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(client.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Eliminar">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">
                                {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo *</label>
                                <input required type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 transition" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DNI / RUC</label>
                                <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 transition" value={formData.document_id} onChange={e => setFormData({...formData, document_id: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                                    <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 transition" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input type="email" className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 transition" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSaving} className="flex-1 py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl transition flex justify-center items-center">
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
