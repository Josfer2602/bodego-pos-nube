import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Plus, Edit2, Trash2, Package, Upload, Barcode, PencilLine, Search, CheckCircle2, X, ArrowUpDown, ChevronUp, ChevronDown, Save, Eye, Printer, Download, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Inventory = () => {
    const { activeProject, projectDetails } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    // Modals
    const [showModal, setShowModal] = useState(false); // Add/Edit Product Modal
    const [showBarcodeModal, setShowBarcodeModal] = useState(false); // Generate Barcode Modal
    
    // State
    const [editingId, setEditingId] = useState(null);
    const [inputMode, setInputMode] = useState('manual');
    const [inventorySearch, setInventorySearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
    const [selectedProduct, setSelectedProduct] = useState(null); // For the left preview panel

    // Barcode Generation State
    const [generatedBarcodeText, setGeneratedBarcodeText] = useState('');

    const fileInputRef = useRef(null);
    const barcodeInputRef = useRef(null);

    // Form states
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeStatus, setBarcodeStatus] = useState(null);
    const [newBarcodeCode, setNewBarcodeCode] = useState('');
    const [newBarcodeStock, setNewBarcodeStock] = useState('');
    const [newBarcodeDate, setNewBarcodeDate] = useState('');
    const [expandedProducts, setExpandedProducts] = useState({});
    const [editingBarcodeId, setEditingBarcodeId] = useState(null);
    const [editBarcodeData, setEditBarcodeData] = useState({ stock: 0, expiration_date: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmDeleteProductId, setConfirmDeleteProductId] = useState(null);

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

    useEffect(() => {
        if (inputMode === 'barcode' && showModal) {
            setTimeout(() => barcodeInputRef.current?.focus(), 100);
        }
    }, [inputMode, showModal]);

    const fetchProducts = async () => {
        if (!activeProject) return;
        setLoading(true);
        try {
            const response = await api.get('/products/', { 
                params: { 
                    project_id: activeProject,
                    _t: new Date().getTime() 
                } 
            });
            setProducts(response.data);
            if (response.data.length > 0 && !selectedProduct) {
                setSelectedProduct(response.data[0]);
            } else if (selectedProduct) {
                // Update selected product reference
                const updated = response.data.find(p => p.id === selectedProduct.id);
                if (updated) setSelectedProduct(updated);
            }
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
            toast.success(response.data.message);
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al subir el archivo');
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
                setFormData({ name: '', cost: '', margin: '', price: '', stock: '', expiration_date: '', barcode: '' });
                setEditingId(null);
                setBarcodeStatus('not_found');
            } else {
                toast.error(error.response?.data?.detail || 'Error buscando código');
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
                if (inputMode === 'barcode') finalBarcode = barcodeInput.trim();
                else finalBarcode = formData.barcode.trim();
                
                if (!finalBarcode) {
                    toast.error("Es obligatorio ingresar o autogenerar un código para crear el producto.");
                    return;
                }
                payload.barcode = finalBarcode;
            }

            setIsSaving(true);
            if (editingId) {
                await api.put(`/products/${editingId}`, payload);
                toast.success("Producto actualizado");
            } else {
                await api.post('/products/', payload);
                toast.success("Producto creado");
            }

            resetModal();
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error guardando producto');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddBarcodeToExisting = async (productId) => {
        if (!newBarcodeCode.trim()) return;

        const codeToScan = newBarcodeCode.trim();
        let stockToAdd = 1;
        if (newBarcodeStock !== '') {
            const parsed = parseInt(newBarcodeStock);
            if (!isNaN(parsed)) stockToAdd = parsed;
        }

        const product = products.find(p => p.id === productId);
        const existingBarcode = product?.barcodes?.find(b => b.code === codeToScan);

        try {
            if (existingBarcode) {
                // Acumular stock en el lote existente
                await api.put(`/products/barcodes/${existingBarcode.id}`, {
                    stock: existingBarcode.stock + stockToAdd,
                    expiration_date: newBarcodeDate || existingBarcode.expiration_date
                });
                toast.success(`Lote actualizado: ${codeToScan} (+${stockToAdd})`);
            } else {
                // Crear nuevo lote
                await api.post(`/products/${productId}/barcodes`, {
                    code: codeToScan,
                    product_id: productId,
                    stock: stockToAdd,
                    expiration_date: newBarcodeDate || null
                });
                toast.success(`Lote agregado: ${codeToScan} (+${stockToAdd})`);
            }
            
            setNewBarcodeCode('');
            // No reseteamos stock ni date para permitir escaneo rápido continuo
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al procesar lote');
        }
    };

    const handleUpdateBarcode = async (barcodeId) => {
        try {
            await api.put(`/products/barcodes/${barcodeId}`, {
                stock: parseInt(editBarcodeData.stock) || 0,
                expiration_date: editBarcodeData.expiration_date || null
            });
            toast.success('Lote actualizado');
            setEditingBarcodeId(null);
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error actualizando lote');
        }
    };

    const handleDeleteBarcode = async (barcodeId) => {
        try {
            await api.delete(`/products/barcodes/${barcodeId}`);
            setConfirmDeleteId(null);
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error eliminando lote');
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
            barcode: ''
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
            toast.success("Producto eliminado");
            setConfirmDeleteProductId(null);
            if (selectedProduct?.id === id) setSelectedProduct(null);
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error eliminando producto');
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

    const openBarcodeGenerator = (code) => {
        setGeneratedBarcodeText(code || 'SYS-' + Math.floor(100000 + Math.random() * 900000));
        setShowBarcodeModal(true);
    };

    const printBarcode = () => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        const imgUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${generatedBarcodeText}&scale=3&includetext`;

        doc.write(`
            <html>
                <head>
                    <title>Imprimir Código</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    <img src="${imgUrl}" onload="window.print();" />
                </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 10000); // Give it time to load image and print
    };

    const getExpirationStatus = (expDate) => {
        if (!expDate) return { class: 'text-gray-500', text: 'N/A' };
        const today = new Date();
        const expiration = new Date(expDate);
        const daysDiff = Math.ceil((expiration - today) / (1000 * 3600 * 24));
        if (daysDiff < 0) return { class: 'text-red-600 font-bold', text: `Expiró (${expDate})` };
        if (daysDiff <= 30) return { class: 'text-yellow-600 font-bold', text: `Cerca (${expDate})` };
        return { class: 'text-emerald-600', text: expDate };
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedProducts = [...products].filter(product => {
        const searchLower = inventorySearch.toLowerCase();
        const barcodesMatch = product.barcodes?.some(bc => bc.code.toLowerCase().includes(searchLower));
        return product.name.toLowerCase().includes(searchLower) || barcodesMatch;
    }).sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 text-blue-600" /> : <ChevronDown className="w-3 h-3 ml-1 text-blue-600" />;
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
                    <span className="hidden md:block text-xs text-gray-400 border-l pl-3 ml-1">Gestión de stock y códigos de barras.</span>
                </div>
                <div className="flex items-center gap-3">
                    <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current.click()} disabled={uploading}
                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50 transition disabled:opacity-50 text-sm font-bold">
                        <Upload className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">{uploading ? 'Importando...' : 'Importar Excel'}</span>
                    </button>
                    <button onClick={() => { resetModal(); setShowModal(true); }}
                        className="text-white px-4 py-2 rounded-lg flex items-center justify-center shadow-md transition text-sm font-bold"
                        style={{ backgroundColor: 'var(--color-primary)' }}>
                        <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Nuevo Producto</span>
                    </button>
                </div>
            </div>

            {/* Split Content Area */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-2 md:p-4 gap-4">
                
                {/* Left Sidebar: Search & Preview */}
                <div className="w-full md:w-[320px] lg:w-[380px] flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
                    {/* Search Card */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Buscador</span>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Nombre o código..."
                                className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-slate-100 bg-slate-50 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                                value={inventorySearch}
                                onChange={(e) => setInventorySearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Product Preview Card */}
                    {selectedProduct ? (
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 min-h-[300px]">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 block">Detalle Seleccionado</span>
                            <div className="flex flex-col items-center text-center border-b border-gray-100 pb-5 mb-5">
                                <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4 shadow-sm border"
                                    style={{ backgroundColor: 'var(--color-primary-bg)', borderColor: 'var(--color-primary-border)' }}>
                                    <Package className="w-12 h-12" style={{ color: 'var(--color-primary)' }} />
                                </div>
                                <h3 className="text-xl font-black text-gray-800 leading-tight">{selectedProduct.name}</h3>
                                <p className="text-emerald-600 font-bold mt-2 text-lg">{currencySymbol} {selectedProduct.price.toFixed(2)}</p>
                            </div>
                            
                            <div className="space-y-3 flex-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Costo Adq.</span>
                                    <span className="font-semibold text-gray-700">{currencySymbol} {selectedProduct.cost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Stock Total</span>
                                    <span className={`font-black ${selectedProduct.stock > 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {selectedProduct.stock} unds
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Lotes Activos</span>
                                    <span className="font-semibold text-gray-700">{selectedProduct.barcodes?.length || 0}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => openBarcodeGenerator(selectedProduct.barcodes?.[0]?.code)}
                                className="mt-5 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                            >
                                <Barcode className="w-5 h-5"/> Generar Código
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col items-center justify-center text-center opacity-70">
                            <Package className="w-16 h-16 text-gray-300 mb-3"/>
                            <p className="text-gray-500 font-medium">Selecciona un producto de la tabla para ver sus detalles</p>
                        </div>
                    )}
                </div>

                {/* Right Main Panel: Data Table */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="font-bold text-gray-800">Listado de Productos ({sortedProducts.length})</h2>
                        <button 
                            onClick={() => openBarcodeGenerator()}
                            className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <Barcode className="w-4 h-4"/> Imprimir Código Libre
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 p-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase font-bold sticky top-0 z-10 border-b border-slate-200">
                                    <tr>
                                        <th className="p-3 cursor-pointer hover:text-blue-600 transition" onClick={() => handleSort('name')}>
                                            <div className="flex items-center">Producto <SortIcon columnKey="name" /></div>
                                        </th>
                                        <th className="p-3 text-center">Código General</th>
                                        <th className="p-3 text-center cursor-pointer hover:text-blue-600 transition" onClick={() => handleSort('stock')}>
                                            <div className="flex items-center justify-center">Stock <SortIcon columnKey="stock" /></div>
                                        </th>
                                        <th className="p-3 text-right">Precio</th>
                                        <th className="p-3 text-center">Estado</th>
                                        <th className="p-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {sortedProducts.map(product => {
                                    const expStatus = getExpirationStatus(product.expiration_date);
                                    const isSelected = selectedProduct?.id === product.id;
                                    return (
                                        <React.Fragment key={product.id}>
                                            <tr 
                                                onClick={() => setSelectedProduct(product)}
                                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                                            >
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                                                            style={isSelected
                                                                ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
                                                                : { backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }
                                                            }>
                                                            <Package className="w-4 h-4"/>
                                                        </div>
                                                        <span className="font-bold text-gray-800 text-sm">{product.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                                                            {product.barcodes?.[0]?.code || 'N/A'}
                                                        </span>
                                                        {product.barcodes?.length > 1 && (
                                                            <button onClick={(e) => { e.stopPropagation(); toggleExpand(product.id); }} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold hover:bg-blue-200">
                                                                +{product.barcodes.length - 1} lotes
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${product.stock > 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {product.stock}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-black text-emerald-600 text-sm">
                                                    {currencySymbol} {product.price.toFixed(2)}
                                                </td>
                                                <td className={`p-3 text-center text-xs font-semibold ${expStatus.class}`}>
                                                    {expStatus.text}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 rounded-lg transition shadow-sm"><Edit2 className="w-4 h-4" /></button>
                                                        {confirmDeleteProductId === product.id ? (
                                                            <div className="flex gap-1 items-center bg-red-50 p-1 rounded-lg border border-red-200 absolute right-10">
                                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded shadow-sm">Borrar</button>
                                                                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteProductId(null); }} className="px-2 py-1 bg-white text-gray-600 text-[10px] font-bold rounded shadow-sm border border-gray-200">Cancelar</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteProductId(product.id); }} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Sub-tabla de Lotes */}
                                            {expandedProducts[product.id] && product.barcodes?.length > 0 && (
                                                <tr className="bg-slate-100/50 border-b border-slate-200">
                                                    <td colSpan="6" className="p-4">
                                                        <div className="ml-10 bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm">
                                                            <div className="bg-blue-50/50 p-3 border-b border-blue-100 flex items-center gap-2 text-blue-800 text-xs font-bold">
                                                                <Barcode className="w-4 h-4"/> Lotes Registrados
                                                            </div>
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="bg-slate-50 text-slate-500 uppercase">
                                                                    <tr>
                                                                        <th className="px-4 py-2 font-semibold">Código Barras</th>
                                                                        <th className="px-4 py-2 font-semibold text-center">Stock</th>
                                                                        <th className="px-4 py-2 font-semibold">Vencimiento</th>
                                                                        <th className="px-4 py-2 font-semibold text-center">Ajustes</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {product.barcodes.map(bc => {
                                                                        const isEditing = editingBarcodeId === bc.id;
                                                                        return (
                                                                            <tr key={bc.id} className="hover:bg-slate-50">
                                                                                <td className="px-4 py-2.5 font-mono text-slate-700">{bc.code}</td>
                                                                                <td className="px-4 py-2.5 text-center">
                                                                                    {isEditing ? (
                                                                                        <input type="number" className="border border-blue-300 w-16 p-1 rounded outline-none text-center" value={editBarcodeData.stock} onChange={e => setEditBarcodeData({...editBarcodeData, stock: e.target.value})} />
                                                                                    ) : (
                                                                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">{bc.stock}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-2.5">
                                                                                    {isEditing ? (
                                                                                        <input type="date" className="border border-blue-300 p-1 rounded outline-none" value={editBarcodeData.expiration_date} onChange={e => setEditBarcodeData({...editBarcodeData, expiration_date: e.target.value})} />
                                                                                    ) : (
                                                                                        <span className={getExpirationStatus(bc.expiration_date).class}>{getExpirationStatus(bc.expiration_date).text}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-2.5 flex justify-center gap-2">
                                                                                    {isEditing ? (
                                                                                        <>
                                                                                            <button onClick={() => handleUpdateBarcode(bc.id)} className="w-6 h-6 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded shadow-sm"><Save className="w-3 h-3"/></button>
                                                                                            <button onClick={() => setEditingBarcodeId(null)} className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 text-gray-500 rounded shadow-sm"><X className="w-3 h-3"/></button>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <button onClick={() => { setEditingBarcodeId(bc.id); setEditBarcodeData({ stock: bc.stock, expiration_date: bc.expiration_date || '' }); }} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 text-blue-600 rounded hover:bg-blue-50 shadow-sm"><Edit2 className="w-3 h-3"/></button>
                                                                                            {confirmDeleteId === bc.id ? (
                                                                                                <div className="flex gap-1">
                                                                                                    <button onClick={() => handleDeleteBarcode(bc.id)} className="bg-red-500 text-white px-1 rounded text-[10px] font-bold">Sí</button>
                                                                                                    <button onClick={() => setConfirmDeleteId(null)} className="bg-gray-200 text-gray-600 px-1 rounded text-[10px] font-bold">No</button>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <button onClick={() => setConfirmDeleteId(bc.id)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 text-red-500 rounded hover:bg-red-50 shadow-sm"><Trash2 className="w-3 h-3"/></button>
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
                                    <tr><td colSpan="6" className="p-12 text-center text-gray-500 font-medium">No hay productos en tu inventario. Importa un excel o crea uno nuevo.</td></tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Creación/Edición */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-[bounce_0.3s_ease-out_1]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Package style={{ color: 'var(--color-primary)' }}/> {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                            </h2>
                            <button onClick={resetModal} className="text-gray-400 hover:text-gray-600 bg-white border rounded-lg p-1 shadow-sm"><X className="w-5 h-5" /></button>
                        </div>

                        {!editingId && (
                            <div className="flex border-b border-slate-200 bg-slate-50">
                                <button
                                    onClick={() => { setInputMode('manual'); setBarcodeStatus(null); setBarcodeInput(''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors ${inputMode === 'manual' ? 'bg-white border-b-2' : 'text-slate-500 hover:text-slate-700'}`}
                                    style={inputMode === 'manual' ? { color: 'var(--color-primary)', borderBottomColor: 'var(--color-primary)' } : {}}>
                                    <PencilLine className="w-4 h-4" /> Manual
                                </button>
                                <button
                                    onClick={() => { setInputMode('barcode'); setBarcodeStatus(null); setFormData({ name: '', cost: '', margin: '', price: '', stock: '', expiration_date: '' }); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors ${inputMode === 'barcode' ? 'bg-white border-b-2' : 'text-slate-500 hover:text-slate-700'}`}
                                    style={inputMode === 'barcode' ? { color: 'var(--color-primary)', borderBottomColor: 'var(--color-primary)' } : {}}>
                                    <Barcode className="w-4 h-4" /> Escáner
                                </button>
                            </div>
                        )}

                        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
                            {inputMode === 'barcode' && (
                                <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Escanear Código de Barras</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Barcode className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                            <input
                                                ref={barcodeInputRef}
                                                type="text"
                                                className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-mono text-lg"
                                                value={barcodeInput}
                                                onChange={(e) => {
                                                    setBarcodeInput(e.target.value);
                                                    if (barcodeStatus) setBarcodeStatus(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (!barcodeInput.trim()) toast.warning("Por favor ingresa un código de barras");
                                                        else handleBarcodeLookup();
                                                    }
                                                }}
                                                placeholder="123456789..."
                                            />
                                        </div>
                                        <button onClick={() => {
                                            if (!barcodeInput.trim()) toast.warning("Por favor ingresa un código de barras");
                                            else handleBarcodeLookup();
                                        }} className="bg-slate-800 hover:bg-slate-900 text-white px-5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2">
                                            {barcodeStatus === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} Buscar
                                        </button>
                                    </div>
                                    {barcodeStatus === 'found' && (
                                        <div className="mt-3 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4"/> Producto encontrado. Puedes añadir un nuevo lote abajo.
                                        </div>
                                    )}
                                    {barcodeStatus === 'not_found' && (
                                        <div className="mt-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200 flex items-center gap-2">
                                            <Plus className="w-4 h-4"/> Código nuevo. Completa los datos para crear el producto.
                                        </div>
                                    )}
                                </div>
                            )}

                            {(inputMode === 'manual' || barcodeStatus === 'not_found' || editingId) && (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre de Producto</label>
                                            <input type="text" name="name" required className="w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-lg focus:border-blue-500 outline-none font-medium" value={formData.name} onChange={handleFormChange} placeholder="Ej. Gaseosa 3L" />
                                        </div>
                                        
                                        {!editingId && inputMode === 'manual' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Código de Barras Inicial</label>
                                                <div className="flex gap-2">
                                                    <input type="text" name="barcode" className="flex-1 border-2 border-slate-100 bg-slate-50 p-2.5 rounded-lg focus:border-blue-500 outline-none font-mono text-sm" value={formData.barcode} onChange={handleFormChange} placeholder="Escanear o tipear..." />
                                                    <button type="button" onClick={handleGenerateInternalCode} className="bg-slate-100 text-slate-600 px-4 rounded-lg font-bold text-xs hover:bg-slate-200 border border-slate-200 transition-colors">Generar</button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Costo ({currencySymbol})</label>
                                                <input type="number" step="0.01" min="0" name="cost" required className="w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-lg focus:border-blue-500 outline-none font-bold" value={formData.cost} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Margen (%)</label>
                                                <input type="number" step="0.1" name="margin" required className="w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-lg focus:border-blue-500 outline-none font-bold" value={formData.margin} onChange={handleFormChange} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Precio Final Auto-calculado ({currencySymbol})</label>
                                            <input type="number" step="0.01" name="price" readOnly className="w-full border-2 border-emerald-200 bg-emerald-50 p-2.5 rounded-lg outline-none font-black text-emerald-700 text-lg" value={formData.price} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Stock</label>
                                                <input type="number" min="0" name="stock" required className="w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-lg focus:border-blue-500 outline-none font-bold text-blue-700" value={formData.stock} onChange={handleFormChange} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Vencimiento (Opcional)</label>
                                                <input type="date" name="expiration_date" className="w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-lg focus:border-blue-500 outline-none font-medium text-sm text-slate-600" value={formData.expiration_date} onChange={handleFormChange} />
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isSaving} className="w-full text-white font-bold py-3.5 rounded-xl shadow-md transition flex justify-center items-center gap-2 disabled:opacity-60"
                                        style={{ backgroundColor: 'var(--color-primary)' }}>
                                        {isSaving ? <span className="animate-pulse">Guardando...</span> : <><Save className="w-5 h-5"/> {editingId ? 'Actualizar Producto' : 'Guardar Producto'}</>}
                                    </button>
                                </form>
                            )}

                            {editingId && (
                                <div className="mt-4 bg-white p-5 rounded-xl border border-blue-200 shadow-sm animate-fade-in-up">
                                    <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                        <PlusCircle className="w-4 h-4"/> Añadir Nuevo Lote al Producto Existente
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nuevo Código (Lote)</label>
                                            <input type="text" className="w-full border-2 border-slate-100 bg-slate-50 p-2 rounded-lg font-mono text-sm" value={newBarcodeCode} onChange={e=>setNewBarcodeCode(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddBarcodeToExisting(editingId); } }} placeholder="Escanear lote y presionar Enter..."/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock a sumar</label>
                                            <input type="number" min="1" className="w-full border-2 border-slate-100 bg-slate-50 p-2 rounded-lg font-bold" value={newBarcodeStock} onChange={e=>setNewBarcodeStock(e.target.value)}/>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimiento del Lote</label>
                                            <input type="date" className="w-full border-2 border-slate-100 bg-slate-50 p-2 rounded-lg" value={newBarcodeDate} onChange={e=>setNewBarcodeDate(e.target.value)}/>
                                        </div>
                                    </div>
                                    <button onClick={() => handleAddBarcodeToExisting(editingId)}
                                        className="w-full text-white font-bold py-2.5 rounded-lg shadow-sm transition flex justify-center items-center gap-2"
                                        style={{ backgroundColor: 'var(--color-primary)' }}>
                                        Añadir Lote
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Generador de Código de Barras */}
            {showBarcodeModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Barcode className="text-slate-600"/> Generador de Código
                            </h2>
                            <button onClick={() => setShowBarcodeModal(false)} className="text-gray-400 hover:text-gray-600 bg-white border rounded-lg p-1"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 flex flex-col items-center">
                            <div className="w-full mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 text-center">Texto / ID del Código</label>
                                <input 
                                    type="text" 
                                    value={generatedBarcodeText}
                                    onChange={(e) => setGeneratedBarcodeText(e.target.value)}
                                    className="w-full border-2 border-slate-200 text-center font-mono font-bold text-lg p-2 rounded-lg focus:border-blue-500 outline-none"
                                />
                            </div>
                            
                            {/* Barcode Render from API */}
                            <div className="bg-white border-2 border-dashed border-slate-200 p-4 rounded-xl mb-6 w-full flex justify-center items-center min-h-[120px]">
                                {generatedBarcodeText ? (
                                    <img 
                                        src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(generatedBarcodeText)}&scale=3&includetext`} 
                                        alt="Barcode" 
                                        className="max-w-full mix-blend-multiply"
                                    />
                                ) : (
                                    <span className="text-slate-400 text-sm font-medium">Ingresa un texto válido</span>
                                )}
                            </div>

                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={printBarcode}
                                    disabled={!generatedBarcodeText}
                                    className="flex-1 text-white font-bold py-3 rounded-xl transition shadow-md flex justify-center items-center gap-2 disabled:opacity-40"
                                    style={{ backgroundColor: 'var(--color-primary)' }}
                                >
                                    <Printer className="w-5 h-5"/> Imprimir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
