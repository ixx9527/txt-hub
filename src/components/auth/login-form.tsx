import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';

export function LoginForm() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.login(login, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-20 space-y-4">
      <h2 className="text-xl font-bold text-center">登录</h2>
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}
      <input
        type="text"
        placeholder="用户名或邮箱"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        required
      />
      <input
        type="password"
        placeholder="密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '登录中...' : '登录'}
      </button>
      <p className="text-center text-sm text-gray-500">
        没有账号？<Link to="/register" className="text-blue-600 hover:underline">注册</Link>
      </p>
    </form>
  );
}
