import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { DollarSign, ListOrdered, ShoppingBag, Trash2, Download, Printer, Filter, X, Eye, Package } from 'lucide-react';
import { toast } from 'sonner';

const History = () => {
    const { user, activeProject, projectDetails } = useAuth();
    const [salesList, setSalesList] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);

    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';
    const [loading, setLoading] = useState(true);
    const [confirmDeleteSaleId, setConfirmDeleteSaleId] = useState(null);
    const [selectedSale, setSelectedSale] = useState(null);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        if (!activeProject) return;
        try {
            const response = await api.get('/sales/', { params: { project_id: activeProject } });
            setSalesList(response.data);
            setFilteredSales(response.data);
        } catch (error) {
            console.error('Error fetching sales', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = () => {
        let filtered = [...salesList];
        
        if (startDate) {
            const startStr = startDate + "T00:00:00";
            filtered = filtered.filter(s => new Date(s.date) >= new Date(startStr));
        }

        if (endDate) {
            const endStr = endDate + "T23:59:59";
            filtered = filtered.filter(s => new Date(s.date) <= new Date(endStr));
        }
        if (paymentMethod) {
            filtered = filtered.filter(s => s.payment_method === paymentMethod);
        }
        
        setFilteredSales(filtered);
    };

    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
        setPaymentMethod('');
        setFilteredSales(salesList);
    };

    const handleDeleteSale = async (saleId) => {
        try {
            await api.delete(`/sales/${saleId}`);
            toast.success("Venta anulada y stock restaurado.");
            setConfirmDeleteSaleId(null);
            fetchSales(); // Recargar lista
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error al anular venta");
        }
    };

    const handlePrintTicket = (sale) => {
        if (!sale) return;

        if (projectDetails && projectDetails.print_receipt === false) {
            toast.error("La sucursal tiene desactivada la impresión de tickets.");
            return;
        }

        const widthSetting = projectDetails?.receipt_paper_width || '80mm';
        const isNarrow = widthSetting === '58mm';
        const printableWidth = isNarrow ? '48mm' : '72mm';
        const bodyFontSize = isNarrow ? '9px' : '12px';
        const headerFontSize = isNarrow ? '11px' : '15px';
        const subtitleFontSize = isNarrow ? '8px' : '10px';

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        
        let logoHtml = '';
        if (projectDetails?.print_logo && projectDetails?.logo_url) {
            logoHtml = `
                <div class="text-center" style="margin-bottom: 8px;">
                    <img src="${projectDetails.logo_url}" style="max-height: 40px; max-width: 100%; filter: grayscale(100%);" />
                </div>
            `;
        }

        const ticketHtml = `
            <html>
            <head>
                <style>
                    @page {
                        size: ${widthSetting} auto;
                        margin: 0;
                    }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        width: ${printableWidth};
                        margin: 0;
                        padding: ${isNarrow ? '2mm 1mm 6mm 1mm' : '4mm 4mm 10mm 4mm'};
                        font-size: ${bodyFontSize};
                        color: #000;
                        line-height: 1.2;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 4px 0; }
                    .header { font-size: ${headerFontSize}; margin-bottom: 2px; text-transform: uppercase; }
                    .subtitle { font-size: ${subtitleFontSize}; margin-bottom: 4px; color: #000; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { text-align: left; padding: 2px 0; }
                    .total-row td { font-weight: bold; font-size: ${isNarrow ? '10px' : '13px'}; }
                    .metadata { font-size: ${isNarrow ? '8px' : '10px'}; }
                    .header-custom { white-space: pre-wrap; font-size: ${isNarrow ? '8px' : '10px'}; text-align: center; margin-bottom: 6px; }
                </style>
            </head>
            <body>
                ${logoHtml}
                <div class="text-center bold header">${projectDetails?.name || 'BODEGO POS'}</div>
                <div class="text-center subtitle">BOLETA DE VENTA</div>
                
                ${projectDetails?.receipt_header ? `
                    <div class="header-custom">${projectDetails.receipt_header}</div>
                ` : ''}
                
                <div class="divider"></div>
                <div class="metadata"><b>Fecha:</b> ${new Date(sale.date).toLocaleString()}</div>
                <div class="metadata"><b>Pago:</b> ${(sale.payment_method || 'efectivo').toUpperCase()}</div>
                <div class="divider"></div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 55%; font-size: ${isNarrow ? '8px' : '10px'};">Articulo</th>
                            <th style="width: 15%; text-align: center; font-size: ${isNarrow ? '8px' : '10px'};">Cant</th>
                            <th style="width: 30%; text-align: right; font-size: ${isNarrow ? '8px' : '10px'};">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.details.map(item => `
                            <tr>
                                <td style="font-size: ${isNarrow ? '8px' : '11px'};">${item.product?.name || `ID: ${item.product_id}`}</td>
                                <td style="text-align: center; font-size: ${isNarrow ? '8px' : '11px'};">${item.quantity}</td>
                                <td style="text-align: right; font-size: ${isNarrow ? '8px' : '11px'};">${currencySymbol} ${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="divider"></div>
                <table>
                    <tr class="total-row">
                        <td style="width: 60%; font-size: ${isNarrow ? '9px' : '12px'}; font-weight: bold;">TOTAL:</td>
                        <td style="text-align: right; width: 40%; font-size: ${isNarrow ? '9px' : '12px'}; font-weight: bold;">${currencySymbol} ${sale.total.toFixed(2)}</td>
                    </tr>
                </table>
                
                ${projectDetails?.receipt_footer ? `
                    <div class="divider"></div>
                    <div class="text-center italic" style="margin-top: 10px; font-size: ${isNarrow ? '8px' : '10px'}; font-weight: bold;">
                        ${projectDetails.receipt_footer}
                    </div>
                ` : `
                    <div class="divider"></div>
                    <div class="text-center" style="margin-top: 10px; font-size: ${isNarrow ? '8px' : '10px'}; font-weight: bold;">
                        ¡GRACIAS POR SU COMPRA!
                    </div>
                `}
            </body>
            </html>
        `;

        doc.open();
        doc.write(ticketHtml);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            document.body.removeChild(iframe);
        }, 300);
    };

    const exportToCSV = () => {
        if (filteredSales.length === 0) return;

        const headers = [
            "ID Venta",
            "Fecha y Hora",
            "Metodo de Pago",
            "ID Producto",
            "Nombre Producto",
            "Cantidad",
            "Precio Unitario",
            "Total Item",
            "Total Venta"
        ];

        const rows = [];
        filteredSales.forEach(sale => {
            const formattedDate = new Date(sale.date).toLocaleString();
            sale.details.forEach(detail => {
                rows.push([
                    sale.id,
                    `"${formattedDate}"`,
                    `"${sale.payment_method || 'efectivo'}"`,
                    detail.product_id,
                    `"${detail.product?.name || ''}"`,
                    detail.quantity,
                    detail.price.toFixed(2),
                    (detail.quantity * detail.price).toFixed(2),
                    sale.total.toFixed(2)
                ]);
            });
        });

        const csvContent = [
            headers.join(";"),
            ...rows.map(e => e.join(";"))
        ].join("\n");

        const filename = `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.csv`;
        const finalContent = "\ufeff" + csvContent;

        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_csv) {
            window.pywebview.api.save_csv(filename, finalContent).then((success) => {
                if (success) toast.success("Exportado correctamente a CSV");
            });
        } else {
            const blob = new Blob([finalContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative">

            {/* ===== MODAL DETALLE DE VENTA ===== */}
            {selectedSale && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={() => setSelectedSale(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex items-center justify-between"
                            style={{ background: `linear-gradient(to right, var(--color-primary-dark), var(--color-primary))` }}>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>Detalle de Venta</p>
                                <h2 className="text-white text-xl font-black tracking-tight">
                                    TKT-{String(selectedSale.id).padStart(5, '0')}
                                </h2>
                                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                    {new Date(selectedSale.date).toLocaleString()} &bull; {(selectedSale.payment_method || 'efectivo').toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="text-white/70 hover:text-white transition rounded-lg p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Product list */}
                        <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
                            {selectedSale.details.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Sin productos registrados</p>
                                </div>
                            ) : (
                                selectedSale.details.map((item, idx) => (
                                    <div key={item.id || idx} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                {item.product?.name || `Producto ID: ${item.product_id}`}
                                            </p>
                                            {item.barcode?.code && (
                                                <p className="text-xs text-slate-400 font-mono">
                                                    Lote: {item.barcode.code}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-slate-700">
                                                {currencySymbol} {(item.price * item.quantity).toFixed(2)}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {item.quantity} × {currencySymbol} {item.price.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Total */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total</span>
                            <span className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>
                                {currencySymbol} {selectedSale.total.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Historial de Ventas</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Revisa, filtra y exporta las transacciones de tu sucursal.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3">
                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                            <DollarSign className="w-5 h-5"/>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ingresos (Filtro)</p>
                            <p className="font-black text-slate-800 text-lg">{currencySymbol} {totalRevenue.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 hidden md:flex">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                            <ListOrdered className="w-5 h-5"/>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Ventas</p>
                            <p className="font-black text-slate-800 text-lg">{filteredSales.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    
                    {/* Filtros */}
                    <div className="p-5 border-b border-gray-100 bg-slate-50/50 rounded-t-xl flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Desde</label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-36"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Hasta</label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-36"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Método Pago</label>
                            <select 
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-40 bg-white"
                            >
                                <option value="">Todos</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="yape">Yape/Plin</option>
                                <option value="tarjeta_credito">Tarjeta</option>
                            </select>
                        </div>
                        
                        <div className="flex gap-2 ml-auto">
                            <button onClick={handleFilter}
                                className="text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2"
                                style={{ backgroundColor: 'var(--color-primary)' }}>
                                <Filter className="w-4 h-4"/> Filtrar
                            </button>
                            <button onClick={handleClearFilters} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition">
                                Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Tabla de Resultados */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-gray-600 text-xs uppercase font-bold border-b border-gray-200">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">Fecha y Hora</th>
                                    <th className="p-4">Usuario / Caja</th>
                                    <th className="p-4 text-center">Comprobante</th>
                                    <th className="p-4 text-center">Metodo Pago</th>
                                    <th className="p-4 text-right">Total</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
                                                style={{ borderColor: 'var(--color-primary)' }}></div>
                                            <p className="text-gray-500">Cargando historial...</p>
                                        </td>
                                    </tr>
                                ) : filteredSales.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-gray-400 bg-white">
                                            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                                            <p className="font-medium text-gray-500">No hay ventas registradas o que coincidan con el filtro.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSales.slice().reverse().map((sale) => (
                                        <tr key={sale.id} className="hover:bg-slate-50 transition group">
                                            <td className="p-4 text-sm font-medium text-slate-700">
                                                {new Date(sale.date).toLocaleDateString()}
                                                <span className="block text-xs text-slate-400 font-normal">{new Date(sale.date).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                Usuario POS
                                            </td>

                                            <td className="p-4 text-center">
                                                <span className="inline-block px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-600">
                                                    TKT-{String(sale.id).padStart(5, '0')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                                    sale.payment_method === 'efectivo' ? 'bg-emerald-100 text-emerald-700' : 
                                                    sale.payment_method === 'yape' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {(sale.payment_method || 'efectivo').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-black text-emerald-600 text-base">
                                                {currencySymbol} {sale.total.toFixed(2)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedSale(sale)}
                                                        className="w-8 h-8 flex items-center justify-center bg-white text-slate-600 rounded-lg border border-slate-200 transition shadow-sm"
                                                        style={{ '--hover-bg': 'var(--color-primary-bg)' }}
                                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary-bg)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}
                                                        title="Ver detalle del ticket"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {projectDetails?.print_receipt !== false && (
                                                        <button
                                                            onClick={() => handlePrintTicket(sale)}
                                                            className="w-8 h-8 flex items-center justify-center bg-white text-slate-600 rounded-lg hover:bg-slate-100 hover:text-blue-600 border border-slate-200 transition shadow-sm"
                                                            title="Imprimir Ticket"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    
                                                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                                        confirmDeleteSaleId === sale.id ? (
                                                            <div className="flex gap-1 items-center bg-red-50 p-1 rounded-lg border border-red-200 absolute right-16">
                                                                <button onClick={() => handleDeleteSale(sale.id)} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded shadow-sm">Confirmar</button>
                                                                <button onClick={() => setConfirmDeleteSaleId(null)} className="px-2 py-1 bg-white text-slate-600 text-[10px] font-bold rounded shadow-sm border border-slate-200">Cancelar</button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setConfirmDeleteSaleId(sale.id)}
                                                                className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 border border-slate-200 transition shadow-sm"
                                                                title="Anular Venta"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Botonera de Exportación inferior */}
                    {filteredSales.length > 0 && (
                        <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                            <button
                                onClick={exportToCSV}
                                className="flex items-center justify-center gap-2 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition text-sm"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                                <Download className="w-4 h-4" /> Exportar a CSV (Excel)
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default History;
