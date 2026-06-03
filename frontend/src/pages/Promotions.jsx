import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Tag, Calendar, Trash2, Plus, Percent, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';

const Promotions = () => {
    const { activeProject, projectDetails } = useAuth();
    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';
    const [promotions, setPromotions] = useState([]);
    const [products, setProducts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const emptyForm = { name: '', discount_percentage: '', start_date: '', end_date: '', product_ids: [], promo_type: 'simple', combo_price: '', mix_match_qty: '' };
    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        if (activeProject) { fetchPromotions(); fetchProducts(); }
    }, [activeProject]);

    const fetchPromotions = async () => {
        try {
            const response = await api.get(`/promotions/${activeProject}`);
            setPromotions(response.data);
        } catch (error) { console.error(error); }
    };

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products/', { params: { project_id: activeProject } });
            setProducts(response.data);
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: formData.name,
            discount_percentage: formData.promo_type === 'combo' ? 0.0 : parseFloat(formData.discount_percentage || 0),
            start_date: formData.start_date,
            end_date: formData.end_date,
            project_id: activeProject,
            product_ids: formData.product_ids,
            promo_type: formData.promo_type,
            combo_price: formData.promo_type === 'combo' ? parseFloat(formData.combo_price || 0) : null,
            mix_match_qty: formData.promo_type === 'mix_match' ? parseInt(formData.mix_match_qty || 0) : null
        };
        try {
            if (editingId) {
                await api.put(`/promotions/${editingId}`, payload);
                toast.success('Promoción actualizada correctamente.');
            } else {
                await api.post('/promotions/', payload);
                toast.success('¡Campaña lanzada exitosamente!');
            }
            setShowModal(false);
            setEditingId(null);
            setFormData(emptyForm);
            fetchPromotions();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error guardando promoción');
        }
    };

    const handleEdit = (promo) => {
        setFormData({
            name: promo.name,
            discount_percentage: promo.discount_percentage,
            start_date: promo.start_date,
            end_date: promo.end_date,
            product_ids: promo.products.map(p => p.id),
            promo_type: promo.promo_type || 'simple',
            combo_price: promo.combo_price || '',
            mix_match_qty: promo.mix_match_qty || ''
        });
        setEditingId(promo.id);
        setShowModal(true);
    };

    const handleDelete = async (promoId) => {
        try {
            await api.delete(`/promotions/${promoId}`, { params: { project_id: activeProject } });
            toast.success('Campaña eliminada.');
            setConfirmDeleteId(null);
            fetchPromotions();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error eliminando');
        }
    };

    const toggleProductSelection = (productId) => {
        const idInt = parseInt(productId);
        if (formData.product_ids.includes(idInt)) {
            setFormData({ ...formData, product_ids: formData.product_ids.filter(id => id !== idInt) });
        } else {
            setFormData({ ...formData, product_ids: [...formData.product_ids, idInt] });
        }
    };

    const getPromoStatus = (start, end) => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr >= start && todayStr <= end) {
            return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-border)' }}>VIGENTE</span>;
        } else if (todayStr < start) {
            return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--color-primary-bg, #eff6ff)', color: 'var(--color-primary, #2563eb)' }}>PROGRAMADA</span>;
        } else {
            return <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">FINALIZADA</span>;
        }
    };

    const inputClass = "w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-lg focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm";
    const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative">

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                                    <Tag className="w-4 h-4" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    {editingId ? 'Editar Promoción' : 'Nueva Campaña'}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <label className={labelClass}>Nombre de la Campaña</label>
                                <input name="name" required className={inputClass} placeholder="Ej. Fin de Mes" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Inicia el</label>
                                    <input type="date" required className={inputClass} value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Termina el</label>
                                    <input type="date" required className={inputClass} value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Tipo de Promoción</label>
                                <select className={inputClass} value={formData.promo_type} onChange={e => setFormData({ ...formData, promo_type: e.target.value })}>
                                    <option value="simple">Porcentaje Simple</option>
                                    <option value="combo">Combo (precio cerrado)</option>
                                    <option value="mix_match">Mix & Match (cantidad mínima)</option>
                                </select>
                            </div>

                            {(formData.promo_type === 'simple' || formData.promo_type === 'mix_match') && (
                                <div>
                                    <label className={labelClass}>Descuento (%)</label>
                                    <input type="number" step="0.1" max="100" min="0.1" required
                                    className={inputClass + ' font-bold'}
                                    style={{ color: 'var(--color-primary)' }}
                                    placeholder="Ej. 20" value={formData.discount_percentage} onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })} />
                                </div>
                            )}

                            {formData.promo_type === 'combo' && (
                                <div>
                                    <label className={labelClass}>Precio fijo del combo ({currencySymbol})</label>
                                    <input type="number" step="0.01" min="0.01" required className={inputClass + ' text-emerald-700 font-bold'} placeholder="Ej. 15.00" value={formData.combo_price} onChange={e => setFormData({ ...formData, combo_price: e.target.value })} />
                                </div>
                            )}

                            {formData.promo_type === 'mix_match' && (
                                <div>
                                    <label className={labelClass}>Cantidad mínima requerida</label>
                                    <input type="number" min="2" required className={inputClass + ' text-blue-700 font-bold'} placeholder="Ej. 3" value={formData.mix_match_qty} onChange={e => setFormData({ ...formData, mix_match_qty: e.target.value })} />
                                </div>
                            )}

                            <div>
                                <label className={labelClass}>Productos que aplican ({formData.product_ids.length} seleccionados)</label>
                                <div className="border-2 border-slate-100 rounded-lg bg-slate-50 max-h-44 overflow-y-auto p-2 space-y-0.5">
                                    {products.map(p => (
                                        <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-blue-600 shrink-0"
                                                checked={formData.product_ids.includes(p.id)}
                                                onChange={() => toggleProductSelection(p.id)}
                                            />
                                            <span className="flex-1 text-sm font-medium text-slate-700 truncate">{p.name}</span>
                                            <span className="text-slate-400 text-xs">{currencySymbol} {p.price.toFixed(2)}</span>
                                        </label>
                                    ))}
                                    {products.length === 0 && <span className="text-sm text-slate-400 italic p-2 block">No hay productos en inventario</span>}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg hover:bg-slate-200 font-bold text-sm transition">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={formData.product_ids.length === 0} className={`flex-1 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm transition ${formData.product_ids.length > 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
                                style={formData.product_ids.length > 0 ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: '#94a3b8' }}>
                                    {editingId ? 'Guardar Cambios' : 'Lanzar Campaña'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Campañas de Descuento</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Los productos vigentes se descuentan automáticamente en el POS.</p>
                </div>
                <button
                    onClick={() => { setEditingId(null); setFormData(emptyForm); setShowModal(true); }}
                    className="text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-md transition text-sm font-bold"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                >
                    <Plus className="w-4 h-4" /> Nueva Campaña
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {promotions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                            <Tag className="w-8 h-8 opacity-40" />
                        </div>
                        <p className="font-semibold text-slate-500 mb-1">Sin campañas creadas</p>
                        <p className="text-sm text-slate-400 mb-4">Crea tu primera campaña de descuento.</p>
                        <button
                            onClick={() => { setEditingId(null); setFormData(emptyForm); setShowModal(true); }}
                            className="px-4 py-2 text-white rounded-lg font-bold text-sm shadow-sm transition flex items-center gap-2"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                            <Plus className="w-4 h-4" /> Nueva Campaña
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {promotions.map(promo => (
                            <div key={promo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition">
                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 pr-2 min-w-0">
                                        <h3 className="text-base font-bold text-gray-800 truncate mb-1">{promo.name}</h3>
                                        <div className="text-purple-600 font-black text-xl flex items-center">
                                            {promo.promo_type === 'combo' ? (
                                                <span>Combo: {currencySymbol} {promo.combo_price?.toFixed(2)}</span>
                                            ) : promo.promo_type === 'mix_match' ? (
                                                <span className="text-lg">Mix&Match: -{promo.discount_percentage}%
                                                    <span className="text-xs font-normal text-purple-400 block">Mín: {promo.mix_match_qty} unid.</span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <Percent className="w-5 h-5" />-{promo.discount_percentage}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {getPromoStatus(promo.start_date, promo.end_date)}
                                </div>

                                {/* Dates */}
                                <div className="text-xs text-slate-500 border-t border-slate-100 pt-3 mb-3 space-y-1.5">
                                    <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> <b>Desde:</b> {promo.start_date}</p>
                                    <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> <b>Hasta:</b> {promo.end_date}</p>
                                </div>

                                {/* Products */}
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Aplica a {promo.products.length} productos</p>
                                    <div className="flex flex-wrap gap-1">
                                        {promo.products.slice(0, 4).map(p => (
                                            <span key={p.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{p.name}</span>
                                        ))}
                                        {promo.products.length > 4 && (
                                            <span className="text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded-lg">+{promo.products.length - 4} más</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => handleEdit(promo)}
                                        className="flex-1 flex items-center justify-center gap-2 text-blue-600 border border-blue-100 hover:bg-blue-50 py-2 rounded-lg transition font-bold text-sm"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    {confirmDeleteId === promo.id ? (
                                        <div className="flex-1 flex gap-1">
                                            <button onClick={() => handleDelete(promo.id)} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs transition">Confirmar</button>
                                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs transition">Cancelar</button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteId(promo.id)}
                                            className="flex-1 flex items-center justify-center gap-2 text-red-500 border border-red-100 hover:bg-red-50 py-2 rounded-lg transition font-bold text-sm"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Promotions;
