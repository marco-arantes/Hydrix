import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase.rpc('get_users_with_roles');
      if (rolesError) throw rolesError;

      const { data: profilesData, error: profilesError } = await supabase.from('user_profiles').select('*');
      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const mergedUsers = (rolesData || []).map((u: any) => ({
        ...u,
        name: profilesMap.get(u.id)?.name || '',
        birth_date: profilesMap.get(u.id)?.birth_date || '',
        municipality: profilesMap.get(u.id)?.municipality || ''
      }));

      setUsers(mergedUsers);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      alert('Nível de acesso atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar nível:', error);
      alert('Erro ao atualizar nível. Verifique se você tem permissão.');
    }
  };

  const updateProfileField = async (userId: string, field: string, value: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ [field]: value })
        .eq('id', userId);
        
      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, [field]: value } : u));
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil. Certifique-se de ter rodado o script SQL "supabase_admin_policy.sql".');
    }
  };

  return (
    <div className="admin-overlay" style={styles.overlay}>
      <div className="admin-modal" style={styles.modal}>
        <div style={styles.header}>
          <h2>Painel Administrativo</h2>
          <button onClick={onClose} style={styles.closeBtn}>X</button>
        </div>
        
        {loading ? (
          <p>Carregando usuários...</p>
        ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>E-mail</th>
                    <th style={styles.th}>Nome</th>
                    <th style={styles.th}>Nascimento</th>
                    <th style={styles.th}>Município</th>
                    <th style={styles.th}>Nível Atual</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>
                        <input
                          type="text"
                          defaultValue={user.name}
                          onBlur={(e) => {
                            if (e.target.value !== user.name) updateProfileField(user.id, 'name', e.target.value);
                          }}
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="date"
                          defaultValue={user.birth_date}
                          onBlur={(e) => {
                            if (e.target.value !== user.birth_date) updateProfileField(user.id, 'birth_date', e.target.value);
                          }}
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="text"
                          defaultValue={user.municipality}
                          onBlur={(e) => {
                            if (e.target.value !== user.municipality) updateProfileField(user.id, 'municipality', e.target.value);
                          }}
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        <select 
                          value={user.role} 
                          onChange={(e) => updateRole(user.id, e.target.value as UserRole)}
                          style={styles.select}
                        >
                          <option value="ADMIN">Administrador</option>
                          <option value="GESTOR">Gestor</option>
                          <option value="CIDADÃO">Cidadão</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}
      </div>
    </div>
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
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
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
    cursor: 'pointer'
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
