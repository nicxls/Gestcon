// ==========================================
// Configuração de Conexão com o Supabase
// ==========================================

// Importação da biblioteca Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 🔴 ATENÇÃO: COLOQUE AQUI AS SUAS CHAVES DO SUPABASE 🔴
const supabaseUrl = 'COLE_AQUI_A_SUA_PROJECT_URL';
const supabaseKey = 'COLE_AQUI_A_SUA_PUBLISHABLE_API_KEY';

// Criação do cliente para uso nas outras telas
export const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// Funções Auxiliares de Autenticação e Sessão
// ==========================================

// Transforma a matrícula num "e-mail falso" para o Supabase Auth aceitar
export function gerarEmailDaMatricula(matricula) {
    return `${matricula}@gestcon.local`;
}

// Verifica se existe um usuário logado no momento
export async function obterSessaoAtual() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return data.session;
}

// Busca os detalhes do perfil do usuário logado (se é admin, master, etc)
export async function obterPerfilLogado() {
    const sessao = await obterSessaoAtual();
    if (!sessao) return null;

    const { data: perfil, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', sessao.user.id)
        .single();
        
    if (error) {
        console.error("Erro ao buscar perfil:", error);
        return null;
    }
    
    return perfil;
}

// Faz o logout do sistema
export async function fazerLogout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}
