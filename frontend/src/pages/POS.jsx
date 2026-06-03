import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, Tag, X, Lock, Unlock, DollarSign, Wallet, UserPlus, FileText, Barcode, Package, Eye, Clock } from 'lucide-react';
import { toast } from 'sonner';

const POS = () => {
    const { activeProject, projectDetails, user } = useAuth();
    const [products, setProducts] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [activeCartIndex, setActiveCartIndex] = useState(-1);
    const [selectedProductInfo, setSelectedProductInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false); // Para mobile: mostrar/ocultar carrito
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('efectivo'); // 'efectivo', 'yape', 'tarjeta_credito'
    const [amountReceived, setAmountReceived] = useState(''); // Monto recibido para vuelto
    const [lastCompletedSale, setLastCompletedSale] = useState(null);
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [recentSales, setRecentSales] = useState([]);
    const [loadingSales, setLoadingSales] = useState(false);
    
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
                return;
            }

            // Keyboard Navigation para el Carrito
            if (cart.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveCartIndex(prev => (prev < cart.length - 1 ? prev + 1 : prev));
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveCartIndex(prev => (prev > 0 ? prev - 1 : prev));
                    return;
                }

                if (activeCartIndex >= 0 && activeCartIndex < cart.length) {
                    const activeItem = cart[activeCartIndex];
                    if (e.key === '+') {
                        e.preventDefault();
                        updateQuantity(activeItem.uniqueId, 1, activeItem.stock);
                        return;
                    } else if (e.key === '-') {
                        e.preventDefault();
                        updateQuantity(activeItem.uniqueId, -1, activeItem.stock);
                        return;
                    } else if (e.key === 'Delete') {
                        e.preventDefault();
                        removeFromCart(activeItem.uniqueId);
                        setActiveCartIndex(prev => Math.min(prev, cart.length - 2));
                        return;
                    }
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
    }, [cart, paymentMethod, lastCompletedSale, activeCartIndex]);

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
                    @page { size: ${printableWidth} auto; margin: 0; }
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        width: ${printableWidth}; 
                        margin: 0 auto; 
                        padding: 0;
                        font-size: 11px;
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

    const fetchRecentSales = async () => {
        setLoadingSales(true);
        try {
            const resp = await api.get('/sales/', { params: { project_id: activeProject, limit: 50 } });
            // Mostrar las más recientes primero
            setRecentSales([...resp.data].reverse());
        } catch (error) {
            toast.error('Error al cargar las ventas recientes');
        } finally {
            setLoadingSales(false);
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
        
        setSelectedProductInfo({
            name: specificBarcode ? `${product.name} (Lote: ${specificBarcode.code})` : product.name,
            stock: availableStock
        });

        // Verificar vencimiento
        let expDate = specificBarcode ? specificBarcode.expiration_date : product.expiration_date;
        if (expDate) {
            const exp = new Date(expDate + "T00:00:00");
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (exp < today) {
                toast.error(`ATENCIÓN: ${product.name} se encuentra vencido desde ${exp.toLocaleDateString()}`);
            }
        }

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
                stock: availableStock,
                image_url: product.image_url
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

    // Lightweight Fuzzy Match
    const fuzzyMatch = (str, pattern) => {
        if (!str || !pattern) return false;
        const s = String(str).toLowerCase();
        const p = String(pattern).toLowerCase();
        if (s.includes(p)) return true;
        let pIdx = 0;
        for (let i = 0; i < s.length; i++) {
            if (s[i] === p[pIdx]) pIdx++;
            if (pIdx === p.length) return true;
        }
        return false;
    };

    const filteredProducts = products.filter(product => {
        const barcodesMatch = product.barcodes?.some(bc => fuzzyMatch(bc.code, searchQuery));
        return fuzzyMatch(product.name, searchQuery) || barcodesMatch;
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
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative">

            {/* ===== MODAL VER VENTAS RECIENTES ===== */}
            {showSalesModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowSalesModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col"
                        style={{ maxHeight: '85vh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex items-center justify-between shrink-0"
                            style={{ background: `linear-gradient(to right, var(--color-primary-dark), var(--color-primary))` }}>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>Punto de Venta</p>
                                <h2 className="text-white text-xl font-black tracking-tight">Ventas Recientes</h2>
                            </div>
                            <button
                                onClick={() => setShowSalesModal(false)}
                                className="text-white/70 hover:text-white transition rounded-lg p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1">
                            {loadingSales ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mb-3"
                                    style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}></div>
                                    <p className="text-sm">Cargando ventas...</p>
                                </div>
                            ) : recentSales.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No hay ventas registradas aún</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {recentSales.map(sale => (
                                        <div key={sale.id} className="px-6 py-4 hover:bg-slate-50 transition">
                                            {/* Sale header row */}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                                        TKT-{String(sale.id).padStart(5, '0')}
                                                    </span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        sale.payment_method === 'efectivo' ? 'bg-emerald-100 text-emerald-700' :
                                                        sale.payment_method === 'yape' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {(sale.payment_method || 'efectivo').toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        <span className="text-slate-300">·</span>
                                                        {new Date(sale.date).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-base font-black text-emerald-600">
                                                        {currencySymbol} {sale.total.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Items list */}
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {sale.details.map((item, idx) => (
                                                    <span
                                                        key={item.id || idx}
                                                        className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-600 rounded-lg px-2 py-1"
                                                    >
                                                        <Package className="w-3 h-3 text-teal-500 shrink-0" />
                                                        <span className="font-medium">{item.product?.name || `ID:${item.product_id}`}</span>
                                                        <span className="text-slate-400 font-normal">×{item.quantity}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                            <p className="text-xs text-slate-400">{recentSales.length} venta(s) encontradas</p>
                            <button
                                onClick={() => setShowSalesModal(false)}
                                className="px-4 py-2 text-white text-sm font-bold rounded-lg transition"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay Apertura de Caja */}
            {showOpenSessionModal && (
                <div className="absolute inset-0 z-50 bg-gray-900/60 flex items-center justify-center backdrop-blur-md">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-white/20">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                            style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
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
                            <button type="submit" className="w-full py-3 text-white rounded-xl font-bold text-lg transition shadow-lg flex items-center justify-center gap-2"
                                style={{ backgroundColor: 'var(--color-primary)' }}>
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
                                <Wallet style={{ color: 'var(--color-primary)' }}/> Cierre de Caja
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

            {/* Top Bar (Header) */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Ventas</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Flujo POS completo con caja, pago, facturación e impresión.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md text-sm font-medium items-center gap-2">
                        <span>{new Date().toLocaleDateString('es-ES')}</span>
                    </div>
                    {cashSession && (
                        <>
                            <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2">
                                <Unlock className="w-4 h-4"/> <span className="hidden sm:inline">Caja abierta</span>
                            </div>
                            <button onClick={fetchSessionSummary} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-bold text-sm flex items-center gap-2 transition shadow-sm">
                                <Lock className="w-4 h-4"/> <span className="hidden sm:inline">Cerrar Caja</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-2 md:p-4 gap-4">
                
                {/* Left Panel: Detalle del Cliente */}
                <div className="w-full md:w-[380px] bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0">
                    <div>


                        {/* Entrada de producto */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 font-semibold mb-1 block uppercase tracking-wide">Entrada de producto</span>
                            <p className="text-[10px] text-gray-400 mb-3">Código de barras o nombre de producto</p>
                            
                            {/* Input tipo EasyPOS */}
                            <div className="relative mb-3">
                                <Barcode className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input 
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Escanear código..."
                                    className="w-full pl-10 pr-4 py-2.5 border-2 border-teal-100 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none font-mono text-gray-700 shadow-sm transition"
                                />
                            </div>

                            <div className="relative">
                                <select 
                                    onChange={(e) => {
                                        if(e.target.value) {
                                            const [prodId, bcId] = e.target.value.split('-');
                                            const p = products.find(prod => prod.id === parseInt(prodId));
                                            if(p) {
                                                if (bcId === 'general') {
                                                    addToCart(p);
                                                } else {
                                                    const bc = p.barcodes?.find(b => b.id === parseInt(bcId));
                                                    addToCart(p, bc);
                                                }
                                            }
                                            e.target.value = "";
                                        }
                                    }}
                                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm">
                                    <option value="">Seleccione un producto o lote manualmente...</option>
                                    {products.map(p => {
                                        if (p.barcodes && p.barcodes.length > 0) {
                                            return p.barcodes.map(bc => (
                                                <option key={`${p.id}-${bc.id}`} value={`${p.id}-${bc.id}`}>
                                                    {p.name} (Lote: {bc.code}) - {currencySymbol}{p.price}
                                                </option>
                                            ));
                                        }
                                        return (
                                            <option key={`${p.id}-general`} value={`${p.id}-general`}>
                                                {p.name} - {currencySymbol}{p.price}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            
                            {/* Quick Categories/Favorites could go here, for now stock info */}
                            <div className="mt-4 flex flex-col bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                <div className="flex items-center gap-2 text-gray-600 mb-1">
                                    <Package className="w-4 h-4"/>
                                    <span className="text-xs font-bold">Stock del último producto escaneado:</span>
                                </div>
                                {selectedProductInfo ? (
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-xs text-gray-500 truncate mr-2" title={selectedProductInfo.name}>
                                            {selectedProductInfo.name}
                                        </span>
                                        <span className="text-sm font-black text-teal-600">
                                            {selectedProductInfo.stock} unds
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400">Ningún producto escaneado</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Detalle de la Venta (Cart) */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                        <div>
                            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-teal-600"/> Detalle de la venta
                            </h2>
                            <span className="text-xs text-gray-400">Mostrando {cart.length} items</span>
                        </div>
                        <span className="text-xs text-gray-400 italic hidden sm:block">Seleccione una fila para editar o eliminar.</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100 text-gray-600 text-[11px] uppercase font-bold">
                                    <tr>
                                        <th className="p-3 border-b border-gray-200">Factura / Lote</th>
                                        <th className="p-3 border-b border-gray-200">Producto</th>
                                        <th className="p-3 border-b border-gray-200 text-center">Precio C/U</th>
                                        <th className="p-3 border-b border-gray-200 text-center">Cant.</th>
                                        <th className="p-3 border-b border-gray-200 text-right">Total</th>
                                        <th className="p-3 border-b border-gray-200 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {cart.map((item, idx) => (
                                        <tr key={item.uniqueId} className={`transition group ${activeCartIndex === idx ? 'bg-teal-50 border-l-4 border-teal-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                                            <td className="p-3 text-xs font-mono text-gray-500">
                                                F001-{String(idx+1).padStart(4, '0')}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    {item.image_url ? (
                                                        <img src={`${api.defaults.baseURL.replace('/api', '')}/uploads/${item.image_url}`} alt="" className="w-8 h-8 rounded object-cover shrink-0 border border-gray-200" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                                                            style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                                                            <Package className="w-4 h-4"/>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-sm leading-tight">{item.name}</div>
                                                        {item.has_discount && <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">Oferta Aplicada</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-gray-600 font-medium text-center">
                                                {currencySymbol} {item.price.toFixed(2)}
                                                {item.has_discount && <span className="block text-[10px] text-gray-400 line-through">{currencySymbol} {item.original_price.toFixed(2)}</span>}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5 w-24 mx-auto shadow-sm">
                                                    <button onClick={() => updateQuantity(item.uniqueId, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition"><Minus className="w-3 h-3" /></button>
                                                    <span className="w-8 text-center font-bold text-gray-700 text-sm">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.uniqueId, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition"><Plus className="w-3 h-3" /></button>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-black text-sm" style={{ color: 'var(--color-primary)' }}>
                                                {currencySymbol} {(item.price * item.quantity).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => removeFromCart(item.uniqueId)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm mx-auto opacity-70 group-hover:opacity-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cart.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-gray-400 bg-white">
                                                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                                                <p className="font-medium">No hay productos en la venta actual.</p>
                                                <p className="text-xs mt-1">Utiliza el buscador o selecciona productos para agregarlos.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Totals & Actions */}
                    <div className="bg-white border-t border-gray-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-col xl:flex-row justify-between items-end gap-6">
                            
                            {/* Payment Method & Actions */}
                            <div className="flex-1 flex flex-col gap-4 w-full">

                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Método de Pago</span>
                                    <div className="flex gap-2">
                                        {['efectivo', 'yape', 'tarjeta_credito'].map(method => (
                                            <button key={method} onClick={() => setPaymentMethod(method)}
                                                className={`px-4 py-2 text-sm rounded-lg font-bold transition border shadow-sm ${paymentMethod === method ? '' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                                style={paymentMethod === method ? {
                                                    backgroundColor: 'var(--color-primary-bg)',
                                                    color: 'var(--color-primary)',
                                                    borderColor: 'var(--color-primary)',
                                                    boxShadow: '0 0 0 1px var(--color-primary)'
                                                } : {}}>
                                                {method === 'efectivo' ? 'Efectivo' : method === 'yape' ? 'Yape/Plin' : 'Tarjeta'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button disabled={isCheckoutDisabled} onClick={handleCheckout}
                                        className={`px-6 py-2.5 rounded-lg font-bold text-white flex items-center gap-2 shadow-md transition ${isCheckoutDisabled ? 'bg-gray-300 cursor-not-allowed' : ''}`}
                                        style={!isCheckoutDisabled ? { backgroundColor: 'var(--color-primary)' } : {}}>
                                        <CreditCard className="w-5 h-5"/> Pagar (F8)
                                    </button>
                                    <button onClick={() => { setShowSalesModal(true); fetchRecentSales(); }}
                                        className="text-white rounded-lg font-bold flex items-center gap-2 shadow-sm transition px-4 py-2.5"
                                        style={{ backgroundColor: 'var(--color-primary-dark)' }}>
                                        <Eye className="w-4 h-4"/> Ver Ventas
                                    </button>
                                    <button onClick={() => { setCart([]); setAmountReceived(''); }} className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm transition ml-auto">
                                        <Trash2 className="w-4 h-4"/> Limpiar
                                    </button>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="w-full xl:w-72 bg-slate-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                                {(() => {
                                    const analysis = getCartAnalysis();
                                    return (
                                        <>
                                            <div className="flex justify-between text-sm text-gray-600 mb-1.5 font-medium">
                                                <span>Subtotal:</span>
                                                <span>{currencySymbol} {analysis.subtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-600 mb-1.5 font-medium">
                                                <span>Impuestos (0%):</span>
                                                <span>{currencySymbol} 0.00</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-600 mb-3 font-medium">
                                                <span>Descuento aplicado:</span>
                                                <span className="text-red-500">-{currencySymbol} {analysis.totalDiscount.toFixed(2)}</span>
                                            </div>
                                            
                                            {paymentMethod === 'efectivo' && cart.length > 0 && (
                                                <div className="mb-3 pt-3 border-t border-gray-200">
                                                    <div className="flex justify-between items-center mb-2 text-sm">
                                                        <span className="font-bold text-gray-700">Recibido:</span>
                                                        <input 
                                                            type="number" step="0.01" min={analysis.finalTotal}
                                                            value={amountReceived}
                                                            onChange={(e) => setAmountReceived(e.target.value)}
                                                            className="w-24 text-right border border-gray-300 rounded p-1.5 font-bold text-teal-700 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="font-bold text-gray-700">Vuelto:</span>
                                                        <span className={`font-bold ${changeAmount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{currencySymbol} {changeAmount.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-3 border-t border-gray-200 mt-2 flex items-center justify-between">
                                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                        S
                                                    </div>
                                                    Precio a Pagar:
                                                </span>
                                                <span className="text-2xl font-black text-emerald-600">{currencySymbol} {analysis.finalTotal.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

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
                                    className="w-full text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                                    style={{ backgroundColor: 'var(--color-primary)' }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Imprimir Ticket (F9)
                                </button>
                            )}
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full text-white font-bold py-3 px-4 rounded-xl transition"
                                style={{ backgroundColor: 'var(--color-primary-dark)' }}
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
