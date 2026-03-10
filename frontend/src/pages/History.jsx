import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Calendar, DollarSign, ListOrdered, ShoppingBag, Trash2 } from 'lucide-react';

const History = () => {
    const { user, activeProject, projectDetails } = useAuth();
    const [salesList, setSalesList] = useState([]);

    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        if (!activeProject) return;
        try {
            const response = await api.get('/sales/', { params: { project_id: activeProject } });
            setSalesList(response.data);
        } catch (error) {
            console.error('Error fetching sales', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSale = async (saleId) => {
        if (!window.confirm("¿Estás seguro de anular esta venta? El stock de los productos será restaurado.")) return;
        try {
            await api.delete(`/sales/${saleId}`);
            alert("Venta anulada y stock restaurado.");
            fetchSales(); // Recargar lista
        } catch (error) {
            alert(error.response?.data?.detail || "Error al anular venta");
        }
    };

    const totalRevenue = salesList.reduce((sum, sale) => sum + sale.total, 0);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Historial de Ventas</h2>
                <p className="text-slate-500 text-sm mt-1">Revisa todas las transacciones realizadas.</p>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Ingresos Totales</p>
                        <h3 className="text-2xl font-bold text-slate-800">{currencySymbol} {totalRevenue.toFixed(2)}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
                        <ListOrdered className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total de Ventas</p>
                        <h3 className="text-2xl font-bold text-slate-800">{salesList.length}</h3>
                    </div>
                </div>
            </div>

            {/* Listado de Ventas */}
            <div className="bg-white border rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : salesList.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-lg font-medium text-slate-700">Aún no hay ventas registradas</p>
                        <p className="text-sm mt-1">Las ventas confirmadas en el POS aparecerán aquí.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto p-4 space-y-4">
                        {salesList.slice().reverse().map((sale) => ( // Reverse para mostrar lo más nuevo arriba
                            <div key={sale.id} className="border border-slate-100 bg-slate-50/50 rounded-xl p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-200/60 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white shadow-sm border border-slate-100 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-slate-400">
                                            #{sale.id}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {new Date(sale.date).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium mb-0.5">Total cobrado</p>
                                            <p className="text-xl font-bold text-emerald-600">{currencySymbol} {sale.total.toFixed(2)}</p>
                                        </div>
                                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                            <button
                                                onClick={() => handleDeleteSale(sale.id)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Anular Venta (Restaura Stock)"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-slate-600 mb-3 px-1">Artículos vendidos ({sale.details.length}):</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {sale.details.map(item => (
                                            <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-400">ID Producto: {item.product_id}</span>
                                                    <p className="font-medium text-slate-800 text-sm">{item.quantity} x {currencySymbol} {(item.price).toFixed(2)}</p>
                                                </div>
                                                <div className="font-bold text-slate-700">
                                                    {currencySymbol} {(item.quantity * item.price).toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default History;
