import { useState } from 'react';
import { supabase } from '../lib/supabase';

const UGRHI4_MUNICIPALITIES = [
  "Altinópolis - SP", "Batatais - SP", "Brodowski - SP", "Caconde - SP", "Cajuru - SP", "Casa Branca - SP",
  "Cravinhos - SP", "Cássia dos Coqueiros - SP", "Divinolândia - SP", "Itobi - SP", "Jardinópolis - SP",
  "Luís Antônio - SP", "Mococa - SP", "Morro Agudo - SP", "Nuporanga - SP", "Orlândia - SP", "Pontal - SP",
  "Ribeirão Preto - SP", "Sales Oliveira - SP", "Santa Cruz da Esperança - SP", "Santa Cruz das Palmeiras - SP",
  "Santa Rita do Passa Quatro - SP", "Santa Rosa de Viterbo - SP", "Santo Antônio da Alegria - SP",
  "Serra Azul - SP", "Serrana - SP", "Sertãozinho - SP", "São João da Boa Vista - SP", "São José do Rio Pardo - SP",
  "São Sebastião da Grama - SP", "São Simão - SP", "Tambaú - SP", "Tapiratiba - SP", "Vargem Grande do Sul - SP",
  "Águas da Prata - SP"
];

export function Auth({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleResetPassword = async () => {
    if (!email) {
      alert('Por favor, preencha o campo de e-mail acima para receber o link de redefinição.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      alert('Instruções enviadas! Verifique sua caixa de entrada para redefinir a senha.');
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

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
        const { data, error } = await supabase.auth.signUp({
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

        // If email enumeration protection is on, Supabase returns a fake success but the user's identities array is empty
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          alert('E-mail já cadastrado! Utilize o Esqueci minha senha!');
          return;
        }

        alert('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
      }
    } catch (error: any) {
      const msg = error.error_description || error.message || '';
      if (!isLogin && (msg.toLowerCase().includes('already registered') || error.code === 'user_already_exists')) {
        alert('E-mail já cadastrado! Utilize o Esqueci minha senha!');
      } else {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={styles.container}>
      <div style={styles.card}>
        {onClose && (
          <button type="button" onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', marginTop: '-10px', marginRight: '-10px' }}>&times;</button>
        )}
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
              <select
                value={municipality}
                required
                onChange={(e) => setMunicipality(e.target.value)}
                style={styles.input}
              >
                <option value="" disabled>Selecione seu Município</option>
                {UGRHI4_MUNICIPALITIES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
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
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          style={styles.toggleBtn}
        >
          {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
        </button>
        {isLogin && (
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={loading}
            style={{ ...styles.toggleBtn, marginTop: '0.5rem', color: '#4facfe' }}
          >
            Esqueci minha senha
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    width: '100%',
    height: '100%',
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

export function UpdatePassword({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert('Senha atualizada com sucesso!');
      onComplete();
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Cadastre nova senha</h2>
        <form onSubmit={handleUpdate} style={styles.form}>
          <input
            type="password"
            placeholder="Nova senha"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Aguarde...' : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
