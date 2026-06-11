import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              name,
              birthDate,
              municipality
            }
          }
        });
        if (error) throw error;
        alert('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
      }
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{isLogin ? 'Entrar no Sistema' : 'Criar Conta'}</h2>
        <form onSubmit={handleAuth} style={styles.form}>
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Seu Nome Completo"
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
              />
              <input
                type="date"
                placeholder="Data de Nascimento"
                value={birthDate}
                required
                onChange={(e) => setBirthDate(e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Município"
                value={municipality}
                required
                onChange={(e) => setMunicipality(e.target.value)}
                style={styles.input}
              />
            </>
          )}
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>
        <button 
          onClick={() => setIsLogin(!isLogin)} 
          style={styles.toggleBtn}
        >
          {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    color: '#fff'
  },
  card: {
    padding: '2rem',
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center' as const,
    marginBottom: '1.5rem',
    color: '#4facfe'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  input: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #444',
    backgroundColor: '#3d3d3d',
    color: '#fff',
    fontSize: '1rem'
  },
  button: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#4facfe',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  toggleBtn: {
    marginTop: '1rem',
    background: 'none',
    border: 'none',
    color: '#bbb',
    cursor: 'pointer',
    width: '100%',
    textDecoration: 'underline'
  }
};
