import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Wallet, Lock, Unlock, DollarSign, TrendingUp, CreditCard, ArrowUpDown } from 'lucide-react';

const CashHistory = () => {
    const { activeProject, projectDetails, user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';

    useEffect(() => {
        if (activeProject) fetchSessions();
    }, [activeProject]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/cash/sessions', { params: { project_id: activeProject } });
            setSessions(response.data);
        } catch (error) {
            console.error('Error fetching cash sessions', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '---';
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatMoney = (amount) => {
        if (amount === null || amount === undefined) return '---';
        return `${currencySymbol} ${amount.toFixed(2)}`;
    };

    // Totals for header KPIs
    const closedSessions = sessions.filter(s => s.status === 'closed');
    const totalExpected = closedSessions.reduce((acc, s) => acc + (s.expected_cash || 0) + (s.expected_card || 0) + (s.expected_transfer || 0), 0);
    const totalDiff = closedSessions.reduce((acc, s) => acc + (s.difference || 0), 0);

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative">

            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Historial de Cajas</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Auditoría de sesiones y cuadre de caja.</p>
                </div>
                <div className="flex gap-3">
                    <div className="hidden md:flex bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                            <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Vendido</p>
                            <p className="font-black text-slate-800">{formatMoney(totalExpected)}</p>
                        </div>
                    </div>
                    <div className="hidden md:flex bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl items-center gap-3">
                        <div className={`p-2 rounded-lg ${totalDiff >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            <ArrowUpDown className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Diferencia Acum.</p>
                            <p className={`font-black ${totalDiff >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {totalDiff > 0 ? '+' : ''}{formatMoney(totalDiff)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">

                {user?.role !== 'superadmin' && user?.role !== 'admin' ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-700 mb-1">Acceso Denegado</h2>
                        <p className="text-sm text-slate-400 text-center max-w-xs">No tienes permisos para ver el historial de auditoría de cajas.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead className="bg-slate-100 text-gray-600 text-xs uppercase font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="p-4">Estado / Fechas</th>
                                        <th className="p-4">Cajero</th>
                                        <th className="p-4 text-right">Inicial</th>
                                        <th className="p-4 text-right">Esperado</th>
                                        <th className="p-4 text-right">Real (Declarado)</th>
                                        <th className="p-4 text-right">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                                                <p className="text-slate-400 text-sm">Cargando historial de cajas...</p>
                                            </td>
                                        </tr>
                                    ) : sessions.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-slate-400">
                                                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                <p className="text-sm font-medium">No hay registros de cajas en esta sucursal.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        [...sessions].reverse().map(session => (
                                            <tr key={session.id} className="hover:bg-slate-50 transition group">
                                                {/* Estado / Fechas */}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`p-2 rounded-lg h-8 w-8 flex items-center justify-center shrink-0 ${session.status === 'open' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            {session.status === 'open'
                                                                ? <Unlock className="w-4 h-4" />
                                                                : <Lock className="w-4 h-4" />
                                                            }
                                                        </span>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-700">
                                                                {formatDate(session.opened_at)}
                                                            </div>
                                                            <div className="text-xs text-slate-400">
                                                                {session.status === 'open'
                                                                    ? <span className="text-emerald-600 font-bold">Turno en curso</span>
                                                                    : `Cierre: ${formatDate(session.closed_at)}`
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Cajero */}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                                                            style={{ backgroundColor: 'var(--color-primary)' }}>
                                                            {(session.user?.username || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">
                                                            {session.user?.username || `ID ${session.user_id}`}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Inicial */}
                                                <td className="p-4 text-right">
                                                    <span className="text-sm font-medium text-slate-600">{formatMoney(session.initial_cash)}</span>
                                                </td>

                                                {/* Esperado */}
                                                <td className="p-4 text-right">
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {formatMoney((session.expected_cash || 0) + (session.expected_card || 0) + (session.expected_transfer || 0))}
                                                    </p>
                                                    <div className="text-[10px] text-slate-400 flex flex-col items-end mt-0.5 space-y-0.5">
                                                        <span>💵 Efectivo: {formatMoney(session.expected_cash)}</span>
                                                        <span>💳 Tarjeta: {formatMoney(session.expected_card)}</span>
                                                        <span>📱 Digital: {formatMoney(session.expected_transfer)}</span>
                                                    </div>
                                                </td>

                                                {/* Real Declarado */}
                                                <td className="p-4 text-right">
                                                    {session.status === 'open' ? (
                                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">En curso...</span>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-bold text-slate-800">
                                                                {formatMoney((session.actual_cash || 0) + (session.actual_card || 0) + (session.actual_transfer || 0))}
                                                            </p>
                                                            <div className="text-[10px] text-slate-400 flex flex-col items-end mt-0.5 space-y-0.5">
                                                                <span>💵 Efectivo: {formatMoney(session.actual_cash)}</span>
                                                                <span>💳 Tarjeta: {formatMoney(session.actual_card)}</span>
                                                                <span>📱 Digital: {formatMoney(session.actual_transfer)}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>

                                                {/* Diferencia */}
                                                <td className="p-4 text-right">
                                                    {session.status === 'open' ? (
                                                        <span className="text-slate-300 text-sm">---</span>
                                                    ) : (
                                                        <span className={`font-black text-sm px-3 py-1 rounded-full inline-block ${
                                                            session.difference === 0 ? 'bg-emerald-100 text-emerald-700' :
                                                            session.difference > 0 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {session.difference > 0 ? '+' : ''}{formatMoney(session.difference)}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CashHistory;
