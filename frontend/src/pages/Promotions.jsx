import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Tag, Calendar, Trash2, Plus, Percent, Edit2 } from 'lucide-react';

const Promotions = () => {
    const { activeProject, projectDetails } = useAuth();
    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';
    const [promotions, setPromotions] = useState([]);
    const [products, setProducts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        discount_percentage: '',
        start_date: '',
        end_date: '',
        product_ids: [],
        promo_type: 'simple',
        combo_price: '',
        mix_match_qty: ''
    });

    useEffect(() => {
        if (activeProject) {
            fetchPromotions();
            fetchProducts();
        }
    }, [activeProject]);

    const fetchPromotions = async () => {
        try {
            const response = await api.get(`/promotions/${activeProject}`);
            setPromotions(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products/', { params: { project_id: activeProject } });
            setProducts(response.data);
        } catch (error) {
            console.error(error);
        }
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
            } else {
                await api.post('/promotions/', payload);
            }
            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', discount_percentage: '', start_date: '', end_date: '', product_ids: [], promo_type: 'simple', combo_price: '', mix_match_qty: '' });
            fetchPromotions();
        } catch (error) {
            alert(error.response?.data?.detail || "Error guardando promoción");
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
        if (window.confirm('¿Eliminar esta campaña de descuento?')) {
            try {
                await api.delete(`/promotions/${promoId}`, { params: { project_id: activeProject } });
                fetchPromotions();
            } catch (error) {
                alert(error.response?.data?.detail || "Error eliminando");
            }
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
            return <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">VIGENTE</span>;
        } else if (todayStr < start) {
            return <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs font-bold">PROGRAMADA</span>;
        } else {
            return <span className="text-gray-600 bg-gray-200 px-2 py-1 rounded text-xs font-bold">FINALIZADA</span>;
        }
    };

    return (
        <div className="p-4 md:p-8 w-full h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Tag className="text-purple-600 w-8 h-8" /> Campañas de Descuento
                    </h1>
                    <p className="text-gray-500 mt-2">Los productos en campañas Vigentes se auto-descontarán en el POS.</p>
                </div>

                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', discount_percentage: '', start_date: '', end_date: '', product_ids: [], promo_type: 'simple', combo_price: '', mix_match_qty: '' });
                        setShowModal(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center shadow hover:bg-purple-700 transition"
                >
                    <Plus className="w-5 h-5 mr-2" /> Nueva Campaña
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {promotions.map(promo => (
                    <div key={promo.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1 pr-2">
                                <h3 className="text-xl font-bold text-gray-800 break-words mb-1">{promo.name}</h3>
                                <div className="text-purple-600 font-black text-xl flex items-center">
                                    {promo.promo_type === 'combo' ? (
                                        <span>Combo: {currencySymbol} {promo.combo_price?.toFixed(2)}</span>
                                    ) : promo.promo_type === 'mix_match' ? (
                                        <span>Mix & Match: -{promo.discount_percentage}% <span className="text-xs font-normal text-purple-400 block">Min: {promo.mix_match_qty} unid.</span></span>
                                    ) : (
                                        <span className="flex items-center"><Percent className="w-5 h-5 mr-0.5" /> -{promo.discount_percentage}%</span>
                                    )}
                                </div>
                            </div>
                            {getPromoStatus(promo.start_date, promo.end_date)}
                        </div>

                        <div className="flex-1">
                            <div className="text-sm border-t pt-4 text-gray-600 space-y-2 mb-4">
                                <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> <b>Desde:</b> {promo.start_date}</p>
                                <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> <b>Hasta:</b> {promo.end_date}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase mb-2">Aplica a {promo.products.length} productos:</p>
                                <div className="flex flex-wrap gap-1">
                                    {promo.products.slice(0, 4).map(p => (
                                        <span key={p.id} className="text-xs bg-gray-100 px-2 py-1 rounded">{p.name}</span>
                                    ))}
                                    {promo.products.length > 4 && <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-400">+{promo.products.length - 4} más</span>}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-2">
                            <button onClick={() => handleEdit(promo)} className="flex-1 flex items-center justify-center gap-2 text-purple-600 border border-purple-100 hover:bg-purple-50 p-2 rounded transition font-medium">
                                <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            <button onClick={() => handleDelete(promo.id)} className="flex-1 flex items-center justify-center gap-2 text-red-600 border border-red-100 hover:bg-red-50 p-2 rounded transition font-medium">
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                        </div>
                    </div>
                ))}

                {promotions.length === 0 && (
                    <div className="col-span-full p-8 text-center text-gray-500 bg-white border border-dashed rounded-xl">
                        No hay ninguna promoción creada todavía.
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-purple-700"><Tag className="w-5 h-5" /> {editingId ? 'Editar Promoción' : 'Crear Promoción'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Nombre Campaña (Ej. Fin de Mes)</label>
                                <input name="name" required className="w-full border p-2 rounded outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Inicia el</label>
                                    <input type="date" required name="start_date" className="w-full border p-2 rounded outline-none" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Termina el</label>
                                    <input type="date" required name="end_date" className="w-full border p-2 rounded outline-none" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de Promoción</label>
                                <select 
                                    className="w-full border p-2 rounded outline-none bg-white font-medium focus:ring-2 focus:ring-purple-500"
                                    value={formData.promo_type} 
                                    onChange={e => setFormData({ ...formData, promo_type: e.target.value })}
                                >
                                    <option value="simple">Porcentaje Simple (Descuento individual)</option>
                                    <option value="combo">Combo (Paquete de artículos por precio cerrado)</option>
                                    <option value="mix_match">Mix & Match (Lleva X unidades por Y% de descuento)</option>
                                </select>
                            </div>

                            {(formData.promo_type === 'simple' || formData.promo_type === 'mix_match') && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Porcentaje a Descontar (%)</label>
                                    <input type="number" step="0.1" max="100" min="0.1" required name="discount_percentage" placeholder="ej. 20 para 20%" className="w-full border p-2 rounded outline-none text-purple-700 font-bold bg-purple-50" value={formData.discount_percentage} onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })} />
                                </div>
                            )}

                            {formData.promo_type === 'combo' && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Precio Fijo de Venta del Combo ({currencySymbol})</label>
                                    <input type="number" step="0.01" min="0.01" required name="combo_price" placeholder="ej. 15.00" className="w-full border p-2 rounded outline-none text-green-700 font-bold bg-green-50" value={formData.combo_price} onChange={e => setFormData({ ...formData, combo_price: e.target.value })} />
                                </div>
                            )}

                            {formData.promo_type === 'mix_match' && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Cantidad Mínima Requerida (Unidades)</label>
                                    <input type="number" min="2" required name="mix_match_qty" placeholder="ej. 3" className="w-full border p-2 rounded outline-none text-blue-700 font-bold bg-blue-50" value={formData.mix_match_qty} onChange={e => setFormData({ ...formData, mix_match_qty: e.target.value })} />
                                </div>
                            )}

                            <div className="pt-2">
                                <label className="text-sm font-medium text-gray-700 block mb-2">Selecciona qué productos aplican al descuento:</label>
                                <div className="border rounded bg-gray-50 max-h-48 overflow-y-auto p-2 space-y-1">
                                    {products.map(p => (
                                        <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-gray-200">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-purple-600"
                                                checked={formData.product_ids.includes(p.id)}
                                                onChange={() => toggleProductSelection(p.id)}
                                            />
                                            <span className="flex-1">{p.name}</span>
                                            <span className="text-gray-500 text-sm">{currencySymbol} {p.price.toFixed(2)}</span>
                                        </label>
                                    ))}
                                    {products.length === 0 && <span className="text-sm text-gray-500 italic p-2 block">No hay productos en inventario</span>}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 font-medium">Cancelar</button>
                                <button type="submit" disabled={formData.product_ids.length === 0} className={`flex-1 text-white py-2 rounded font-medium transition ${formData.product_ids.length > 0 ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                                    {editingId ? 'Guardar Cambios' : 'Lanzar Promoción'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Promotions;
