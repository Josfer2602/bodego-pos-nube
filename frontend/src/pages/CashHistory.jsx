import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Wallet, Search, Calendar, User as UserIcon, Lock, Unlock, DollarSign } from 'lucide-react';

const CashHistory = () => {
    const { activeProject, projectDetails, user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';

    useEffect(() => {
        if (activeProject) {
            fetchSessions();
        }
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
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
    };

    const formatMoney = (amount) => {
        if (amount === null || amount === undefined) return '---';
        return `${currencySymbol} ${amount.toFixed(2)}`;
    };

    if (user?.role !== 'superadmin' && user?.role !== 'admin') {
        return (
            <div className="p-8 max-w-7xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
                <p className="text-gray-500 mt-2">No tienes permisos para ver el historial de auditoría de cajas.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 w-full h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <Wallet className="text-blue-600" />
                    Historial de Cajas
                </h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="p-4 font-semibold text-gray-600">Estado / Fecha</th>
                                <th className="p-4 font-semibold text-gray-600">Cajero</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Inicial</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Esperado</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Real (Declarado)</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Diferencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sessions.map(session => (
                                <tr key={session.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {session.status === 'open' ? (
                                                <span className="bg-green-100 text-green-700 p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                                                    <Unlock className="w-4 h-4" />
                                                </span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-600 p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                                                    <Lock className="w-4 h-4" />
                                                </span>
                                            )}
                                            <div>
                                                <div className="font-bold text-gray-800 text-sm">
                                                    Apertura: {formatDate(session.opened_at)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Cierre: {formatDate(session.closed_at)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded flex items-center justify-center text-xs font-bold">
                                                {session.user?.username.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span className="font-medium text-gray-700">{session.user?.username || `ID ${session.user_id}`}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-medium text-gray-600">
                                        {formatMoney(session.initial_cash)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="text-sm font-bold text-gray-800">
                                            {formatMoney((session.expected_cash || 0) + (session.expected_card || 0) + (session.expected_transfer || 0))}
                                        </div>
                                        <div className="text-[10px] text-gray-500 flex flex-col items-end">
                                            <span>💵 {formatMoney(session.expected_cash)}</span>
                                            <span>💳 {formatMoney(session.expected_card)}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        {session.status === 'open' ? (
                                            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded">En curso...</span>
                                        ) : (
                                            <>
                                                <div className="text-sm font-bold text-gray-800">
                                                    {formatMoney((session.actual_cash || 0) + (session.actual_card || 0) + (session.actual_transfer || 0))}
                                                </div>
                                                <div className="text-[10px] text-gray-500 flex flex-col items-end">
                                                    <span>💵 {formatMoney(session.actual_cash)}</span>
                                                    <span>💳 {formatMoney(session.actual_card)}</span>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {session.status === 'open' ? (
                                            <span className="text-gray-300">---</span>
                                        ) : (
                                            <span className={`font-black text-sm px-3 py-1 rounded-full ${
                                                session.difference === 0 ? 'bg-green-100 text-green-700' :
                                                session.difference > 0 ? 'bg-orange-100 text-orange-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {session.difference > 0 ? '+' : ''}{formatMoney(session.difference)}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {sessions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">
                                        No hay registros de cajas en esta sucursal.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CashHistory;
