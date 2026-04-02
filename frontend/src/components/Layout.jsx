import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Clock, Shield, LogOut, ArrowLeftRight, Tag, BarChart2, Wallet } from 'lucide-react';
import { useAuth } from '../AuthContext';

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, projectDetails } = useAuth();
    const [open, setOpen] = useState(false);

    // Close mobile sidebar when route changes
    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Extraemos el color directamente del proyecto seleccionado, si no hay, aplicamos color gris estándar
    const themeColor = projectDetails?.theme_color || '#111827';

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
            {/* Mobile top bar */}
            <div className="md:hidden flex items-center justify-between bg-white p-3 shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(!open);
                        }} 
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        aria-label="Toggle Menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="text-lg font-bold text-gray-800">{projectDetails?.name || 'Multi-POS'}</div>
                </div>
            </div>

            {/* Overlay for mobile when sidebar is open */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${open ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setOpen(false)}
                aria-hidden="true"
            />

            {/* Sidebar Inyectando Color Dinámico como Style inline */}
            <div 
                className={`fixed inset-y-0 left-0 z-50 w-64 transform ${open ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out md:translate-x-0 md:relative md:inset-auto md:w-20 xl:w-64 text-white shadow-2xl md:shadow-none flex flex-col h-screen md:h-auto`} 
                style={{ backgroundColor: themeColor }}
            >
                <div className="p-4 xl:p-6 flex flex-col items-center">
                    <h1 className="text-xl xl:text-2xl font-bold mb-2 flex flex-col items-center justify-center text-center">
                        {/* Renderizar Logo o Texto */}
                        {projectDetails?.logo_url ? (
                            <div className="w-12 h-12 xl:w-24 xl:h-24 mb-3 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-xl p-2 shadow-lg border border-white/20">
                                <img
                                    src={projectDetails.logo_url}
                                    alt="Logo Sucursal"
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                        e.target.parentElement.outerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-cart mb-2 text-white"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
                                    }}
                                />
                            </div>
                        ) : (
                            <ShoppingCart className="w-8 h-8 xl:w-10 xl:h-10 mb-2 text-white/90" />
                        )}
                        <span className="drop-shadow-md hidden xl:block">{projectDetails?.name || 'Multi-POS'}</span>
                    </h1>
                </div>

                <nav className="flex-1 mt-4 xl:mt-6 overflow-x-hidden">
                    {location.pathname.startsWith('/admin') ? (
                        <>
                            <Link title="Gestión Global" to="/admin" className={`flex items-center justify-center xl:justify-start px-2 xl:px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/admin' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <Shield className="w-5 h-5 xl:mr-3" /> <span className="hidden xl:block">Gestión Global</span>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link title="Punto de Venta" to="/" className={`flex items-center justify-center xl:justify-start px-2 xl:px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <ShoppingCart className="w-5 h-5 xl:mr-3" /> <span className="hidden xl:block">Punto de Venta</span>
                            </Link>
                            <Link title="Dashboard" to="/dashboard" className={`flex items-center justify-center xl:justify-start px-2 xl:px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/dashboard' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <BarChart2 className="w-5 h-5 xl:mr-3" /> <span className="hidden xl:block">Dashboard</span>
                            </Link>
                            <Link title="Inventario" to="/inventory" className={`flex items-center justify-center xl:justify-start px-2 xl:px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/inventory' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <Package className="w-5 h-5 xl:mr-3" /> <span className="hidden xl:block">Inventario</span>
                            </Link>
                            <Link title="Promociones" to="/promotions" className={`flex items-center justify-center xl:justify-start px-2 xl:px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/promotions' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <Tag className="w-5 h-5 xl:mr-3" /> <span className="hidden xl:block">Promociones</span>
                            </Link>
                            <Link title="Historial" to="/history" className={`flex items-center justify-center xl:justify-start px-2 xl:px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/history' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <Clock className="w-5 h-5 xl:mr-3" /> <span className="hidden xl:block">Historial</span>
                            </Link>
                            {(user?.role === 'superadmin' || user?.role === 'admin') && (
                                <Link title="Auditoría Cajas" to="/cash-history" className={`flex items-center justify-center xl:justify-start px-2 xl:px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/cash-history' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                    <Wallet className="w-5 h-5 xl:mr-3 text-red-300" /> <span className="hidden xl:block text-red-200">Auditoría Cajas</span>
                                </Link>
                            )}
                        </>
                    )}

                    {!location.pathname.startsWith('/admin') && (user?.role === 'admin' || user?.role === 'superadmin') && (
                        <Link title="Panel Admin" to="/admin" className={`flex items-center justify-center xl:justify-start px-2 xl:px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/admin' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                            <Shield className="w-5 h-5 xl:mr-3" /> <span className="hidden xl:block">Panel Admin</span>
                        </Link>
                    )}
                </nav>

                <div className="p-2 xl:p-4 bg-black/20 text-[10px] xl:text-sm flex flex-col items-center xl:items-start text-center xl:text-left">
                    <div className="mb-2 text-gray-300 hidden xl:block">
                        Usuario: <span className="text-white font-semibold">{user?.username}</span>
                    </div>
                    {projectDetails?.currency && (
                        <div className="mb-3 xl:mb-4 text-gray-300 hidden xl:block">Moneda: <span className="font-bold text-white">{projectDetails.currency}</span></div>
                    )}

                    <Link title="Cambiar Sucursal" to="/projects" className="flex items-center justify-center xl:justify-start gap-2 mb-3 text-gray-300 hover:text-white transition">
                        <ArrowLeftRight className="w-4 h-4 xl:w-4 xl:h-4" /> <span className="hidden xl:block">Cambiar Sucursal</span>
                    </Link>
                    <button onClick={handleLogout} title="Cerrar Sesión" className="w-full h-10 xl:h-auto flex items-center justify-center gap-2 bg-red-500/80 hover:bg-red-500 text-white rounded transition">
                        <LogOut className="w-4 h-4 xl:w-4 xl:h-4" /> <span className="hidden xl:block">Salir</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto md:p-4 xl:p-6 p-4">
                {children}
            </div>
        </div>
    );
};

export default Layout;
