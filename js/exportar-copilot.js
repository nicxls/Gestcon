// Exportação completa de dados para o Microsoft 365 Copilot (OneDrive)

async function exportarDadosCopilot() {
  if (sessionStorage.getItem('gestcon_papel') !== 'master') {
    alert("Apenas usuários master podem exportar a base completa.");
    return;
  }

  try {
    // Importa dinamicamente a instância do Supabase
    const { supabase } = await import('./supabase.js');

    const btn = document.getElementById('btn-exportar-copilot');
    if (btn) {
      btn.innerHTML = '<span>⏳ Gerando Excel...</span>';
      btn.style.pointerEvents = 'none';
    }

    // 1. Buscar Empresas
    const { data: empresas, error: errEmp } = await supabase
      .from('empresas')
      .select('*');
    if (errEmp) throw errEmp;

    // 2. Buscar Contratos
    const { data: contratos, error: errContr } = await supabase
      .from('contratos')
      .select('*');
    if (errContr) throw errContr;

    // 3. Buscar Postos
    const { data: postos, error: errPostos } = await supabase
      .from('postos')
      .select('*');
    if (errPostos) throw errPostos;

    // 4. Cruzar os dados (Gerar uma tabela plana / desnormalizada para a IA)
    // Para cada posto, encontrar o contrato e a empresa. 
    // Se um contrato não tem postos, incluímos o contrato sozinho.
    // Se uma empresa não tem contratos, incluímos a empresa sozinha.

    const dadosExportacao = [];

    // Mapeamentos para busca rápida
    const mapaEmpresas = {};
    empresas.forEach(emp => mapaEmpresas[emp.id] = emp);

    const mapaContratos = {};
    contratos.forEach(c => mapaContratos[c.id] = c);

    // Conjuntos para rastrear o que já foi incluído
    const contratosComPostos = new Set();
    const empresasComContratos = new Set();

    // 4.1 Adicionar todos os postos (com dados de contrato e empresa)
    postos.forEach(posto => {
      const contrato = mapaContratos[posto.contrato_id];
      let empresa = null;
      if (contrato) {
        contratosComPostos.add(contrato.id);
        empresa = mapaEmpresas[contrato.empresa_id];
        if (empresa) empresasComContratos.add(empresa.id);
      }

      dadosExportacao.push({
        'ID Empresa': empresa ? empresa.id : '',
        'Nome Empresa': empresa ? empresa.nome : '',
        'CNPJ Empresa': empresa ? empresa.cnpj : '',
        'Número Contrato': contrato ? contrato.numero_contrato : '',
        'Tipo Contrato': contrato ? contrato.tipo_contrato : '',
        'Situação Contrato': contrato ? contrato.situacao : '',
        'Motivo Dispensa': contrato ? contrato.motivo_dispensa : '',
        'Proc. Contrat. Anterior': contrato ? contrato.processo_contratacao_anterior : '',
        'Lei': contrato ? contrato.lei : '',
        'Conta Vinculada': contrato ? contrato.conta_vinculada : '',
        'Processo Licitação': contrato ? contrato.processo_licitacao : '',
        'Edital': contrato ? contrato.edital : '',
        'Processo Contratação': contrato ? contrato.processo_contratacao : '',
        'Serviço': contrato ? contrato.servico : '',
        'Quantidade Postos (Prevista)': contrato ? contrato.quantidade_postos : '',
        'CRE': contrato ? contrato.cre : '',
        'Valor Mensal': contrato ? contrato.valor_mensal : '',
        'Vigência Início': contrato ? contrato.vigencia_inicio : '',
        'Vigência Fim': contrato ? contrato.vigencia_fim : '',
        'Número do Posto': posto.numero_posto,
        'Status do Posto': posto.status,
        'Nome Funcionário': posto.nome_funcionario || '',
        'CPF Funcionário': posto.cpf_funcionario || ''
      });
    });

    // 4.2 Adicionar contratos sem postos
    contratos.forEach(contrato => {
      if (!contratosComPostos.has(contrato.id)) {
        const empresa = mapaEmpresas[contrato.empresa_id];
        if (empresa) empresasComContratos.add(empresa.id);

        dadosExportacao.push({
          'ID Empresa': empresa ? empresa.id : '',
          'Nome Empresa': empresa ? empresa.nome : '',
          'CNPJ Empresa': empresa ? empresa.cnpj : '',
          'Número Contrato': contrato.numero_contrato,
          'Tipo Contrato': contrato.tipo_contrato,
          'Situação Contrato': contrato.situacao,
          'Motivo Dispensa': contrato.motivo_dispensa,
          'Proc. Contrat. Anterior': contrato.processo_contratacao_anterior,
          'Lei': contrato.lei,
          'Conta Vinculada': contrato.conta_vinculada,
          'Processo Licitação': contrato.processo_licitacao,
          'Edital': contrato.edital,
          'Processo Contratação': contrato.processo_contratacao,
          'Serviço': contrato.servico,
          'Quantidade Postos (Prevista)': contrato.quantidade_postos,
          'CRE': contrato.cre,
          'Valor Mensal': contrato.valor_mensal,
          'Vigência Início': contrato.vigencia_inicio,
          'Vigência Fim': contrato.vigencia_fim,
          'Número do Posto': 'N/A',
          'Status do Posto': 'N/A',
          'Nome Funcionário': 'N/A',
          'CPF Funcionário': 'N/A'
        });
      }
    });

    // 4.3 Adicionar empresas sem contratos
    empresas.forEach(empresa => {
      if (!empresasComContratos.has(empresa.id)) {
        dadosExportacao.push({
          'ID Empresa': empresa.id,
          'Nome Empresa': empresa.nome,
          'CNPJ Empresa': empresa.cnpj,
          'Número Contrato': 'N/A',
          'Tipo Contrato': 'N/A',
          'Situação Contrato': 'N/A',
          'Motivo Dispensa': 'N/A',
          'Proc. Contrat. Anterior': 'N/A',
          'Lei': 'N/A',
          'Conta Vinculada': 'N/A',
          'Processo Licitação': 'N/A',
          'Edital': 'N/A',
          'Processo Contratação': 'N/A',
          'Serviço': 'N/A',
          'Quantidade Postos (Prevista)': 'N/A',
          'CRE': 'N/A',
          'Valor Mensal': 'N/A',
          'Vigência Início': 'N/A',
          'Vigência Fim': 'N/A',
          'Número do Posto': 'N/A',
          'Status do Posto': 'N/A',
          'Nome Funcionário': 'N/A',
          'CPF Funcionário': 'N/A'
        });
      }
    });

    // 5. Garantir que a biblioteca SheetJS (XLSX) está carregada
    if (typeof XLSX === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // 6. Gerar o arquivo Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExportacao);
    
    // Auto-ajustar largura das colunas
    const colunas = Object.keys(dadosExportacao[0] || {});
    const wscols = colunas.map(col => ({ wch: Math.max(col.length, 15) }));
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Base Unificada Copilot");

    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `GestCon_Base_Completa_${dataAtual}.xlsx`);

  } catch (error) {
    console.error("Erro ao exportar dados:", error);
    alert("Erro ao exportar dados. Verifique o console.");
  } finally {
    const btn = document.getElementById('btn-exportar-copilot');
    if (btn) {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="m9 15 6 6M15 15l-6 6"></path></svg><span>Exportar para IA</span>';
      btn.style.pointerEvents = 'auto';
    }
  }
}
