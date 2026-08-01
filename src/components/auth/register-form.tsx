import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';

export function RegisterForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
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
      await auth.register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-20 space-y-4">
      <h2 className="text-xl font-bold text-center">注册</h2>
      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded">{error}</div>}
      <input
        type="text"
        placeholder="用户名 (2-30 字符)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        required
        minLength={2}
        maxLength={30}
      />
      <input
        type="email"
        placeholder="邮箱"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        required
      />
      <input
        type="password"
        placeholder="密码 (至少 6 字符)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        required
        minLength={6}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '注册中...' : '注册'}
      </button>
      <p className="text-center text-sm text-gray-500">
        已有账号？<Link to="/login" className="text-blue-600 hover:underline">登录</Link>
      </p>
    </form>
  );
}
