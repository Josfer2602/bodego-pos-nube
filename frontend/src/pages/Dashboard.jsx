import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import api from '../api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
    Package, Calendar as CalendarIcon, RefreshCw
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, primary }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
        <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${!primary ? color : ''}`}
            style={primary ? { backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' } : {}}
        >
            <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest truncate">{label}</p>
            <p className="text-2xl font-black text-gray-800 leading-tight truncate">{value}</p>
        </div>
    </div>
);

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

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Resumen de rendimiento de tu sucursal.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-700"
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                    >
                        <option value={7}>Últimos 7 días</option>
                        <option value={30}>Últimos 30 días</option>
                        <option value={90}>Últimos 90 días</option>
                    </select>
                    <button
                        onClick={fetchDashboardData}
                        className="border border-gray-200 hover:bg-gray-50 bg-white text-gray-600 px-3 py-2 rounded-lg flex items-center gap-2 transition shadow-sm text-sm font-bold"
                        style={{ color: 'var(--color-primary)' }}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm font-medium">Cargando dashboard...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-red-500">
                        <AlertTriangle className="w-10 h-10 mb-3 opacity-60" />
                        <p className="font-semibold">{error}</p>
                        <button onClick={fetchDashboardData} className="mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-bold text-red-600 hover:bg-red-100 transition">
                            Reintentar
                        </button>
                    </div>
                ) : !data ? null : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatCard
                                icon={DollarSign}
                                label="Ingresos Brutos"
                                value={`${currencySymbol} ${data.summary.total_revenue.toFixed(2)}`}
                                primary
                            />
                            <StatCard
                                icon={TrendingUp}
                                label="Ganancia Neta"
                                value={`${currencySymbol} ${data.summary.net_profit.toFixed(2)}`}
                                color="bg-emerald-100 text-emerald-600"
                            />
                            <StatCard
                                icon={ShoppingCart}
                                label="Transacciones"
                                value={data.summary.total_transactions}
                                color="bg-purple-100 text-purple-600"
                            />
                            <StatCard
                                icon={AlertTriangle}
                                label="Alertas de Stock"
                                value={`${data.summary.low_stock_count} bajo / ${data.summary.expiring_count} vence`}
                                color="bg-amber-100 text-amber-600"
                            />
                        </div>

                        {/* Chart + Top Products */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                            {/* Line Chart */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-500" /> Ventas en el Tiempo
                                </h2>
                                <div className="h-56 md:h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.revenue_chart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis dataKey="date" stroke="#94A3B8" style={{ fontSize: '11px' }} tickMargin={10} />
                                            <YAxis stroke="#94A3B8" style={{ fontSize: '11px' }} tickFormatter={(val) => `${currencySymbol}${val}`} />
                                            <Tooltip
                                                formatter={(value) => [`${currencySymbol} ${value}`, 'Ingresos']}
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px' }}
                                            />
                                            <Line type="monotone" dataKey="total" name="Ventas" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top Products */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-purple-500" /> Más Vendidos
                                </h2>
                                <div className="space-y-2">
                                    {data.top_products.length > 0 ? (
                                        data.top_products.map((product, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition border border-slate-100 group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-xs font-black text-slate-400 w-5 shrink-0">#{idx + 1}</span>
                                                    <span className="font-semibold text-slate-700 text-sm truncate">{product.name}</span>
                                                </div>
                                                <span className="shrink-0 py-1 px-3 rounded-full text-xs font-bold ml-2 text-white"
                                                    style={{ backgroundColor: 'var(--color-primary)' }}>
                                                    {product.quantity} un.
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 text-center py-8 text-sm">No hay datos suficientes</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Alerts */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas de Inventario
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Low Stock */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5" /> Bajo Stock (&lt; 10 unidades)
                                    </h3>
                                    <div className="space-y-1">
                                        {data.alerts.low_stock.length > 0 ? data.alerts.low_stock.map(item => (
                                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                                <span className="text-sm text-slate-700 truncate pr-4">{item.name}</span>
                                                <span className="shrink-0 text-xs font-black text-white bg-red-500 px-2.5 py-1 rounded-full">{item.stock}</span>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-slate-400 flex items-center gap-2 py-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Todo en orden
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {/* Expiring */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <CalendarIcon className="w-3.5 h-3.5" /> Próximos a Vencer
                                    </h3>
                                    <div className="space-y-1">
                                        {data.alerts.expiring.length > 0 ? data.alerts.expiring.map(item => (
                                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                                <span className="text-sm text-slate-700 truncate pr-4">{item.name}</span>
                                                <span className="shrink-0 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">{item.date}</span>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-slate-400 flex items-center gap-2 py-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Sin alertas de vencimiento
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
