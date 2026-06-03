import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Lock, User } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('[Login] submit', { username, password: password ? '***' : '' });
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/projects');
        } catch (err) {
            console.error('[Login] error', err);
            setError(err.response?.data?.detail || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-primary-bg) 0%, #ffffff 100%)' }}>
            {/* Decoraciones de fondo */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'var(--color-primary)' }}></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-10" style={{ background: 'var(--color-accent)' }}></div>
            
            <div className="max-w-sm w-full bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 p-8 relative z-10 transition-all">
                <div className="text-center mb-10">
                    <div className="text-white w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl overflow-hidden bg-white"
                        style={{ 
                            boxShadow: '0 15px 35px -5px color-mix(in srgb, var(--color-primary) 50%, transparent)' 
                        }}>
                        <img 
                            src="/logo.png" 
                            alt="Logo Bodego" 
                            className="w-full h-full object-contain p-2" 
                            onError={(e) => { 
                                e.target.style.display='none'; 
                                e.target.nextSibling.style.display='flex'; 
                            }} 
                        />
                        <div className="hidden w-full h-full items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}>
                            <Lock className="w-10 h-10" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Bodego POS</h2>
                    <p className="text-slate-500 mt-2 font-medium">Ingresa para administrar tu sucursal</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold mb-6 border border-red-100 flex items-center justify-center gap-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Usuario</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-opacity-20 focus:outline-none transition-all font-medium text-slate-700"
                                style={{ '--tw-ring-color': 'var(--color-primary)' }}
                                placeholder="tu_usuario"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-opacity-20 focus:outline-none transition-all font-medium text-slate-700"
                                style={{ '--tw-ring-color': 'var(--color-primary)' }}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 px-4 text-white rounded-2xl font-black text-lg focus:outline-none transition-all shadow-xl flex justify-center items-center hover:-translate-y-1 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        style={{ 
                            background: 'linear-gradient(135deg, var(--color-accent) 0%, #d83f0d 100%)',
                            boxShadow: '0 10px 25px -5px color-mix(in srgb, var(--color-accent) 50%, transparent)'
                        }}
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>

                    <div className="text-center mt-8 space-y-2">
                        <p className="text-xs text-slate-600 font-bold bg-slate-100 py-2 rounded-lg inline-block px-4">
                            Soporte / Llamadas o WhatsApp: <span className="text-blue-600">936330376</span>
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                            bodego.app - Todos los derechos reservados &copy; {new Date().getFullYear()}
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
