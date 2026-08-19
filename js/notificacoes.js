import { supabase } from './supabase.js';

export async function carregarNotificacoes() {
  // O HTML do sino já está no HTML estático de cada página.
  // Aqui apenas conectamos os eventos e buscamos os dados.
  const btn = document.getElementById('btn-notificacoes');
  const dropdown = document.getElementById('dropdown-notificacoes');
  const divSino = document.getElementById('container-notificacoes');

  if (!btn || !dropdown || !divSino) return;

  // Lógica do dropdown (toggle ao clicar)
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
      .eq('situacao', 'ativo');

    if (error) throw error;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

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

    // Ordenar do pior para o melhor
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
    const lista = document.getElementById('lista-notificacoes');
    if (lista) lista.innerHTML = '<div class="estado-vazio-notificacao">Erro ao carregar alertas.</div>';
  }
}

// Iniciar automaticamente
carregarNotificacoes();
