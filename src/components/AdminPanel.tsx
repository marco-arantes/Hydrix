import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import type { UserRole } from '../types';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase.rpc('get_users_with_roles');
      if (rolesError) throw rolesError;

      const { data: profilesData, error: profilesError } = await supabase.from('user_profiles').select('*');
      if (profilesError) throw profilesError;

      const rolesMap = new Map((rolesData || []).map((r: any) => [r.id, r]));

      const mergedUsers = (profilesData || []).map((p: any) => ({
        id: p.id,
        email: rolesMap.get(p.id)?.email || 'Email não encontrado',
        role: rolesMap.get(p.id)?.role || 'CIDADÃO',
        name: p.name || '',
        birth_date: p.birth_date || '',
        municipality: p.municipality || ''
      }));

      setUsers(mergedUsers);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (userId: string, profileUpdates: any, newRole: UserRole) => {
    try {
      const { error } = await supabase.rpc('admin_update_user', {
        target_user_id: userId,
        p_name: profileUpdates.name || '',
        p_birth_date: profileUpdates.birth_date || null,
        p_municipality: profileUpdates.municipality || '',
        p_role: newRole
      });

      if (error) throw error;

      alert('Usuário salvo com sucesso!');
      await fetchUsers(); // Recarrega os dados e aguarda a conclusão
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário: ' + (error.message || error.error_description || 'Falha ao executar RPC.'));
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
    let valA = a[sortConfig.key] || '';
    let valB = b[sortConfig.key] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="admin-overlay" style={styles.overlay}>
      <div className="admin-modal" style={styles.modal}>
        <div style={styles.header}>
          <h2>Painel Administrativo</h2>
          <div>
            <button onClick={() => setShowCreateForm(!showCreateForm)} style={styles.newBtn}>
              {showCreateForm ? 'Cancelar' : '+ Novo Usuário'}
            </button>
            <button onClick={onClose} style={styles.closeBtn}>X</button>
          </div>
        </div>

        {showCreateForm && <CreateUserForm onCreated={() => { setShowCreateForm(false); fetchUsers(); }} />}

        {loading ? (
          <p>Carregando usuários...</p>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('email')}>
                    E-mail {sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    Nome {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('birth_date')}>
                    Nascimento {sortConfig.key === 'birth_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('municipality')}>
                    Município {sortConfig.key === 'municipality' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('role')}>
                    Nível Atual {sortConfig.key === 'role' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th style={styles.th}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <UserRow key={user.id} user={user} onSave={handleSaveUser} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, onSave }: { user: any, onSave: (id: string, updates: any, newRole: UserRole) => Promise<void> }) {
  const [name, setName] = useState(user.name);
  const [birthDate, setBirthDate] = useState(user.birth_date);
  const [municipality, setMunicipality] = useState(user.municipality);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  // Atualiza os states locais se a prop user mudar (ex: recarregamento pós-save)
  useEffect(() => {
    setName(user.name);
    setBirthDate(user.birth_date);
    setMunicipality(user.municipality);
    setRole(user.role);
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(user.id, { name, birth_date: birthDate, municipality }, role);
    setSaving(false);
  };

  return (
    <tr>
      <td style={styles.td}>{user.email}</td>
      <td style={styles.td}>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
      </td>
      <td style={styles.td}>
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={styles.input} />
      </td>
      <td style={styles.td}>
        <input type="text" value={municipality} onChange={(e) => setMunicipality(e.target.value)} style={styles.input} />
      </td>
      <td style={styles.td}>
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={styles.select}>
          <option value="ADMIN">Administrador</option>
          <option value="GESTOR">Gestor</option>
          <option value="CIDADÃO">Cidadão</option>
        </select>
      </td>
      <td style={styles.td}>
        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </td>
    </tr>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Cliente secundário para não deslogar o admin atual
      const secondarySupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error } = await secondarySupabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name, birthDate, municipality }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Força a atualização imediata ignorando RLS ou falhas na trigger
        const { error: rpcError } = await supabase.rpc('admin_update_user', {
          target_user_id: data.user.id,
          p_name: name || '',
          p_birth_date: birthDate || null,
          p_municipality: municipality || '',
          p_role: 'CIDADÃO'
        });
        if (rpcError) console.error('Aviso: falha ao forçar criação de perfil via RPC:', rpcError);
      }

      alert('Novo usuário criado com sucesso!');
      await onCreated();
    } catch (error: any) {
      console.error('Erro detalhado ao criar usuário:', error);
      alert('Erro ao criar usuário: ' + (error.message || error.error_description || 'Erro desconhecido.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.createForm}>
      <h3 style={{ margin: '0 0 10px 0' }}>Cadastrar Novo Usuário</h3>
      <div style={styles.formGrid}>
        <input required type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
        <input required type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
        <input required type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} style={styles.input} />
        <input required type="date" placeholder="Data de Nascimento" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={styles.input} />
        <input required type="text" placeholder="Município" value={municipality} onChange={e => setMunicipality(e.target.value)} style={styles.input} />
      </div>
      <button type="submit" disabled={loading} style={styles.createBtn}>
        {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
      </button>
    </form>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  modal: {
    backgroundColor: '#2d2d2d',
    padding: '2rem',
    borderRadius: '8px',
    width: '95%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#fff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '1.5rem',
    cursor: 'pointer',
    marginLeft: '15px'
  },
  newBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#4facfe',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  saveBtn: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  createForm: {
    backgroundColor: '#1a1a1a',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #444'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '10px'
  },
  createBtn: {
    gridColumn: '1 / -1',
    padding: '0.75rem',
    backgroundColor: '#4facfe',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px',
    borderBottom: '2px solid #444'
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #444'
  },
  select: {
    padding: '5px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px'
  },
  input: {
    padding: '5px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    width: '100%',
    minWidth: '120px'
  }
};
