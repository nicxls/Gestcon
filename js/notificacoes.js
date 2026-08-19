import { supabase } from './supabase.js';

export async function carregarNotificacoes() {
  const container = document.querySelector('.barra-superior');
  if (!container) return;

  // Impede de criar mais de uma vez (caso a função seja chamada múltiplas vezes)
  if (document.getElementById('container-notificacoes')) return;

  // Encontra onde injetar o sino (antes do botao de tema)
  const botaoTema = container.querySelector('.botao-tema');
  if (!botaoTema) return;

  // Injetar HTML do sino
  const divSino = document.createElement('div');
  divSino.className = 'container-notificacoes';
  divSino.id = 'container-notificacoes';
  divSino.innerHTML = `
    <button type="button" class="botao-sino" aria-label="Notificações" id="btn-notificacoes">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      <span class="badge-notificacao" id="badge-notificacao" style="display: none;">0</span>
    </button>
    <div class="dropdown-notificacoes" id="dropdown-notificacoes">
      <div class="dropdown-notificacoes-header">
        <span>Notificações de Vigência</span>
      </div>
      <div class="dropdown-notificacoes-body" id="lista-notificacoes">
        <div class="estado-vazio-notificacao">Carregando...</div>
      </div>
    </div>
  `;
  container.insertBefore(divSino, botaoTema);

  // Lógica do dropdown
  const btn = document.getElementById('btn-notificacoes');
  const dropdown = document.getElementById('dropdown-notificacoes');
  
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('aberto');
  });

  document.addEventListener('click', (e) => {
    if (!divSino.contains(e.target)) {
      dropdown.classList.remove('aberto');
    }
  });

  // Busca dados de contratos ativos
  try {
    const { data: contratos, error } = await supabase
      .from('contratos')
      .select('id, numero_contrato, processo_contratacao, vigencia_fim')
      .eq('ativo', true);

    if (error) throw error;

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const alertas = [];

    contratos.forEach(c => {
      if (!c.vigencia_fim) return;
      const partes = c.vigencia_fim.split('-');
      const dataFim = new Date(partes[0], partes[1] - 1, partes[2]);
      
      const difTempo = dataFim.getTime() - hoje.getTime();
      const dias = Math.ceil(difTempo / (1000 * 3600 * 24));
      
      let situacao = '';
      let classeSelo = '';
      if (dias < 0) {
        situacao = 'Vencido';
        classeSelo = 'vencido';
      } else if (dias <= 30) {
        situacao = 'Crítico';
        classeSelo = 'critico';
      } else if (dias <= 90) {
        situacao = 'Atenção';
        classeSelo = 'atencao';
      }

      if (situacao) {
        alertas.push({
          contrato: c.numero_contrato || c.processo_contratacao,
          dias: dias,
          situacao: situacao,
          classeSelo: classeSelo
        });
      }
    });

    // Ordenar do pior para o melhor (dias crescentes)
    alertas.sort((a, b) => a.dias - b.dias);

    const badge = document.getElementById('badge-notificacao');
    const lista = document.getElementById('lista-notificacoes');

    if (alertas.length > 0) {
      badge.textContent = alertas.length;
      badge.style.display = 'block';

      lista.innerHTML = alertas.map(a => {
        let textoVencimento = '';
        if (a.dias < 0) {
            textoVencimento = 'Venceu há ' + Math.abs(a.dias) + ' dias';
        } else if (a.dias === 0) {
            textoVencimento = 'Vence hoje';
        } else {
            textoVencimento = 'Vence em ' + a.dias + ' dias';
        }

        return `
            <div class="item-notificacao">
            <strong>Contrato ${a.contrato}</strong>
            <span>${textoVencimento}</span>
            <div class="selo-alerta ${a.classeSelo}">${a.situacao}</div>
            </div>
        `;
      }).join('');
    } else {
      lista.innerHTML = '<div class="estado-vazio-notificacao">Nenhum contrato em alerta de vigência.</div>';
    }

  } catch (err) {
    console.error('Erro ao carregar notificações:', err);
    document.getElementById('lista-notificacoes').innerHTML = '<div class="estado-vazio-notificacao">Erro ao carregar alertas.</div>';
  }
}

// Iniciar automaticamente
carregarNotificacoes();
