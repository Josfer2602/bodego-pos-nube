import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import api from '../api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
    Package, Calendar as CalendarIcon
} from 'lucide-react';

const Dashboard = () => {
    const { activeProject, projectDetails } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [days, setDays] = useState(30);

    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';

    useEffect(() => {
        fetchDashboardData();
    }, [activeProject, days]);

    const fetchDashboardData = async () => {
        if (!activeProject) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/analytics/dashboard?project_id=${activeProject}&days=${days}`);
            setData(response.data);
        } catch (err) {
            console.error(err);
            setError('Error al cargar datos del dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Cargando dashboard...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;
    if (!data) return null;

    const summary = data.summary;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <select
                    className="border rounded p-2 shadow-sm bg-white cursor-pointer"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                >
                    <option value={7}>Últimos 7 días</option>
                    <option value={30}>Últimos 30 días</option>
                    <option value={90}>Últimos 90 días</option>
                </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6 flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Ingresos Brutos</p>
                        <p className="text-2xl font-bold text-gray-900">{currencySymbol} {summary.total_revenue.toFixed(2)}</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 flex items-center">
                    <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Ganancia Neta</p>
                        <p className="text-2xl font-bold text-gray-900">{currencySymbol} {summary.net_profit.toFixed(2)}</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Transacciones</p>
                        <p className="text-2xl font-bold text-gray-900">{summary.total_transactions}</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Alertas de Stock</p>
                        <p className="text-2xl font-bold text-gray-900">{summary.low_stock_count} / {summary.expiring_count}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center text-gray-800">
                        <TrendingUp className="mr-2" size={20} /> Ventas en el Tiempo
                    </h2>
                    <div className="h-64 md:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.revenue_chart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: '12px' }} tickMargin={10} />
                                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} tickFormatter={(val) => `${currencySymbol} ${val}`} />
                                <Tooltip
                                    formatter={(value) => [`${currencySymbol} ${value}`, 'Ingresos']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line type="monotone" dataKey="total" name="Ventas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                        <ShoppingCart className="mr-2" size={20} /> Más Vendidos
                    </h2>
                    <div className="space-y-4">
                        {data.top_products.length > 0 ? (
                            data.top_products.map((product, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition border border-gray-100">
                                    <span className="font-medium text-gray-700 truncate pr-4">{product.name}</span>
                                    <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-sm font-semibold">
                                        {product.quantity} un.
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-4">No hay datos suficientes</p>
                        )}
                    </div>
                </div>

                {/* Alerts Section */}
                <div className="lg:col-span-3 bg-white rounded-lg shadow p-6 mt-2">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                        <AlertTriangle className="mr-2 text-yellow-500" size={20} /> Alertas de Inventario
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Stock */}
                        <div>
                            <h3 className="text-md font-medium text-gray-600 mb-3 flex items-center"><Package className="inline mr-2" size={16} /> Bajo Stock (&#60; 10)</h3>
                            <ul className="space-y-2">
                                {data.alerts.low_stock.length > 0 ? data.alerts.low_stock.map(item => (
                                    <li key={item.id} className="flex justify-between border-b pb-2">
                                        <span className="text-gray-700">{item.name}</span>
                                        <span className="text-red-500 font-bold">{item.stock}</span>
                                    </li>
                                )) : <li className="text-sm text-gray-400">Todo en orden</li>}
                            </ul>
                        </div>
                        {/* Vencimientos */}
                        <div>
                            <h3 className="text-md font-medium text-gray-600 mb-3 flex items-center"><CalendarIcon className="inline mr-2" size={16} /> Próximos a Vencer</h3>
                            <ul className="space-y-2">
                                {data.alerts.expiring.length > 0 ? data.alerts.expiring.map(item => (
                                    <li key={item.id} className="flex justify-between border-b pb-2">
                                        <span className="text-gray-700">{item.name}</span>
                                        <span className="text-orange-500 font-semibold">{item.date}</span>
                                    </li>
                                )) : <li className="text-sm text-gray-400">Sin alertas de vencimiento</li>}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
