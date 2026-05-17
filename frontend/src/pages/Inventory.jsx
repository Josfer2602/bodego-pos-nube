import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Plus, Edit2, Trash2, Package, Upload, Barcode, PencilLine, Search, CheckCircle2, X, PlusCircle, ArrowUpDown, ChevronUp, ChevronDown, Loader2, Save } from 'lucide-react';

const Inventory = () => {
    const { activeProject, projectDetails } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [inputMode, setInputMode] = useState('manual'); // 'manual' | 'barcode'
    const [inventorySearch, setInventorySearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
    const fileInputRef = useRef(null);
    const barcodeInputRef = useRef(null);

    // Barcode state
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeStatus, setBarcodeStatus] = useState(null); // null | 'found' | 'not_found' | 'loading'
    const [newBarcodeCode, setNewBarcodeCode] = useState(''); // for adding barcode to existing product
    const [newBarcodeStock, setNewBarcodeStock] = useState('');
    const [newBarcodeDate, setNewBarcodeDate] = useState('');
    const [expandedProducts, setExpandedProducts] = useState({});
    const [editingBarcodeId, setEditingBarcodeId] = useState(null);
    const [editBarcodeData, setEditBarcodeData] = useState({ stock: 0, expiration_date: '' });
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null); // barcode id pending delete
    const [confirmDeleteProductId, setConfirmDeleteProductId] = useState(null); // product id pending delete

    const [formData, setFormData] = useState({
        name: '',
        cost: '',
        margin: '',
        price: '',
        stock: '',
        expiration_date: '',
        barcode: ''
    });

    const currencySymbol = projectDetails?.currency === 'USD' ? '$' : projectDetails?.currency === 'EUR' ? '€' : 'S/';

    useEffect(() => {
        if (activeProject) fetchProducts();
    }, [activeProject]);

    // Focus barcode input when switching to barcode mode
    useEffect(() => {
        if (inputMode === 'barcode' && showModal) {
            setTimeout(() => barcodeInputRef.current?.focus(), 100);
        }
    }, [inputMode, showModal]);

    const fetchProducts = async () => {
        if (!activeProject) return;
        setLoading(true);
        try {
            // Cache busting con timestamp para asegurar datos frescos
            const response = await api.get('/products/', { 
                params: { 
                    project_id: activeProject,
                    _t: new Date().getTime() 
                } 
            });
            console.log(`Fetched ${response.data.length} products for project ${activeProject}`);
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        setUploading(true);
        try {
            const response = await api.post(`/products/bulk-upload?project_id=${activeProject}`, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(response.data.message);
            fetchProducts();
        } catch (error) {
            alert(error.response?.data?.detail || 'Error al subir el archivo');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        const newForm = { ...formData, [name]: value };
        if (name === 'cost' || name === 'margin') {
            const costParsed = parseFloat(newForm.cost || 0);
            const marginParsed = parseFloat(newForm.margin || 0);
            newForm.price = (costParsed * (1 + (marginParsed / 100))).toFixed(2);
        }
        setFormData(newForm);
    };

    const handleBarcodeLookup = async () => {
        if (!barcodeInput.trim()) return;
        setBarcodeStatus('loading');
        try {
            const resp = await api.get(`/products/barcode/${encodeURIComponent(barcodeInput.trim())}`, {
                params: { project_id: activeProject }
            });
            const product = resp.data;
            // Pre-fill form with found product
            setFormData({
                name: product.name,
                cost: product.cost,
                margin: product.margin,
                price: product.price,
                stock: product.stock,
                expiration_date: product.expiration_date || ''
            });
            setEditingId(product.id);
            setBarcodeStatus('found');
        } catch (error) {
            if (error.response?.status === 404) {
                // New product — clear form, keep barcode for later association
                setFormData({ name: '', cost: '', margin: '', price: '', stock: '', expiration_date: '', barcode: '' });
                setEditingId(null);
                setBarcodeStatus('not_found');
            } else {
                alert(error.response?.data?.detail || 'Error buscando código');
                setBarcodeStatus(null);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: formData.name,
            cost: parseFloat(formData.cost) || 0,
            margin: parseFloat(formData.margin) || 0,
            price: parseFloat(formData.price) || 0,
            stock: parseInt(formData.stock, 10),
            expiration_date: formData.expiration_date || null,
            project_id: activeProject
        };

        try {
            if (!editingId) {
                let finalBarcode = '';
                if (inputMode === 'barcode') {
                    finalBarcode = barcodeInput.trim();
                } else {
                    finalBarcode = formData.barcode.trim();
                }
                
                if (!finalBarcode) {
                    alert("Es obligatorio ingresar o autogenerar un código para crear el producto.");
                    return;
                }
                payload.barcode = finalBarcode;
            }

            setIsSaving(true);
            if (editingId) {
                await api.put(`/products/${editingId}`, payload);
            } else {
                await api.post('/products/', payload);
            }

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                resetModal();
                fetchProducts();
            }, 1000);
        } catch (error) {
            alert(error.response?.data?.detail || 'Error guardando producto');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddBarcodeToExisting = async (productId) => {
        if (!newBarcodeCode.trim()) return;
        try {
            await api.post(`/products/${productId}/barcodes`, {
                code: newBarcodeCode.trim(),
                product_id: productId,
                stock: parseInt(newBarcodeStock) || 0,
                expiration_date: newBarcodeDate || null
            });
            alert('Código de barras agregado correctamente.');
            setNewBarcodeCode('');
            setNewBarcodeStock('');
            setNewBarcodeDate('');
            fetchProducts();
        } catch (error) {
            alert(error.response?.data?.detail || 'Error al agregar barcode');
        }
    };

    const handleUpdateBarcode = async (barcodeId) => {
        try {
            await api.put(`/products/barcodes/${barcodeId}`, {
                stock: parseInt(editBarcodeData.stock) || 0,
                expiration_date: editBarcodeData.expiration_date || null
            });
            alert('Lote actualizado');
            setEditingBarcodeId(null);
            fetchProducts();
        } catch (error) {
            alert(error.response?.data?.detail || 'Error actualizando lote');
        }
    };

    const handleDeleteBarcode = async (barcodeId) => {
        try {
            await api.delete(`/products/barcodes/${barcodeId}`);
            setConfirmDeleteId(null);
            fetchProducts();
        } catch (error) {
            alert(error.response?.data?.detail || 'Error eliminando lote');
        }
    };
    
    const toggleExpand = (productId) => {
        setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
    };

    const handleEdit = (product) => {
        setFormData({
            name: product.name,
            cost: product.cost,
            margin: product.margin,
            price: product.price,
            stock: product.stock,
            expiration_date: product.expiration_date || '',
            barcode: '' // Edited products don't change main barcode this way
        });
        setEditingId(product.id);
        setInputMode('manual');
        setBarcodeStatus(null);
        setBarcodeInput('');
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/products/${id}`, { params: { project_id: activeProject } });
            setConfirmDeleteProductId(null);
            fetchProducts();
        } catch (error) {
            alert(error.response?.data?.detail || 'Error eliminando producto');
        }
    };

    const resetModal = () => {
        setShowModal(false);
        setEditingId(null);
        setBarcodeInput('');
        setBarcodeStatus(null);
        setNewBarcodeCode('');
        setNewBarcodeStock('');
        setNewBarcodeDate('');
        setFormData({ name: '', cost: '', margin: '', price: '', stock: '', expiration_date: '', barcode: '' });
    };

    const handleGenerateInternalCode = () => {
        const sysCode = 'SYS-' + Math.floor(100000 + Math.random() * 900000);
        setFormData({ ...formData, barcode: sysCode });
    };

    const getExpirationStatus = (expDate) => {
        if (!expDate) return { class: 'text-gray-500', text: 'N/A' };
        const today = new Date();
        const expiration = new Date(expDate);
        const daysDiff = Math.ceil((expiration - today) / (1000 * 3600 * 24));
        if (daysDiff < 0) return { class: 'text-red-600 font-bold', text: `Expiró (${expDate})` };
        if (daysDiff <= 30) return { class: 'text-yellow-600 font-bold', text: `Cerca (${expDate})` };
        return { class: 'text-green-600', text: expDate };
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedProducts = [...products].filter(product => {
        const searchLower = inventorySearch.toLowerCase();
        const barcodesMatch = product.barcodes?.some(bc => bc.code.toLowerCase().includes(searchLower));
        return product.name.toLowerCase().includes(searchLower) || barcodesMatch;
    }).sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 text-blue-600" /> : <ChevronDown className="w-3 h-3 ml-1 text-blue-600" />;
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Inventario</h1>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current.click()} disabled={uploading}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center shadow hover:bg-green-700 transition disabled:opacity-50 text-sm">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Subiendo...' : 'Importar Excel'}
                    </button>
                    <button onClick={() => { resetModal(); setShowModal(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center shadow hover:bg-blue-700 transition text-sm">
                        <Plus className="w-4 h-4 mr-2" /> Agregar Producto
                    </button>
                </div>
            </div>

            <div className="flex-none bg-white p-4 border-x border-t border-gray-100 rounded-t-xl flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 gap-4">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                    />
                </div>
                <div className="text-xs text-gray-400 font-medium">
                    Mostrando {sortedProducts.length} productos
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:flex flex-1 min-h-0 flex-col bg-white rounded-b-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-gray-100 shadow-sm">
                            <tr>
                                <th className="p-5 font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition border-b border-gray-200" onClick={() => handleSort('name')}>
                                <div className="flex items-center">Nombre <SortIcon columnKey="name" /></div>
                            </th>
                                <th className="p-5 font-semibold text-gray-700 border-b border-gray-200">Códigos</th>
                                <th className="p-5 font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition border-b border-gray-200" onClick={() => handleSort('cost')}>
                                    <div className="flex items-center">Costo Adq. <SortIcon columnKey="cost" /></div>
                                </th>
                                <th className="p-5 font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition border-b border-gray-200" onClick={() => handleSort('margin')}>
                                    <div className="flex items-center">Margen (%) <SortIcon columnKey="margin" /></div>
                                </th>
                                <th className="p-5 font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition border-b border-gray-200" onClick={() => handleSort('price')}>
                                    <div className="flex items-center">Precio Público <SortIcon columnKey="price" /></div>
                                </th>
                                <th className="p-5 font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition border-b border-gray-200" onClick={() => handleSort('stock')}>
                                    <div className="flex items-center">Stock <SortIcon columnKey="stock" /></div>
                                </th>
                                <th className="p-5 font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition border-b border-gray-200" onClick={() => handleSort('expiration_date')}>
                                    <div className="flex items-center">Vencimiento <SortIcon columnKey="expiration_date" /></div>
                                </th>
                                <th className="p-5 font-semibold text-gray-700 text-center border-b border-gray-200">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {sortedProducts.map(product => {
                            const expStatus = getExpirationStatus(product.expiration_date);
                            return (
                                <React.Fragment key={product.id}>
                                <tr className="border-b hover:bg-gray-50 transition">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium text-gray-800">{product.name}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleExpand(product.id)} className="p-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-full transition flex items-center justify-center">
                                                <Plus className={`w-4 h-4 transition-transform ${expandedProducts[product.id] ? 'rotate-45' : ''}`} />
                                            </button>
                                            <span className="text-sm text-gray-600 font-medium">{product.barcodes?.length || 0} Lotes</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{currencySymbol} {product.cost.toFixed(2)}</td>
                                    <td className="p-4 text-gray-600 text-sm">{product.margin}%</td>
                                    <td className="p-4 font-bold text-green-700">{currencySymbol} {product.price.toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {product.stock} unds
                                        </span>
                                    </td>
                                    <td className={`p-4 ${expStatus.class}`}>{expStatus.text}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(product)} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition shadow-sm border border-blue-100"><Edit2 className="w-5 h-5" /></button>
                                            {confirmDeleteProductId === product.id ? (
                                                <div className="flex gap-1 items-center bg-red-50 rounded-xl p-1 border border-red-200">
                                                    <button onClick={() => handleDelete(product.id)} className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm">✓ Borrar</button>
                                                    <button onClick={() => setConfirmDeleteProductId(null)} className="px-3 py-2 bg-white text-gray-600 text-xs font-bold rounded-lg shadow-sm border border-gray-200">Cancelar</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setConfirmDeleteProductId(product.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition shadow-sm border border-red-100"><Trash2 className="w-5 h-5" /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedProducts[product.id] && product.barcodes?.length > 0 && (
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <td colSpan="8" className="p-0">
                                            <div className="bg-blue-50/30 p-4 border-l-4 border-blue-500">
                                                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                                    <Barcode className="w-4 h-4" /> Desglose de Lotes
                                                </h4>
                                                <table className="w-full text-sm text-left max-w-3xl bg-white shadow-sm rounded-lg overflow-hidden border">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 font-semibold text-gray-600">Código</th>
                                                            <th className="px-4 py-2 font-semibold text-gray-600">Stock Individual</th>
                                                            <th className="px-4 py-2 font-semibold text-gray-600">Vencimiento</th>
                                                            <th className="px-4 py-2 font-semibold text-gray-600 text-center">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {product.barcodes.map(bc => {
                                                            const isEditing = editingBarcodeId === bc.id;
                                                            return (
                                                                <tr key={bc.id} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-2 font-mono text-gray-700">{bc.code}</td>
                                                                    <td className="px-4 py-2">
                                                                        {isEditing ? (
                                                                            <input type="number" className="border w-20 p-1 rounded" value={editBarcodeData.stock} onChange={e => setEditBarcodeData({...editBarcodeData, stock: e.target.value})} />
                                                                        ) : (
                                                                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">{bc.stock}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-2">
                                                                        {isEditing ? (
                                                                            <input type="date" className="border p-1 rounded" value={editBarcodeData.expiration_date} onChange={e => setEditBarcodeData({...editBarcodeData, expiration_date: e.target.value})} />
                                                                        ) : (
                                                                            <span className={getExpirationStatus(bc.expiration_date).class}>{getExpirationStatus(bc.expiration_date).text}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center flex justify-center gap-2">
                                                                        {isEditing ? (
                                                                            <>
                                                                                <button onClick={() => handleUpdateBarcode(bc.id)} className="w-8 h-8 flex items-center justify-center bg-green-50 text-green-600 rounded-lg shadow-sm border border-green-100"><Save className="w-4 h-4"/></button>
                                                                                <button onClick={() => setEditingBarcodeId(null)} className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-500 rounded-lg shadow-sm border border-gray-200"><X className="w-4 h-4"/></button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <button onClick={() => { setEditingBarcodeId(bc.id); setEditBarcodeData({ stock: bc.stock, expiration_date: bc.expiration_date || '' }); }} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-blue-100"><Edit2 className="w-4 h-4"/></button>
                                                                                {confirmDeleteId === bc.id ? (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <button onClick={() => handleDeleteBarcode(bc.id)} className="text-white bg-red-600 px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm">✓</button>
                                                                                        <button onClick={() => setConfirmDeleteId(null)} className="text-gray-600 bg-white border border-gray-200 px-2 py-1.5 rounded-lg text-xs font-bold shadow-sm">✗</button>
                                                                                    </span>
                                                                                ) : (
                                                                                    <button onClick={() => setConfirmDeleteId(bc.id)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg shadow-sm border border-red-100"><Trash2 className="w-4 h-4"/></button>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            );
                        })}
                        {products.length === 0 && !loading && (
                            <tr><td colSpan="8" className="p-8 text-center text-gray-500">No hay productos en tu inventario.</td></tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>

    {/* Mobile Cards (only visible on small screens) */}
    <div className="md:hidden flex-1 overflow-y-auto space-y-4 mb-4 pb-16 custom-scrollbar">
                <div className="divide-y divide-gray-100">
                    {sortedProducts.map(product => {
                        const expStatus = getExpirationStatus(product.expiration_date);
                        return (
                            <div key={product.id} className="p-4 hover:bg-gray-50 transition">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-medium text-gray-800 truncate">{product.name}</h3>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {product.barcodes?.length > 0 ? product.barcodes.slice(0, 2).map(bc => (
                                                    <span key={bc.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{bc.code}</span>
                                                )) : null}
                                                {product.barcodes?.length > 2 && (
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">+{product.barcodes.length - 2}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-2">
                                        <button onClick={() => handleEdit(product)} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl shadow-sm border border-blue-100">
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        {confirmDeleteProductId === product.id ? (
                                            <div className="flex gap-1 items-center bg-red-50 rounded-xl p-1 border border-red-200">
                                                <button onClick={() => handleDelete(product.id)} className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm">✓</button>
                                                <button onClick={() => setConfirmDeleteProductId(null)} className="px-3 py-2 bg-white text-gray-600 text-xs font-bold rounded-lg shadow-sm border border-gray-200">✗</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setConfirmDeleteProductId(product.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl shadow-sm border border-red-100">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Costo:</span>
                                        <span className="ml-2 font-medium">{currencySymbol} {product.cost.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Margen:</span>
                                        <span className="ml-2 font-medium">{product.margin}%</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Precio:</span>
                                        <span className="ml-2 font-bold text-green-700">{currencySymbol} {product.price.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Stock:</span>
                                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {product.stock} unds
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className={`text-xs font-medium ${expStatus.class}`}>
                                        Vencimiento: {expStatus.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {products.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-500">
                            No hay productos en tu inventario.
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="glass-panel bg-white/95 rounded-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <h2 className="text-xl font-bold m-0">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            <button onClick={resetModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>

                        {/* Mode Toggle */}
                        {!editingId && (
                            <div className="flex border-b">
                                <button
                                    onClick={() => { setInputMode('manual'); setBarcodeStatus(null); setBarcodeInput(''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${inputMode === 'manual' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700 bg-gray-50'}`}>
                                    <PencilLine className="w-4 h-4" /> Ingreso Manual
                                </button>
                                <button
                                    onClick={() => { setInputMode('barcode'); setBarcodeStatus(null); setFormData({ name: '', cost: '', margin: '', price: '', stock: '', expiration_date: '' }); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${inputMode === 'barcode' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700 bg-gray-50'}`}>
                                    <Barcode className="w-4 h-4" /> Por Código de Barras
                                </button>
                            </div>
                        )}

                        {/* Barcode Lookup Section */}
                        {inputMode === 'barcode' && (
                            <div className="p-6">
                                <label className="text-sm font-semibold text-gray-700 block mb-2">Escanea o escribe el código:</label>
                                <div className="flex gap-2">
                                    <input
                                        ref={barcodeInputRef}
                                        value={barcodeInput}
                                        onChange={e => { setBarcodeInput(e.target.value); setBarcodeStatus(null); }}
                                        onKeyDown={e => e.key === 'Enter' && handleBarcodeLookup()}
                                        placeholder="Ej: 7501055312066"
                                        className="flex-1 border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none font-mono"
                                    />
                                    <button onClick={handleBarcodeLookup} disabled={barcodeStatus === 'loading'}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-1">
                                        <Search className="w-4 h-4" />
                                    </button>
                                </div>

                                {barcodeStatus === 'loading' && (
                                    <p className="text-sm text-gray-400 mt-2 animate-pulse">Buscando...</p>
                                )}
                                {barcodeStatus === 'found' && (
                                    <div className="flex items-center gap-2 mt-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        <span>Producto encontrado. Edita los datos o actualiza el stock.</span>
                                    </div>
                                )}
                                {barcodeStatus === 'not_found' && (
                                    <div className="flex items-center gap-2 mt-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-3 py-2 text-sm">
                                        <PlusCircle className="w-4 h-4 shrink-0" />
                                        <span>Código nuevo. Completa los datos para crear el producto.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Product Form */}
                        {(inputMode === 'manual' || barcodeStatus !== null) && (
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {inputMode === 'manual' && !editingId && (
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="text-sm font-medium text-gray-700 block mb-1">Código Interno / Barcode <span className="text-red-500">*</span></label>
                                            <input type="text" name="barcode" value={formData.barcode} onChange={handleFormChange} required className="w-full border p-2 rounded focus:ring-2 outline-none font-mono bg-blue-50" placeholder="Ej: SYS-102930" />
                                        </div>
                                        <button type="button" onClick={handleGenerateInternalCode} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm transition-colors mb-[1px]">
                                            Auto-Generar
                                        </button>
                                    </div>
                                )}
                                <div><label className="text-sm font-medium text-gray-700 block mb-1">Nombre</label>
                                    <input name="name" required className="w-full border p-2 rounded focus:ring-2 outline-none" value={formData.name} onChange={handleFormChange} /></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-sm font-medium text-gray-700 block mb-1">Costo ({currencySymbol})</label>
                                        <input type="number" step="0.01" name="cost" required className="w-full border p-2 rounded focus:ring-2 outline-none" value={formData.cost} onChange={handleFormChange} /></div>
                                    <div><label className="text-sm font-medium text-gray-700 block mb-1">Margen %</label>
                                        <input type="number" step="0.1" name="margin" required className="w-full border p-2 rounded focus:ring-2 outline-none" value={formData.margin} onChange={handleFormChange} /></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-sm font-medium text-gray-700 block mb-1">Precio Final ({currencySymbol})</label>
                                        <input type="number" step="0.01" name="price" required className="w-full border p-2 rounded focus:ring-2 outline-none bg-green-50 text-green-900 font-bold" value={formData.price} onChange={handleFormChange} /></div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-1">
                                            Stock {editingId && <span className="text-xs text-blue-500 font-normal">(suma de lotes)</span>}
                                        </label>
                                        {editingId ? (
                                            <div className="w-full border p-2 rounded bg-gray-100 text-gray-500 font-mono text-sm flex items-center gap-1">
                                                <span className="text-gray-400 text-xs">Σ</span>
                                                <span className="font-bold text-gray-700">{formData.stock}</span>
                                                <span className="text-xs text-gray-400 ml-1">calculado automáticamente</span>
                                            </div>
                                        ) : (
                                            <input type="number" name="stock" required min="0" className="w-full border p-2 rounded focus:ring-2 outline-none" value={formData.stock} onChange={handleFormChange} />
                                        )}
                                    </div>
                                </div>

                                <div><label className="text-sm font-medium text-gray-700 block mb-1">Fecha de Vencimiento (opcional)</label>
                                    <input type="date" name="expiration_date" className="w-full border p-2 rounded focus:ring-2 outline-none" value={formData.expiration_date} onChange={handleFormChange} /></div>

                                {/* Extra barcode field when editing — add additional codes */}
                                {editingId && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                                        <label className="text-sm font-bold text-gray-700 block mb-2 flex items-center gap-2">
                                            <Barcode className="w-4 h-4 text-blue-600" />
                                            Agregar Nuevo Lote / Código
                                        </label>
                                        <p className="text-xs text-gray-400 mb-3">
                                            Escanea el código, completa stock y vencimiento, luego presiona <strong>+ Agregar Lote</strong>.
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            <input
                                                value={newBarcodeCode}
                                                onChange={e => setNewBarcodeCode(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                                                placeholder="Escanear o escribir código..."
                                                className="w-full border p-2 rounded font-mono focus:ring-2 outline-none"
                                            />
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="text-xs font-semibold text-gray-500">Stock</label>
                                                    <input
                                                        type="number" min="0"
                                                        value={newBarcodeStock}
                                                        onChange={e => setNewBarcodeStock(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                                                        placeholder="0"
                                                        className="w-full border p-2 rounded focus:ring-2 outline-none"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs font-semibold text-gray-500">Vencimiento</label>
                                                    <input
                                                        type="date"
                                                        value={newBarcodeDate}
                                                        onChange={e => setNewBarcodeDate(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                                                        className="w-full border p-2 rounded focus:ring-2 outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <button type="button" onClick={() => handleAddBarcodeToExisting(editingId)}
                                                        className="bg-green-600 text-white h-[42px] px-4 rounded hover:bg-green-700 transition text-sm font-bold shadow-sm whitespace-nowrap">
                                                        + Agregar Lote
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2 flex gap-3">
                                    <button type="button" onClick={resetModal} disabled={isSaving} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 transition font-medium disabled:opacity-50">Cancelar</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {showSuccess && (
                            <div className="absolute inset-x-0 bottom-0 top-0 bg-white/95 flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">¡Producto Guardado!</h3>
                                <p className="text-gray-500">Actualizando inventario...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
