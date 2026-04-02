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
            if (promo.start_date <= today && promo.end_date >= today) {
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

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        if (projectDetails?.status !== 'active' && user.role !== 'superadmin') {
            toast.error("No puedes procesar ventas. La sucursal está desactivada.");
            return;
        }

        try {
            const payload = {
                project_id: activeProject,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    barcode_id: item.barcode_id,
                    quantity: item.quantity,
                    price: item.price
                })),
                payment_method: paymentMethod
            };

            await api.post('/sales/', payload);
            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 3000);
            setCart([]);
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
                        <div key={item.uniqueId} className="flex flex-col border p-3 rounded-lg bg-gray-50 hover:bg-white transition relative overflow-hidden">
                            {item.has_discount && <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[9px] font-bold px-2 py-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Promoción Aplicada</div>}

                            <div className="flex justify-between items-start mb-2 pr-20">
                                <span className="font-bold text-gray-800">{item.name}</span>
                            </div>

                            <div className="flex justify-between items-center mt-1">
                                <span className="font-black text-blue-600 text-lg">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
                                <div className="flex items-center gap-2 bg-white rounded-lg border p-1 shadow-sm">
                                    <button onClick={() => updateQuantity(item.uniqueId, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-gray-700">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.uniqueId, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                                        <Plus className="w-4 h-4" />
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
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-lg font-medium text-gray-600">Total a Pagar</span>
                        <span className="text-3xl font-black text-gray-800">{currencySymbol} {calculateTotal()}</span>
                    </div>
                    {(projectDetails?.status === 'suspended' && user.role !== 'superadmin') ? (
                        <div className="w-full bg-red-100 text-red-700 p-4 rounded-xl text-center font-bold">
                            Servicio Suspendido. Comuníquese con Soporte para Reactivar el Punto de Venta.
                        </div>
                    ) : (
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0}
                            className={`w-full py-3 xl:py-4 text-white text-base xl:text-lg font-bold rounded-xl flex items-center justify-center gap-2 transition ${cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}
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
                                <div key={item.uniqueId} className="flex flex-col border p-3 rounded-lg bg-gray-50 relative overflow-hidden">
                                    {item.has_discount && <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[9px] font-bold px-2 py-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Promoción</div>}

                                    <div className="flex justify-between items-start mb-2 pr-16">
                                        <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                                    </div>

                                    <div className="flex justify-between items-center mt-1">
                                        <span className="font-black text-blue-600 text-base">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
                                        <div className="flex items-center gap-1 bg-white rounded border p-1">
                                            <button onClick={() => updateQuantity(item.uniqueId, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-6 text-center font-bold text-gray-700 text-sm">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.uniqueId, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                                                <Plus className="w-3 h-3" />
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
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-medium text-gray-600">Total</span>
                                <span className="text-2xl font-black text-gray-800">{currencySymbol} {calculateTotal()}</span>
                            </div>
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
                                    disabled={cart.length === 0}
                                    className={`w-full py-3 text-white text-base font-bold rounded-lg flex items-center justify-center gap-2 transition ${cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
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
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POS;
