import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Title, Input, Button } from 'animal-island-ui';
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
    <div style={{ maxWidth: 400, margin: '60px auto', padding: '0 16px' }}>
      <Title size="large" color="app-green">注册</Title>
      <Card style={{ marginTop: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ background: '#fff0f0', color: '#d32f2f', padding: '10px 14px', borderRadius: 12, fontSize: 13 }}>{error}</div>}
          <Input placeholder="用户名 (2-30 字符)" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2} maxLength={30} />
          <Input placeholder="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input placeholder="密码 (至少 6 字符)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Button type="primary" block htmlType="submit" loading={loading}>{loading ? '注册中...' : '注册'}</Button>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--animal-text-secondary)' }}>
            已有账号？<Link to="/login" style={{ color: 'var(--animal-primary-color)' }}>登录</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
