import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Clock, Shield, LogOut, ArrowLeftRight, Tag, BarChart2 } from 'lucide-react';
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
            <div className="md:hidden flex items-center justify-between bg-white p-3 shadow">
                <div className="flex items-center gap-3">
                    <button onClick={() => setOpen(!open)} className="p-2 rounded hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="text-lg font-bold">{projectDetails?.name || 'Multi-POS'}</div>
                </div>
            </div>
            {/* Sidebar Inyectando Color Dinámico como Style inline */}
            <div className={`fixed inset-y-0 left-0 z-40 w-64 transform ${open ? 'translate-x-0' : '-translate-x-full'} transition-transform md:translate-x-0 md:relative md:inset-auto text-white shadow-xl flex flex-col`} style={{ backgroundColor: themeColor }}>

                <div className="p-6">
                    <h1 className="text-2xl font-bold mb-2 flex flex-col items-center justify-center text-center">
                        {/* Renderizar Logo o Texto */}
                        {projectDetails?.logo_url ? (
                            <img
                                src={projectDetails.logo_url}
                                alt="Logo Sucursal"
                                className="w-24 h-24 object-contain bg-white rounded-lg p-1 mb-2 shadow-sm"
                            />
                        ) : (
                            <ShoppingCart className="w-10 h-10 mb-2" />
                        )}
                        {projectDetails?.name || 'Multi-POS'}
                    </h1>
                </div>

            {/* Overlay for mobile when sidebar is open */}
            <div
                className={`fixed inset-0 bg-black/50 z-30 md:hidden ${open ? 'block' : 'hidden'}`}
                onClick={() => setOpen(false)}
                aria-hidden="true"
            />

                <nav className="flex-1 mt-6">
                    {location.pathname.startsWith('/admin') ? (
                        <>
                            <Link to="/admin" className={`flex items-center px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/admin' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <Shield className="w-5 h-5 mr-3" /> Gestión Global
                            </Link>
                            {/* Aquí se pueden agregar más opciones maestras en el futuro */}
                        </>
                    ) : (
                        <>
                            <Link to="/" className={`flex items-center px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <ShoppingCart className="w-5 h-5 mr-3" /> Punto de Venta
                            </Link>
                            <Link to="/dashboard" className={`flex items-center px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/dashboard' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <BarChart2 className="w-5 h-5 mr-3" /> Dashboard
                            </Link>
                            <Link to="/inventory" className={`flex items-center px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/inventory' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <Package className="w-5 h-5 mr-3" /> Inventario
                            </Link>
                            <Link to="/promotions" className={`flex items-center px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/promotions' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <Tag className="w-5 h-5 mr-3" /> Promociones
                            </Link>
                            <Link to="/history" className={`flex items-center px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/history' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                                <Clock className="w-5 h-5 mr-3" /> Historial
                            </Link>
                        </>
                    )}

                    {!location.pathname.startsWith('/admin') && (user?.role === 'admin' || user?.role === 'superadmin') && (
                        <Link to="/admin" className={`flex items-center px-6 py-3 hover:bg-white/10 transition ${location.pathname === '/admin' ? 'bg-white/20 border-l-4 border-white' : ''}`}>
                            <Shield className="w-5 h-5 mr-3" /> Panel Admin
                        </Link>
                    )}
                </nav>

                <div className="p-3 md:p-4 bg-black/20 text-xs md:text-sm">
                    <div className="mb-2 text-gray-300">
                        Usuario: <span className="text-white font-semibold">{user?.username} ({user?.role})</span>
                    </div>
                    {projectDetails?.currency && (
                        <div className="mb-3 md:mb-4 text-gray-300">Moneda Base: <span className="font-bold text-white">{projectDetails.currency}</span></div>
                    )}

                    <Link to="/projects" className="flex items-center gap-2 mb-3 text-gray-300 hover:text-white transition text-xs md:text-sm">
                        <ArrowLeftRight className="w-3 h-3 md:w-4 md:h-4" /> Cambiar Sucursal
                    </Link>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/80 hover:bg-red-500 text-white p-2 md:p-2 rounded transition text-xs md:text-sm">
                        <LogOut className="w-3 h-3 md:w-4 md:h-4" /> Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto md:p-6 p-4">
                {children}
            </div>
        </div>
    );
};

export default Layout;
