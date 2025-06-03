import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from 'https://unpkg.com/strateegia-api/strateegia-api.js';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await auth(username, password);
      localStorage.setItem('strateegiaAccessToken', token);
      navigate('/main');
    } catch (_err) {
      alert('Authentication failed');
    }
  };

  return (
    <div className="container p-5 d-flex justify-content-center">
      <form className="form-group" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="username" className="form-label">seu login em strateegia</label>
          <input id="username" className="form-control" type="email" value={username} onChange={(e)=>setUsername(e.target.value)} />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">sua senha em strateegia</label>
          <input id="password" className="form-control" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <div className="d-flex justify-content-center">
          <button className="btn btn-primary btn-md">entrar</button>
        </div>
      </form>
    </div>
  );
}
