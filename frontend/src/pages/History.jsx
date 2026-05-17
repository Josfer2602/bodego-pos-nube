import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Calendar, DollarSign, ListOrdered, ShoppingBag, Trash2, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';

const History = () => {
    const { user, activeProject, projectDetails } = useAuth();
    const [salesList, setSalesList] = useState([]);

    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';
    const [loading, setLoading] = useState(true);
    const [confirmDeleteSaleId, setConfirmDeleteSaleId] = useState(null);

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
        try {
            await api.delete(`/sales/${saleId}`);
            alert("Venta anulada y stock restaurado.");
            setConfirmDeleteSaleId(null);
            fetchSales(); // Recargar lista
        } catch (error) {
            alert(error.response?.data?.detail || "Error al anular venta");
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
                <div class="text-center bold header">${projectDetails?.name || 'VENTAS YA'}</div>
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
        if (salesList.length === 0) return;

        // Cabeceras del reporte detallado para contabilidad
        const headers = [
            "ID Venta",
            "Fecha y Hora",
            "Metodo de Pago",
            "ID Producto",
            "Cantidad",
            "Precio Unitario",
            "Total Item",
            "Total Venta"
        ];

        // Construir filas
        const rows = [];
        salesList.forEach(sale => {
            const formattedDate = new Date(sale.date).toLocaleString();
            sale.details.forEach(detail => {
                rows.push([
                    sale.id,
                    `"${formattedDate}"`,
                    `"${sale.payment_method || 'efectivo'}"`,
                    detail.product_id,
                    detail.quantity,
                    detail.price.toFixed(2),
                    (detail.quantity * detail.price).toFixed(2),
                    sale.total.toFixed(2)
                ]);
            });
        });

        // Combinar cabeceras y filas con formato CSV (usando punto y coma como separador común en Excel en español)
        const csvContent = [
            headers.join(";"),
            ...rows.map(e => e.join(";"))
        ].join("\n");

        // Añadir BOM (Byte Order Mark) UTF-8 para que Excel lo abra con los caracteres correctos (acentos, símbolos, etc.)
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Reporte_Ventas_Contable_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalRevenue = salesList.reduce((sum, sale) => sum + sale.total, 0);

    return (
        <div className="p-4 md:p-8 w-full h-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Historial de Ventas</h2>
                    <p className="text-slate-500 text-sm mt-1">Revisa todas las transacciones realizadas.</p>
                </div>
                {salesList.length > 0 && (
                    <button
                        onClick={exportToCSV}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-[0.98] text-sm self-start sm:self-center"
                    >
                        <Download className="w-5 h-5" /> Exportar a Excel (CSV)
                    </button>
                )}
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
                                        {projectDetails?.print_receipt !== false && (
                                            <button
                                                onClick={() => handlePrintTicket(sale)}
                                                className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl shadow-sm border border-slate-200 active:bg-slate-300 transition-colors"
                                                title="Imprimir Ticket de Venta"
                                            >
                                                <Printer className="w-5 h-5" />
                                            </button>
                                        )}
                                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                            confirmDeleteSaleId === sale.id ? (
                                                <div className="flex gap-2 items-center bg-red-50 p-1.5 rounded-xl border border-red-200">
                                                    <span className="text-xs text-red-600 font-medium px-2">¿Anular?</span>
                                                    <button onClick={() => handleDeleteSale(sale.id)} className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm">Sí, anular</button>
                                                    <button onClick={() => setConfirmDeleteSaleId(null)} className="px-3 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg shadow-sm border border-slate-200">Cancelar</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteSaleId(sale.id)}
                                                    className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-600 rounded-xl shadow-sm border border-red-100 active:bg-red-100 transition-colors"
                                                    title="Anular Venta (Restaura Stock)"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-slate-600 mb-3 px-1">Artículos vendidos ({sale.details.length}):</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {sale.details.map(item => (
                                            <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-700 block mb-1">
                                                        {item.product?.name || `ID Producto: ${item.product_id}`}
                                                    </span>
                                                    <p className="font-medium text-slate-500 text-xs">{item.quantity} x {currencySymbol} {(item.price).toFixed(2)}</p>
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
