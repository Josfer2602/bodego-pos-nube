import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, Tag, X } from 'lucide-react';

const POS = () => {
    const { activeProject, projectDetails, user } = useAuth();
    const [products, setProducts] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false); // Para mobile: mostrar/ocultar carrito

    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';

    useEffect(() => {
        if (activeProject) {
            fetchProducts();
            fetchPromotions();
        }
    }, [activeProject]);

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

    const addToCart = (product) => {
        const itemInfo = getFinalPrice(product);
        const cartItem = cart.find(item => item.product_id === product.id);

        if (cartItem) {
            if (cartItem.quantity + 1 > product.stock) {
                alert(`Solo quedan ${product.stock} unidades de ${product.name}`);
                return;
            }
            const updatedCart = cart.map(item =>
                item.product_id === product.id
                    ? { ...item, quantity: item.quantity + 1, price: itemInfo.current }
                    : item
            );
            setCart(updatedCart);
        } else {
            if (product.stock < 1) {
                alert(`No hay stock de ${product.name}`);
                return;
            }
            setCart([...cart, {
                product_id: product.id,
                name: product.name,
                price: itemInfo.current,
                original_price: itemInfo.original,
                has_discount: itemInfo.hasDiscount,
                quantity: 1,
                stock: product.stock
            }]);
        }
    };

    const updateQuantity = (productId, delta) => {
        const item = cart.find(i => i.product_id === productId);
        if (!item) return;

        const newQuantity = item.quantity + delta;
        if (newQuantity < 1) {
            removeFromCart(productId);
            return;
        }
        if (newQuantity > item.stock) {
            alert(`Stock máximo alcanzado (${item.stock})`);
            return;
        }

        const updatedCart = cart.map(i =>
            i.product_id === productId ? { ...i, quantity: newQuantity } : i
        );
        setCart(updatedCart);
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        if (projectDetails?.status !== 'active' && user.role !== 'superadmin') {
            alert("No puedes procesar ventas. La sucursal está desactivada.");
            return;
        }

        try {
            const payload = {
                project_id: activeProject,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            await api.post('/sales/', payload);
            alert('¡Venta realizada con éxito!');
            setCart([]);
            fetchProducts();
        } catch (error) {
            alert(error.response?.data?.detail || "Error al procesar la venta");
        }
    };

    const filteredProducts = products.filter(product => {
        const today = new Date();
        const expDate = product.expiration_date ? new Date(product.expiration_date) : null;
        let isExpired = false;
        if (expDate && expDate.getTime() < today.getTime()) {
            isExpired = true; // Excluimos alimentos expirados
        }
        return product.name.toLowerCase().includes(searchQuery.toLowerCase()) && !isExpired;
    });

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Products / Left Panel - Full width on mobile, 2/3 on desktop */}
            <div className="flex-1 md:flex-[2] flex flex-col h-full bg-white shadow-lg m-4 md:mr-2 rounded-xl border border-gray-100 p-4 md:p-6 overflow-hidden">
                {/* Mobile cart toggle button */}
                <div className="md:hidden flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Caja Registradora</h2>
                    <button
                        onClick={() => setShowCart(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        Carrito ({cart.length})
                    </button>
                </div>

                {/* Desktop header */}
                <div className="hidden md:flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Caja Registradora</h2>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                        {loading && <div className="col-span-full p-8 text-center text-gray-500 font-medium">Cargando inventario...</div>}
                        {!loading && filteredProducts.map((product) => {
                            const pricing = getFinalPrice(product);
                            return (
                                <div
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className={`relative border rounded-lg md:rounded-xl p-3 md:p-4 cursor-pointer flex flex-col transition hover:-translate-y-1 hover:shadow-lg ${product.stock === 0 ? 'opacity-50 grayscale bg-gray-50' : 'bg-white hover:border-blue-300'}`}
                                >
                                    {pricing.hasDiscount && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm flex items-center gap-1 z-10">
                                            <Tag className="w-3 h-3" /> -{pricing.percentage}%
                                        </div>
                                    )}

                                    <h3 className="font-bold text-gray-800 text-lg mb-1 leading-tight flex-1 pr-6">{product.name}</h3>

                                    <div className="mt-2 flex flex-col justify-end">
                                        {pricing.hasDiscount && (
                                            <span className="text-xs text-gray-400 line-through font-medium leading-none mb-1">
                                                {currencySymbol} {pricing.original.toFixed(2)}
                                            </span>
                                        )}
                                        <span className="text-green-600 font-black text-xl leading-none">{currencySymbol} {pricing.current.toFixed(2)}</span>
                                    </div>

                                    <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                                        <span className="bg-gray-100 px-2 py-1 rounded font-medium">Stock: {product.stock}</span>
                                    </div>
                                </div>
                            )
                        })}
                        {filteredProducts.length === 0 && !loading && (
                            <div className="col-span-full p-12 text-center text-gray-400 border-2 border-dashed rounded-xl">
                                Ningún producto válido encontrado en esta sucursal.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cart / Right Panel - Hidden on mobile, shown as modal */}
            <div className="hidden md:block w-1/3 min-w-[320px] bg-white m-4 ml-0 rounded-xl shadow-lg border border-gray-100 flex flex-col p-6 overflow-hidden">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-4 flex items-center gap-2">
                    <ShoppingCart className="text-blue-600 w-6 h-6" /> Ticket de Venta
                </h2>

                <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-3">
                    {cart.map((item) => (
                        <div key={item.product_id} className="flex flex-col border p-3 rounded-lg bg-gray-50 hover:bg-white transition relative overflow-hidden">
                            {item.has_discount && <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[9px] font-bold px-2 py-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Promoción Aplicada</div>}

                            <div className="flex justify-between items-start mb-2 pr-20">
                                <span className="font-bold text-gray-800">{item.name}</span>
                            </div>

                            <div className="flex justify-between items-center mt-1">
                                <span className="font-black text-blue-600 text-lg">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
                                <div className="flex items-center gap-2 bg-white rounded-lg border p-1 shadow-sm">
                                    <button onClick={() => updateQuantity(item.product_id, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-gray-700">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.product_id, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
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
                        <div className="h-full flex flex-col items-center justify-center opacity-50 px-8 text-center">
                            <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-gray-500">Tu carrito está vacío. Clica en los productos para agregarlos.</p>
                        </div>
                    )}
                </div>

                <div className="border-t pt-4 bg-white mt-auto">
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
                            className={`w-full py-4 text-white text-lg font-bold rounded-xl flex items-center justify-center gap-2 transition ${cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}
                        >
                            <CreditCard className="w-6 h-6" /> Confirmar e Imprimir
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
                                <div key={item.product_id} className="flex flex-col border p-3 rounded-lg bg-gray-50 relative overflow-hidden">
                                    {item.has_discount && <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[9px] font-bold px-2 py-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Promoción</div>}

                                    <div className="flex justify-between items-start mb-2 pr-16">
                                        <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                                    </div>

                                    <div className="flex justify-between items-center mt-1">
                                        <span className="font-black text-blue-600 text-base">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
                                        <div className="flex items-center gap-1 bg-white rounded border p-1">
                                            <button onClick={() => updateQuantity(item.product_id, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-6 text-center font-bold text-gray-700 text-sm">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.product_id, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
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
                                <div className="h-32 flex flex-col items-center justify-center opacity-50 text-center">
                                    <ShoppingCart className="w-12 h-12 text-gray-300 mb-2" />
                                    <p className="text-gray-500 text-sm">Carrito vacío</p>
                                </div>
                            )}
                        </div>

                        <div className="border-t p-4 bg-white">
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
        </div>
    );
};

export default POS;
