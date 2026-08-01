import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Title, Input, Button } from 'animal-island-ui';
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
    <div style={{ maxWidth: 400, margin: '60px auto', padding: '0 16px' }}>
      <Title size="large" color="app-blue">登录</Title>
      <Card style={{ marginTop: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ background: '#fff0f0', color: '#d32f2f', padding: '10px 14px', borderRadius: 12, fontSize: 13 }}>{error}</div>}
          <Input placeholder="用户名或邮箱" value={login} onChange={(e) => setLogin(e.target.value)} required />
          <Input placeholder="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="primary" block htmlType="submit" loading={loading}>{loading ? '登录中...' : '登录'}</Button>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--animal-text-secondary)' }}>
            没有账号？<Link to="/register" style={{ color: 'var(--animal-primary-color)' }}>注册</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
