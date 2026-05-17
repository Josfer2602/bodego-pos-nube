import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, Tag, X, Lock, Unlock, DollarSign, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const POS = () => {
    const { activeProject, projectDetails, user } = useAuth();
    const [products, setProducts] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false); // Para mobile: mostrar/ocultar carrito
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('efectivo'); // 'efectivo', 'yape', 'tarjeta_credito'
    const [amountReceived, setAmountReceived] = useState(''); // Monto recibido para vuelto
    const [lastCompletedSale, setLastCompletedSale] = useState(null);

    const searchInputRef = React.useRef(null);

    // Cash Session States
    const [cashSession, setCashSession] = useState(null);
    const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
    const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
    const [initialCash, setInitialCash] = useState('');
    const [sessionSummary, setSessionSummary] = useState(null);
    const [actuals, setActuals] = useState({ efectivo: '', tarjeta: '', transferencia: '' });

    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';

    useEffect(() => {
        if (activeProject) {
            fetchProducts();
            fetchPromotions();
            fetchCurrentSession();
        }
    }, [activeProject]);

    // Autocargar foco del buscador y escuchar atajos globales
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }

        const handleGlobalKeyDown = (e) => {
            // Si el usuario está escribiendo en algún input/textarea que no sea el buscador, no interferimos
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    setSearchQuery('');
                    document.activeElement.blur();
                }
                return;
            }

            // F8 para realizar cobro directo si hay elementos en el carrito
            if (e.key === 'F8') {
                e.preventDefault();
                if (cart.length > 0) {
                    handleCheckout();
                } else {
                    toast.error("El carrito está vacío");
                }
            }

            // F9 para imprimir el ticket de la última venta
            if (e.key === 'F9') {
                e.preventDefault();
                if (lastCompletedSale) {
                    handlePrintTicket(lastCompletedSale);
                } else {
                    toast.error("No hay ninguna venta reciente para imprimir");
                }
            }

            // F2 o cualquier caracter alfanumérico enfoca el buscador instantáneamente
            if (e.key === 'F2') {
                e.preventDefault();
                if (searchInputRef.current) searchInputRef.current.focus();
            } else if (e.key === 'Escape') {
                setCart([]);
                toast.info("Carrito limpiado");
            } else if (/^[a-zA-Z0-9ñÑ]$/.test(e.key)) {
                // Enfocar el buscador al comenzar a escribir si no hay inputs activos
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [cart, paymentMethod, lastCompletedSale]);

    const handlePrintTicket = (saleData) => {
        if (!saleData) return;

        // Si la sucursal tiene deshabilitada la impresión, no hacemos nada (o mostramos alerta suave)
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
        
        // Formatear logo
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
                <div class="metadata"><b>Fecha:</b> ${new Date().toLocaleString()}</div>
                <div class="metadata"><b>Pago:</b> ${saleData.paymentMethod.toUpperCase()}</div>
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
                        ${saleData.items.map(item => `
                            <tr>
                                <td style="font-size: ${isNarrow ? '8px' : '11px'};">${item.name}</td>
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
                        <td style="text-align: right; width: 40%; font-size: ${isNarrow ? '9px' : '12px'}; font-weight: bold;">${currencySymbol} ${saleData.total.toFixed(2)}</td>
                    </tr>
                    ${saleData.paymentMethod === 'efectivo' ? `
                    <tr>
                        <td style="font-size: ${isNarrow ? '8px' : '11px'};">Monto Recibido:</td>
                        <td style="text-align: right; font-size: ${isNarrow ? '8px' : '11px'};">${currencySymbol} ${saleData.amountReceived.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td class="bold" style="font-size: ${isNarrow ? '8px' : '11px'};">Vuelto:</td>
                        <td style="text-align: right; font-size: ${isNarrow ? '8px' : '11px'}; font-weight: bold;">${currencySymbol} ${saleData.changeAmount.toFixed(2)}</td>
                    </tr>
                    ` : ''}
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

    const fetchCurrentSession = async () => {
        try {
            const resp = await api.get(`/cash/current?project_id=${activeProject}`);
            setCashSession(resp.data);
            setShowOpenSessionModal(false);
        } catch (error) {
            if (error.response?.status === 404) {
                setCashSession(null);
                setShowOpenSessionModal(true); // Exigir apertura
            }
        }
    };

    const handleOpenSession = async (e) => {
        e.preventDefault();
        try {
            await api.post('/cash/open', {
                project_id: activeProject,
                initial_cash: parseFloat(initialCash) || 0
            });
            fetchCurrentSession();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error al abrir la caja");
        }
    };

    const fetchSessionSummary = async () => {
        try {
            const resp = await api.get(`/cash/${cashSession.id}/summary`);
            setSessionSummary(resp.data);
            setActuals({
                efectivo: resp.data.expected_cash,
                tarjeta: resp.data.expected_card,
                transferencia: resp.data.expected_transfer
            }); // Autocompletar por defecto para facilidad (el usuario puede editarlo)
            setShowCloseSessionModal(true);
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error obteniendo resumen de caja");
        }
    };

    const handleCloseSession = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/cash/close/${cashSession.id}`, {
                actual_cash: parseFloat(actuals.efectivo) || 0,
                actual_card: parseFloat(actuals.tarjeta) || 0,
                actual_transfer: parseFloat(actuals.transferencia) || 0
            });
            toast.success("¡Turno de caja cerrado exitosamente!");
            setShowCloseSessionModal(false);
            setCashSession(null);
            setShowOpenSessionModal(true); // Volver a exigir apertura
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error al cerrar la caja");
        }
    };

    const fetchProducts = async () => {
        try {
            // Cache busting con timestamp
            const response = await api.get('/products/', {
                params: {
                    project_id: activeProject,
                    _t: new Date().getTime()
                }
            });
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPromotions = async () => {
        try {
            const response = await api.get(`/promotions/${activeProject}`);
            setPromotions(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    // Motor de cálculo de precio frontend idéntico al Backend
    const getFinalPrice = (product) => {
        let maxDiscount = 0;
        const today = new Date().toISOString().split('T')[0];

        promotions.forEach(promo => {
            if (promo.start_date <= today && promo.end_date >= today && (!promo.promo_type || promo.promo_type === 'simple')) {
                // Si este producto está en la lista de promocionados
                if (promo.products.some(p => p.id === product.id)) {
                    if (promo.discount_percentage > maxDiscount) {
                        maxDiscount = promo.discount_percentage;
                    }
                }
            }
        });

        if (maxDiscount > 0) {
            const finalPrice = product.price * (1 - (maxDiscount / 100));
            return { hasDiscount: true, original: product.price, current: finalPrice, percentage: maxDiscount };
        }

        return { hasDiscount: false, current: product.price };
    };

    const addToCart = (product, specificBarcode = null) => {
        const itemInfo = getFinalPrice(product);
        const uniqueId = specificBarcode ? `${product.id}-${specificBarcode.id}` : `${product.id}-general`;
        const cartItem = cart.find(item => item.uniqueId === uniqueId);

        let availableStock = specificBarcode ? specificBarcode.stock : product.stock;

        if (cartItem) {
            if (cartItem.quantity + 1 > availableStock) {
                toast.warning(`Solo quedan ${availableStock} unidades de ${specificBarcode ? 'este lote' : product.name}`);
                return;
            }
            const updatedCart = cart.map(item =>
                item.uniqueId === uniqueId
                    ? { ...item, quantity: item.quantity + 1, price: itemInfo.current }
                    : item
            );
            setCart(updatedCart);
        } else {
            if (availableStock < 1) {
                toast.error(`No hay stock disponible`);
                return;
            }
            setCart([...cart, {
                uniqueId,
                product_id: product.id,
                barcode_id: specificBarcode ? specificBarcode.id : null,
                name: specificBarcode ? `${product.name} (Lte: ${specificBarcode.code})` : product.name,
                price: itemInfo.current,
                original_price: itemInfo.original,
                has_discount: itemInfo.hasDiscount,
                quantity: 1,
                stock: availableStock
            }]);
        }
    };

    const updateQuantity = (uniqueId, delta) => {
        const item = cart.find(i => i.uniqueId === uniqueId);
        if (!item) return;

        const newQuantity = item.quantity + delta;
        if (newQuantity < 1) {
            removeFromCart(uniqueId);
            return;
        }
        if (newQuantity > item.stock) {
            toast.warning(`Stock máximo alcanzado (${item.stock})`);
            return;
        }

        const updatedCart = cart.map(i =>
            i.uniqueId === uniqueId ? { ...i, quantity: newQuantity } : i
        );
        setCart(updatedCart);
    };

    const removeFromCart = (uniqueId) => {
        setCart(cart.filter(item => item.uniqueId !== uniqueId));
    };

    const getCartAnalysis = () => {
        let subtotal = 0;
        let discountDetails = [];
        let finalItems = cart.map(item => ({ ...item, discountedPrice: item.price }));
        const today = new Date().toISOString().split('T')[0];

        // 1. Calcular subtotal inicial (con descuentos simples ya aplicados)
        subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // 2. Filtrar promociones activas
        const activePromos = promotions.filter(promo => promo.start_date <= today && promo.end_date >= today);

        // PROCESAR MIX & MATCH
        const mixMatchPromos = activePromos.filter(promo => promo.promo_type === 'mix_match');
        mixMatchPromos.forEach(promo => {
            const promoProductIds = promo.products.map(p => p.id);
            const eligibleCartItems = finalItems.filter(item => promoProductIds.includes(item.product_id));
            const totalQty = eligibleCartItems.reduce((sum, item) => sum + item.quantity, 0);

            const minQty = promo.mix_match_qty || 2;
            if (totalQty >= minQty) {
                let savedAmount = 0;
                eligibleCartItems.forEach(item => {
                    const originalPrice = item.price;
                    const discounted = originalPrice * (1 - (promo.discount_percentage / 100));
                    savedAmount += (originalPrice - discounted) * item.quantity;
                    item.discountedPrice = discounted;
                });
                if (savedAmount > 0) {
                    discountDetails.push({
                        name: `Mix & Match: ${promo.name} (-${promo.discount_percentage}%)`,
                        amount: savedAmount
                    });
                }
            }
        });

        // PROCESAR COMBOS
        const comboPromos = activePromos.filter(promo => promo.promo_type === 'combo');
        comboPromos.forEach(promo => {
            const promoProductIds = promo.products.map(p => p.id);
            const comboCartItems = finalItems.filter(item => promoProductIds.includes(item.product_id));

            // Si todos los productos que forman el combo están en el carrito
            if (comboCartItems.length === promoProductIds.length && promoProductIds.length > 0) {
                // Cantidad de combos completados
                const maxCombos = Math.min(...comboCartItems.map(item => item.quantity));
                
                if (maxCombos > 0) {
                    const normalPriceOfOneCombo = comboCartItems.reduce((sum, item) => sum + item.price, 0);
                    const promotionalPrice = promo.combo_price || 0;
                    
                    if (normalPriceOfOneCombo > promotionalPrice) {
                        const savedPerCombo = normalPriceOfOneCombo - promotionalPrice;
                        const totalSaved = savedPerCombo * maxCombos;

                        // Distribuir el descuento de manera proporcional a cada unidad
                        comboCartItems.forEach(item => {
                            const ratio = item.price / normalPriceOfOneCombo;
                            const discountPerUnit = (normalPriceOfOneCombo - promotionalPrice) * ratio;
                            item.discountedPrice = Math.max(0, item.price - discountPerUnit);
                        });

                        discountDetails.push({
                            name: `Combo: ${promo.name} (x${maxCombos})`,
                            amount: totalSaved
                        });
                    }
                }
            }
        });

        const totalDiscount = discountDetails.reduce((sum, d) => sum + d.amount, 0);
        const finalTotal = Math.max(0, subtotal - totalDiscount);

        return {
            subtotal,
            discountDetails,
            totalDiscount,
            finalTotal,
            finalItems
        };
    };

    const calculateTotal = () => {
        return getCartAnalysis().finalTotal.toFixed(2);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        if (projectDetails?.status !== 'active' && user.role !== 'superadmin') {
            toast.error("No puedes procesar ventas. La sucursal está desactivada.");
            return;
        }

        try {
            const analysis = getCartAnalysis();
            const payload = {
                project_id: activeProject,
                items: analysis.finalItems.map(item => ({
                    product_id: item.product_id,
                    barcode_id: item.barcode_id,
                    quantity: item.quantity,
                    price: item.discountedPrice
                })),
                payment_method: paymentMethod
            };

            await api.post('/sales/', payload);
            
            // Respaldar datos para impresión de ticket
            setLastCompletedSale({
                items: analysis.finalItems.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.discountedPrice
                })),
                total: analysis.finalTotal,
                paymentMethod: paymentMethod,
                amountReceived: receivedAmountNum,
                changeAmount: Math.max(0, receivedAmountNum - analysis.finalTotal)
            });

            setShowSuccessModal(true);
            setCart([]);
            setAmountReceived('');
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error al procesar la venta");
        }
    };

    // Auto-add product when barcode exactly matches
    useEffect(() => {
        if (!searchQuery.trim()) return;
        const searchLower = searchQuery.toLowerCase().trim();
        for (const product of products) {
            const matchedBarcode = product.barcodes?.find(bc => bc.code.toLowerCase() === searchLower);
            if (matchedBarcode) {
                addToCart(product, matchedBarcode);
                setSearchQuery('');
                return;
            }
        }
    }, [searchQuery, products]);

    const filteredProducts = products.filter(product => {
        const searchLower = searchQuery.toLowerCase();
        const barcodesMatch = product.barcodes?.some(bc => bc.code.toLowerCase().includes(searchLower));
        return product.name.toLowerCase().includes(searchLower) || barcodesMatch;
    });

    const isProductExpired = (product) => {
        if (!product.expiration_date) return false;
        const today = new Date();
        const expDate = new Date(product.expiration_date);
        return expDate.getTime() < today.getTime();
    };

    const cartTotal = parseFloat(calculateTotal() || 0);
    const receivedAmountNum = parseFloat(amountReceived) || 0;
    const changeAmount = Math.max(0, receivedAmountNum - cartTotal);
    const isCheckoutDisabled = cart.length === 0 || (paymentMethod === 'efectivo' && receivedAmountNum < cartTotal);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden relative">
            {/* Overlay Apertura de Caja */}
            {showOpenSessionModal && (
                <div className="absolute inset-0 z-50 bg-gray-900/60 flex items-center justify-center backdrop-blur-md">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-white/20">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Caja Cerrada</h2>
                        <p className="text-gray-500 mb-6 text-sm">Para iniciar a cobrar, debes abrir un turno de caja ingresando tu fondo de sencillo inicial.</p>
                        <form onSubmit={handleOpenSession} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 text-left mb-1">Monto Inicial de Caja ({currencySymbol})</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    required
                                    className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none text-lg font-bold text-center"
                                    value={initialCash}
                                    onChange={(e) => setInitialCash(e.target.value)}
                                    placeholder="Ej. 50.00"
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2">
                                <Unlock className="w-5 h-5"/> Abrir Turno
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Cierre de Caja */}
            {showCloseSessionModal && sessionSummary && (
                <div className="absolute inset-0 z-50 bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/20">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Wallet className="text-blue-600"/> Cierre de Caja
                            </h2>
                            <button onClick={() => setShowCloseSessionModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCloseSession} className="p-6">
                            <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-blue-600 font-semibold mb-1">Caja Inicial / Sencillo</p>
                                    <p className="text-xl font-bold text-blue-900">{currencySymbol} {sessionSummary.initial_cash.toFixed(2)}</p>
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-500 mb-4 font-semibold uppercase tracking-wider">Cuadre Físico vs Sistema</p>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 rounded-lg border">
                                    <div>
                                        <p className="font-bold text-gray-700">Efectivo 💵</p>
                                        <p className="text-xs text-gray-500">Esperado: {currencySymbol} {sessionSummary.expected_cash.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <input type="number" step="0.01" required value={actuals.efectivo} onChange={e => setActuals({...actuals, efectivo: e.target.value})} className="w-full border p-2 rounded text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 rounded-lg border">
                                    <div>
                                        <p className="font-bold text-gray-700">Tarjeta 💳</p>
                                        <p className="text-xs text-gray-500">Esperado: {currencySymbol} {sessionSummary.expected_card.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <input type="number" step="0.01" value={actuals.tarjeta} onChange={e => setActuals({...actuals, tarjeta: e.target.value})} className="w-full border p-2 rounded text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 rounded-lg border">
                                    <div>
                                        <p className="font-bold text-gray-700">Transferencia 📱</p>
                                        <p className="text-xs text-gray-500">Esperado: {currencySymbol} {sessionSummary.expected_transfer.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <input type="number" step="0.01" value={actuals.transferencia} onChange={e => setActuals({...actuals, transferencia: e.target.value})} className="w-full border p-2 rounded text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full mt-6 py-3 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition shadow-lg">Confirmar y Cerrar Caja</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Products / Left Panel - Full width on mobile, 2/3 on desktop */}
            <div className="flex-1 md:flex-[2] flex flex-col bg-white shadow-lg my-2 mx-2 xl:my-4 xl:mx-4 rounded-xl border border-gray-100 p-3 xl:p-6 overflow-hidden h-[calc(100vh-1rem)] xl:h-[calc(100vh-2rem)]">
                {/* Mobile cart toggle button */}
                <div className="md:hidden flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Caja Registradora</h2>
                    <div className="flex gap-2">
                        {cashSession && (
                            <button onClick={fetchSessionSummary} className="bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Cerrar Caja</button>
                        )}
                        <button
                            onClick={() => setShowCart(true)}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-lg"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            ({cart.length})
                        </button>
                    </div>
                </div>

                {/* Desktop header */}
                <div className="hidden md:flex justify-between items-center mb-4 xl:mb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">Caja Registradora</h2>
                        {cashSession && (
                            <button onClick={fetchSessionSummary} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 transition">
                                <Lock className="w-4 h-4"/> Cerrar Caja
                            </button>
                        )}
                    </div>
                    <div className="relative w-64">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    </div>
                </div>

                {/* Mobile search */}
                <div className="md:hidden mb-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 xl:gap-4">
                        {loading && Array.from({length: 12}).map((_, i) => (
                            <div key={i} className="border border-gray-100 rounded-xl p-4 bg-white/60 animate-pulse h-[120px] xl:h-[140px] flex flex-col justify-between shadow-sm">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="flex justify-between items-end mt-4">
                                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                                </div>
                            </div>
                        ))}
                        {!loading && filteredProducts.map((product) => {
                            const pricing = getFinalPrice(product);
                            return (
                                <div
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className={`relative border rounded-lg xl:rounded-xl p-2 xl:p-4 cursor-pointer flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-xl ${product.stock === 0 ? 'opacity-50 grayscale bg-gray-50' : 'bg-white hover:border-blue-400'}`}
                                >
                                    {pricing.hasDiscount && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm flex items-center gap-1 z-10">
                                            <Tag className="w-3 h-3" /> -{pricing.percentage}%
                                        </div>
                                    )}
                                    {isProductExpired(product) && (
                                        <div className="absolute -top-1 -left-1 bg-orange-600 text-white font-black px-1.5 py-0.5 rounded shadow-sm z-10 text-[9px]">
                                            VENCIDO
                                        </div>
                                    )}

                                    <h3 className="font-bold text-gray-800 text-sm xl:text-lg mb-1 leading-tight flex-1 pr-6">{product.name}</h3>

                                    <div className="mt-2 flex flex-col justify-end">
                                        {pricing.hasDiscount && (
                                            <span className="text-xs text-gray-400 line-through font-medium leading-none mb-1">
                                                {currencySymbol} {pricing.original.toFixed(2)}
                                            </span>
                                        )}
                                        <span className="text-green-600 font-black text-lg xl:text-xl leading-none">{currencySymbol} {pricing.current.toFixed(2)}</span>
                                    </div>

                                    <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                                        <span className="bg-gray-100 px-2 py-1 rounded font-medium">Stock: {product.stock}</span>
                                    </div>
                                </div>
                            )
                        })}
                        {filteredProducts.length === 0 && !loading && (
                            <div className="col-span-full p-16 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-2xl mt-4">
                                <Search className="w-16 h-16 text-gray-300 mb-4" />
                                <span className="font-medium text-lg text-gray-500">No encontramos productos</span>
                                <span className="text-sm">Intenta con otro término de búsqueda o código de barras.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cart / Right Panel - Hidden on mobile, shown as modal */}
            <div className="hidden md:flex w-1/3 min-w-[300px] xl:min-w-[350px] bg-white my-2 mr-2 xl:my-4 xl:mr-4 rounded-xl shadow-lg border border-gray-100 flex-col p-3 xl:p-6 overflow-hidden h-[calc(100vh-1rem)] xl:h-[calc(100vh-2rem)]">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-4 flex items-center gap-2">
                    <ShoppingCart className="text-blue-600 w-6 h-6" /> Ticket de Venta
                </h2>

                <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-3">
                    {cart.map((item) => (
                        <div key={item.uniqueId} className="flex flex-col border p-3 rounded-lg bg-gray-50 hover:bg-white transition relative overflow-hidden animate-slide-in-right">
                            {item.has_discount && <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[9px] font-bold px-2 py-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Promoción Aplicada</div>}

                            <div className="flex justify-between items-start mb-2 pr-20">
                                <span className="font-bold text-gray-800">{item.name}</span>
                            </div>

                            <div className="flex justify-between items-center mt-1">
                                <span className="font-black text-blue-600 text-lg">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
                                <div className="flex items-center gap-2 bg-white rounded-lg border p-1 shadow-sm">
                                    <button onClick={() => updateQuantity(item.uniqueId, -1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 active:scale-95 transition-transform">
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-gray-700">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.uniqueId, 1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 active:scale-95 transition-transform">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-2 text-xs text-gray-400">
                                {currencySymbol} {(item.price).toFixed(2)} / unidad
                                {item.has_discount && <span className="text-red-400 font-bold ml-1 line-through border-l border-gray-300 pl-1">{item.original_price.toFixed(2)} full</span>}
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center px-8 text-center border-2 border-dashed border-gray-200 rounded-xl m-2 bg-gray-50/50">
                            <ShoppingCart className="w-16 h-16 text-gray-300 mb-4 opacity-70" />
                            <p className="text-gray-400 font-medium text-sm">Tu carrito está vacío.<br/>Selecciona productos para agregarlos.</p>
                        </div>
                    )}
                </div>

                <div className="border-t pt-4 bg-white">
                    <div className="mb-4">
                        <span className="text-sm font-medium text-gray-600 block mb-2">Método de Pago</span>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setPaymentMethod('efectivo')}
                                className={`py-2 px-1 text-sm rounded-lg font-medium transition border ${paymentMethod === 'efectivo' ? 'bg-blue-50 text-blue-600 border-blue-400' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                            >
                                Efectivo
                            </button>
                            <button
                                onClick={() => setPaymentMethod('yape')}
                                className={`py-2 px-1 text-sm rounded-lg font-medium transition border ${paymentMethod === 'yape' ? 'bg-blue-50 text-blue-600 border-blue-400' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                            >
                                Yape/Plin
                            </button>
                            <button
                                onClick={() => setPaymentMethod('tarjeta_credito')}
                                className={`py-2 px-1 text-sm rounded-lg font-medium transition border ${paymentMethod === 'tarjeta_credito' ? 'bg-blue-50 text-blue-600 border-blue-400' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                            >
                                Tarjeta
                            </button>
                        </div>
                    </div>
                    {/* Detalles del Carrito / Descuentos de combos y mix & match */}
                    {cart.length > 0 && (() => {
                        const analysis = getCartAnalysis();
                        return (
                            <div className="space-y-1.5 border-b pb-3 mb-3 text-sm">
                                <div className="flex justify-between text-gray-500">
                                    <span>Subtotal</span>
                                    <span>{currencySymbol} {analysis.subtotal.toFixed(2)}</span>
                                </div>
                                {analysis.discountDetails.map((disc, idx) => (
                                    <div key={idx} className="flex justify-between text-emerald-600 font-semibold animate-pulse">
                                        <span>{disc.name}</span>
                                        <span>-{currencySymbol} {disc.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-base font-bold text-gray-700">Total a Pagar</span>
                                    <span className="text-3xl font-black text-gray-900">{currencySymbol} {analysis.finalTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        );
                    })()}

                    {paymentMethod === 'efectivo' && cartTotal > 0 && (
                        <div className="mb-6 space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div>
                                <label className="text-sm font-medium text-gray-600 block mb-2">Monto Recibido</label>
                                <div className="flex gap-2 mb-3">
                                    <button onClick={() => setAmountReceived(cartTotal.toString())} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-transform focus:border-blue-500 focus:text-blue-700">Exacto</button>
                                    <button onClick={() => setAmountReceived('20')} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-transform focus:border-blue-500 focus:text-blue-700">20</button>
                                    <button onClick={() => setAmountReceived('50')} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-transform focus:border-blue-500 focus:text-blue-700">50</button>
                                    <button onClick={() => setAmountReceived('100')} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-transform focus:border-blue-500 focus:text-blue-700">100</button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min={cartTotal}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                <span className="text-sm font-bold text-gray-600">Vuelto</span>
                                <span className={`text-2xl font-black ${receivedAmountNum >= cartTotal ? 'text-green-600' : 'text-red-500'}`}>
                                    {currencySymbol} {changeAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {(projectDetails?.status === 'suspended' && user.role !== 'superadmin') ? (
                        <div className="w-full bg-red-100 text-red-700 p-4 rounded-xl text-center font-bold">
                            Servicio Suspendido. Comuníquese con Soporte para Reactivar el Punto de Venta.
                        </div>
                    ) : (
                        <button
                            onClick={handleCheckout}
                            disabled={isCheckoutDisabled}
                            className={`w-full py-3 xl:py-4 text-white text-base xl:text-lg font-bold rounded-xl flex items-center justify-center gap-2 transition ${isCheckoutDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg animate-subtle-pulse border border-green-400'}`}
                        >
                            <CreditCard className="w-6 h-6" /> Realizar Venta
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Cart Modal */}
            {showCart && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowCart(false)}
                    />

                    {/* Modal */}
                    <div className="relative ml-auto w-full max-w-sm bg-white h-full shadow-xl flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <ShoppingCart className="text-blue-600 w-5 h-5" /> Carrito
                            </h2>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.map((item) => (
                                <div key={item.uniqueId} className="flex flex-col border p-3 rounded-lg bg-gray-50 relative overflow-hidden animate-slide-in-right">
                                    {item.has_discount && <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[9px] font-bold px-2 py-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Promoción</div>}

                                    <div className="flex justify-between items-start mb-2 pr-16">
                                        <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                                    </div>

                                    <div className="flex justify-between items-center mt-1">
                                        <span className="font-black text-blue-600 text-base">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
                                        <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
                                            <button onClick={() => updateQuantity(item.uniqueId, -1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 active:scale-95 transition-transform">
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-6 text-center font-bold text-gray-700 text-sm">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.uniqueId, 1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 active:scale-95 transition-transform">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-1 text-xs text-gray-400">
                                        {currencySymbol} {(item.price).toFixed(2)} c/u
                                        {item.has_discount && <span className="text-red-400 font-bold ml-1 line-through">{item.original_price.toFixed(2)}</span>}
                                    </div>
                                </div>
                            ))}
                            {cart.length === 0 && (
                                <div className="h-32 flex flex-col items-center justify-center px-4 text-center border-2 border-dashed border-gray-200 rounded-xl m-4 bg-gray-50/50">
                                    <ShoppingCart className="w-8 h-8 text-gray-300 mb-2 opacity-70" />
                                    <p className="text-gray-400 font-medium text-xs">Carrito vacío</p>
                                </div>
                            )}
                        </div>

                        <div className="border-t p-4 bg-white">
                            <div className="mb-4">
                                <span className="text-sm font-medium text-gray-600 block mb-2">Método de Pago</span>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setPaymentMethod('efectivo')}
                                        className={`py-2 px-1 text-xs rounded-lg font-medium transition border ${paymentMethod === 'efectivo' ? 'bg-blue-50 text-blue-600 border-blue-400' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        Efectivo
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('yape')}
                                        className={`py-2 px-1 text-xs rounded-lg font-medium transition border ${paymentMethod === 'yape' ? 'bg-blue-50 text-blue-600 border-blue-400' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        Yape/Plin
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('tarjeta_credito')}
                                        className={`py-2 px-1 text-xs rounded-lg font-medium transition border ${paymentMethod === 'tarjeta_credito' ? 'bg-blue-50 text-blue-600 border-blue-400' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        Tarjeta
                                    </button>
                                </div>
                            </div>
                            {/* Detalles del Carrito / Descuentos de combos y mix & match */}
                            {cart.length > 0 && (() => {
                                const analysis = getCartAnalysis();
                                return (
                                    <div className="space-y-1.5 border-b pb-2.5 mb-2.5 text-xs">
                                        <div className="flex justify-between text-gray-500">
                                            <span>Subtotal</span>
                                            <span>{currencySymbol} {analysis.subtotal.toFixed(2)}</span>
                                        </div>
                                        {analysis.discountDetails.map((disc, idx) => (
                                            <div key={idx} className="flex justify-between text-emerald-600 font-semibold animate-pulse">
                                                <span>{disc.name}</span>
                                                <span>-{currencySymbol} {disc.amount.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-xs font-bold text-gray-700">Total a Pagar</span>
                                            <span className="text-2xl font-black text-gray-900">{currencySymbol} {analysis.finalTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {paymentMethod === 'efectivo' && cartTotal > 0 && (
                                <div className="mb-4 space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-2">Monto Recibido</label>
                                        <div className="flex gap-2 mb-2">
                                            <button onClick={() => setAmountReceived(cartTotal.toString())} className="flex-1 bg-white border border-gray-300 text-gray-700 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform">Exacto</button>
                                            <button onClick={() => setAmountReceived('20')} className="flex-1 bg-white border border-gray-300 text-gray-700 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform">20</button>
                                            <button onClick={() => setAmountReceived('50')} className="flex-1 bg-white border border-gray-300 text-gray-700 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform">50</button>
                                            <button onClick={() => setAmountReceived('100')} className="flex-1 bg-white border border-gray-300 text-gray-700 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform">100</button>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500 font-bold text-sm">{currencySymbol}</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min={cartTotal}
                                                className="w-full pl-8 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-base"
                                                value={amountReceived}
                                                onChange={(e) => setAmountReceived(e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                        <span className="text-xs font-bold text-gray-600">Vuelto</span>
                                        <span className={`text-xl font-black ${receivedAmountNum >= cartTotal ? 'text-green-600' : 'text-red-500'}`}>
                                            {currencySymbol} {changeAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {(projectDetails?.status === 'suspended' && user.role !== 'superadmin') ? (
                                <div className="w-full bg-red-100 text-red-700 p-3 rounded-lg text-center font-bold text-sm">
                                    Servicio suspendido
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        handleCheckout();
                                        setShowCart(false);
                                    }}
                                    disabled={isCheckoutDisabled}
                                    className={`w-full py-3 text-white text-base font-bold rounded-lg flex items-center justify-center gap-2 transition ${isCheckoutDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 animate-subtle-pulse border border-green-400'}`}
                                >
                                    <CreditCard className="w-5 h-5" /> Confirmar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md transition-opacity duration-300">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl transform scale-100 flex flex-col items-center text-center animate-[bounce_0.5s_ease-in-out_1] border border-white/20">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 mb-2">¡Venta Exitosa!</h2>
                        <p className="text-gray-500 mb-6 font-medium">El pago ha sido procesado correctamente.</p>
                        <div className="flex flex-col gap-2 w-full">
                            {projectDetails?.print_receipt !== false && (
                                <button
                                    onClick={() => handlePrintTicket(lastCompletedSale)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Imprimir Ticket (F9)
                                </button>
                            )}
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POS;
