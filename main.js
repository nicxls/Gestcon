document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // INITIALIZATION & STATE
    // ==========================================
    cleanUpLocalStorage();
    initAuthSystem();
    initTheme();
    initNavigation();
    loadDashboardStats();
    loadEmpresasTable();
    loadContratosTable();
    populateEmpresasSelect();

    function cleanUpLocalStorage() {
        let emps = JSON.parse(localStorage.getItem('empresas') || '[]');
        if (emps.some(e => e.razao === 'undefined' || !e.razao)) {
            emps = emps.filter(e => e.razao && e.razao !== 'undefined');
            localStorage.setItem('empresas', JSON.stringify(emps));
        }

        let cons = JSON.parse(localStorage.getItem('contratos') || '[]');
        if (cons.some(c => !c.tipo || c.tipo === 'undefined')) {
            cons = cons.filter(c => c.tipo && c.tipo !== 'undefined');
            localStorage.setItem('contratos', JSON.stringify(cons));
        }
    }

    // ==========================================
    // AUTHENTICATION SYSTEM
    // ==========================================
    function initAuthSystem() {
        // Seed default master account if empty
        const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
        if (users.length === 0) {
            users.push({ user: 'nicolas-silva', pass: 'inter2017', role: 'master' });
            localStorage.setItem('registered_users', JSON.stringify(users));
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            applyLogin(currentUser);
        } else {
            showLoginScreen();
        }

        setupAuthEvents();
    }

    function showLoginScreen() {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        document.body.className = '';
    }

    function applyLogin(user) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.body.className = `role-${user.role}`;

        // Setup username in topbar
        const topbarName = document.querySelector('.topbar h2');
        if (topbarName) {
            let label = user.role === 'guest' ? 'Convidado' : user.user;
            topbarName.textContent = `Bem-vindo, ${label}`;
        }

        // Notify pending requests if master
        if (user.role === 'master') {
            updateBadgeRequests();
            loadAprovacoesTable();
        }
    }

    function showBeautifulAlert(title, message, isError = false) {
        const modal = document.getElementById('message-modal');
        const iconDiv = document.getElementById('msg-icon');
        
        document.getElementById('msg-title').textContent = title;
        document.getElementById('msg-text').textContent = message;
        
        if (isError) {
            iconDiv.style.background = 'var(--danger-color)';
            iconDiv.innerHTML = "<i class='bx bx-error'></i>";
        } else {
            iconDiv.style.background = 'var(--success-color)';
            iconDiv.innerHTML = "<i class='bx bx-check'></i>";
        }
        
        modal.classList.remove('form-hidden');
        
        document.getElementById('btn-msg-ok').onclick = () => {
            modal.classList.add('form-hidden');
        };
    }

    function setupAuthEvents() {
        // Form Toggle
        const btnShowRequest = document.getElementById('btn-show-request');
        const btnCancelRequest = document.getElementById('btn-cancel-request');
        const loginBox = document.getElementById('login-form-box');
        const requestBox = document.getElementById('request-form-box');

        btnShowRequest.addEventListener('click', () => {
            loginBox.style.display = 'none';
            requestBox.style.display = 'block';
        });

        btnCancelRequest.addEventListener('click', () => {
            requestBox.style.display = 'none';
            loginBox.style.display = 'block';
        });

        // Login as Convidado
        document.getElementById('btn-do-guest').addEventListener('click', () => {
            const user = { user: 'convidado', role: 'guest' };
            localStorage.setItem('currentUser', JSON.stringify(user));
            applyLogin(user);
            showToast('Conectado como Convidado.', 'success');
        });

        // Logout
        document.getElementById('btn-logout').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            showLoginScreen();
            showToast('Você saiu do sistema.', 'success');
        });

        // Do regular Login
        document.getElementById('btn-do-login').addEventListener('click', () => {
            const userIn = document.getElementById('login-user').value.trim();
            const passIn = document.getElementById('login-pass').value.trim();

            if (!userIn || !passIn) return showBeautifulAlert('Campos Vazios', 'Preencha o usuário e a senha.', true);

            const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
            const found = users.find(u => u.user === userIn && u.pass === passIn);

            if (found) {
                localStorage.setItem('currentUser', JSON.stringify({ user: found.user, role: found.role }));
                applyLogin({ user: found.user, role: found.role });
                showToast('Login efetuado com sucesso!', 'success');
            } else {
                showBeautifulAlert('Acesso Negado', 'Usuário ou senha inválidos!', true);
            }
        });

        // Real-time username check
        const reqUserInput = document.getElementById('req-user');
        const reqUserError = document.getElementById('req-user-error');
        reqUserInput.addEventListener('input', (e) => {
            const u = e.target.value.trim();
            const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
            const reqs = JSON.parse(localStorage.getItem('access_requests') || '[]');
            
            if (users.find(usr => usr.user === u) || reqs.find(r => r.user === u && r.status === 'pendente')) {
                reqUserError.style.display = 'block';
                reqUserInput.style.borderColor = 'var(--danger-color)';
            } else {
                reqUserError.style.display = 'none';
                reqUserInput.style.borderColor = 'var(--border-color)';
            }
        });

        // Submit Request
        document.getElementById('btn-submit-request').addEventListener('click', () => {
            const u = reqUserInput.value.trim();
            const e = document.getElementById('req-email').value.trim();
            const p = document.getElementById('req-pass').value.trim();

            if (!u || !e || !p) return showBeautifulAlert('Campos Obrigatórios', 'Preencha todos os campos para solicitar acesso.', true);
            
            // Email Validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(e)) {
                return showBeautifulAlert('E-mail Inválido', 'Por favor, informe um endereço de e-mail válido.', true);
            }

            const reqs = JSON.parse(localStorage.getItem('access_requests') || '[]');
            const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
            
            // Re-check
            if (users.find(usr => usr.user === u) || reqs.find(r => r.user === u && r.status === 'pendente')) {
                showBeautifulAlert('Atenção', 'Este usuário já está registrado ou aguardando aprovação.', true);
                return;
            }

            reqs.push({ id: Date.now().toString(), user: u, email: e, pass: p, status: 'pendente' });
            localStorage.setItem('access_requests', JSON.stringify(reqs));

            showBeautifulAlert('Acesso solicitado.', 'Seu pedido foi enviado para o administrador e aguarda aprovação.', false);
            btnCancelRequest.click();
            reqUserInput.value = '';
            reqUserInput.style.borderColor = 'var(--border-color)';
            reqUserError.style.display = 'none';
            document.getElementById('req-email').value = '';
            document.getElementById('req-pass').value = '';
        });
    }

    // ==========================================
    // APROVAÇÕES (SECRET TAB) -> Master only
    // ==========================================
    function updateBadgeRequests() {
        const reqs = JSON.parse(localStorage.getItem('access_requests') || '[]');
        const pends = reqs.filter(r => r.status === 'pendente').length;
        const badge = document.getElementById('badge-requests');
        if (pends > 0) {
            badge.textContent = pends;
            badge.style.opacity = '1';
        } else {
            badge.style.opacity = '0';
        }
    }

    function loadAprovacoesTable() {
        const tbody = document.getElementById('lista-aprovacoes');
        if (!tbody) return;
        const reqs = JSON.parse(localStorage.getItem('access_requests') || '[]').filter(r => r.status === 'pendente');
        const users = JSON.parse(localStorage.getItem('registered_users') || '[]').filter(u => u.role === 'admin');

        tbody.innerHTML = '';

        if (reqs.length === 0 && users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-light)">Nenhum dado encontrado.</td></tr>`;
            return;
        }

        reqs.forEach(req => {
            const tr = document.createElement('tr');
            const actions = `
                <button class="btn-icon" onclick="decideRequest('${req.id}', 'aceitar')" title="Aceitar" style="color:var(--success-color)"><i class='bx bx-check-circle'></i></button>
                <button class="btn-icon" onclick="decideRequest('${req.id}', 'recusar')" title="Recusar" style="color:var(--danger-color)"><i class='bx bx-x-circle'></i></button>
            `;
            tr.innerHTML = `
                <td>${req.user}</td>
                <td>${req.email}</td>
                <td><span class="badge Pendente">PENDENTE</span></td>
                <td>${actions}</td>
            `;
            tbody.appendChild(tr);
        });

        users.forEach(usr => {
            const tr = document.createElement('tr');
            const actions = `
                <button class="btn-icon" onclick="revokeAdmin('${usr.user}')" title="Remover Permissão" style="color:var(--danger-color)"><i class='bx bx-user-minus'></i></button>
            `;
            tr.innerHTML = `
                <td>${usr.user}</td>
                <td>-</td>
                <td><span class="badge Ativo">ADMIN ATIVO</span></td>
                <td>${actions}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.revokeAdmin = function (username) {
        if (confirm(`Tem certeza que deseja REVOGAR a permissão de administrador de '${username}'?`)) {
            let users = JSON.parse(localStorage.getItem('registered_users') || '[]');
            users = users.filter(u => u.user !== username);
            localStorage.setItem('registered_users', JSON.stringify(users));
            showToast(`Acesso de ${username} revogado!`, 'success');
            loadAprovacoesTable();
        }
    }

    window.decideRequest = function (id, acao) {
        let reqs = JSON.parse(localStorage.getItem('access_requests') || '[]');
        const index = reqs.findIndex(r => r.id === id);
        if (index > -1) {
            if (acao === 'aceitar') {
                reqs[index].status = 'aprovado';
                // push to users
                let users = JSON.parse(localStorage.getItem('registered_users') || '[]');
                users.push({ user: reqs[index].user, pass: reqs[index].pass, role: 'admin' });
                localStorage.setItem('registered_users', JSON.stringify(users));
                showToast('Acesso aprovado com sucesso!', 'success');
            } else {
                reqs[index].status = 'recusado';
                showToast('Acesso recusado.', 'error');
            }
            localStorage.setItem('access_requests', JSON.stringify(reqs));
            loadAprovacoesTable();
            updateBadgeRequests();
        }
    }

    // ==========================================
    // THEME TOGGLE
    // ==========================================
    const themeToggleBtn = document.querySelector('.theme-toggle');
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    });

    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    // ==========================================
    // NAVIGATION (SPA)
    // ==========================================
    function initNavigation() {
        const navLinks = document.querySelectorAll('.nav-links a');
        const views = document.querySelectorAll('.view');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-target');

                // Update active link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Update view
                views.forEach(v => {
                    v.classList.remove('active-view');
                    if (v.id === targetId) {
                        v.classList.add('active-view');
                    }
                });

                // Refresh data if needed
                if (targetId === 'dashboard') loadDashboardStats();
                if (targetId === 'contratos') populateEmpresasSelect();
            });
        });
    }

    // ==========================================
    // NOTIFICATIONS (TOASTS)
    // ==========================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'bx-check-circle' : 'bx-error-circle';

        toast.innerHTML = `
            <i class='bx ${icon}' style="font-size: 24px;"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // ==========================================
    // LOCAL STORAGE HELPERS
    // ==========================================
    function getEmpresas() {
        return JSON.parse(localStorage.getItem('empresas') || '[]');
    }

    function saveEmpresas(empresas) {
        localStorage.setItem('empresas', JSON.stringify(empresas));
        loadDashboardStats();
    }

    function getContratos() {
        return JSON.parse(localStorage.getItem('contratos') || '[]');
    }

    function saveContratos(contratos) {
        localStorage.setItem('contratos', JSON.stringify(contratos));
        loadDashboardStats();
    }

    // ==========================================
    // DASHBOARD
    // ==========================================
    function loadDashboardStats() {
        const empresasCount = getEmpresas().length;
        const contratosCount = getContratos().length;
        document.getElementById('count-empresas').textContent = empresasCount;
        document.getElementById('count-contratos').textContent = contratosCount;
    }

    // ==========================================
    // EMPRESAS LOGIC
    // ==========================================
    const btnNovoEmpresa = document.getElementById('btn-novo-empresa');
    const formEmpresaContainer = document.getElementById('form-empresa-container');
    const btnCancelEmpresa = document.getElementById('btn-cancel-empresa');
    const formEmpresa = document.getElementById('form-empresa');
    let editingEmpresaId = null;

    // Mascaras e Validação CNPJ
    function maskCNPJ(v) {
        v = v.replace(/\D/g, "");
        v = v.replace(/^(\d{2})(\d)/, "$1.$2");
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
        return v.substring(0, 18);
    }

    function maskPhone(v) {
        v = v.replace(/\D/g, "");
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d)(\d{4})$/, "$1-$2");
        return v.substring(0, 15);
    }

    function validarCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]+/g, '');
        if (cnpj == '') return false;
        if (cnpj.length != 14) return false;
        if (/^(\d)\1+$/.test(cnpj)) return false;

        let tamanho = cnpj.length - 2;
        let numeros = cnpj.substring(0, tamanho);
        let digitos = cnpj.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado != parseInt(digitos.charAt(0))) return false;

        tamanho = tamanho + 1;
        numeros = cnpj.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        return resultado == parseInt(digitos.charAt(1));
    }

    document.getElementById('emp-cnpj').addEventListener('input', (e) => {
        e.target.value = maskCNPJ(e.target.value);
    });

    document.getElementById('emp-telefone').addEventListener('input', (e) => {
        e.target.value = maskPhone(e.target.value);
    });

    btnNovoEmpresa.addEventListener('click', () => {
        editingEmpresaId = null;
        formEmpresa.reset();
        formEmpresaContainer.classList.remove('form-hidden');
    });

    btnCancelEmpresa.addEventListener('click', () => {
        formEmpresaContainer.classList.add('form-hidden');
    });

    formEmpresa.addEventListener('submit', (e) => {
        e.preventDefault();

        const cnpjVal = document.getElementById('emp-cnpj').value;
        if (!validarCNPJ(cnpjVal)) {
            showBeautifulAlert('Erro de Validação', 'O CNPJ informado não é válido!', true);
            return;
        }

        const newEmpresa = {
            id: editingEmpresaId ? editingEmpresaId : Date.now().toString(),
            razao: document.getElementById('emp-razao').value,
            cnpj: cnpjVal,
            email: document.getElementById('emp-email').value,
            telefone: document.getElementById('emp-telefone').value
        };

        const empresas = getEmpresas();

        if (editingEmpresaId) {
            const index = empresas.findIndex(em => em.id === editingEmpresaId);
            if (index > -1) {
                empresas[index] = newEmpresa;
                showToast('Empresa atualizada com sucesso!');
            }
        } else {
            empresas.push(newEmpresa);
            showToast('Empresa cadastrada com sucesso!');
        }

        saveEmpresas(empresas);
        formEmpresaContainer.classList.add('form-hidden');
        loadEmpresasTable();
        populateEmpresasSelect();
    });

    function loadEmpresasTable() {
        const tbody = document.getElementById('lista-empresas');
        const empresas = getEmpresas();
        tbody.innerHTML = '';

        if (empresas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-light)">Nenhuma empresa cadastrada.</td></tr>`;
            return;
        }

        empresas.forEach(emp => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${emp.razao || '-'}</td>
                <td>${emp.cnpj || '-'}</td>
                <td>${emp.email || '-'}</td>
                <td>
                    <button class="btn-icon" onclick="viewEmpresa('${emp.id}')" title="Visualizar"><i class='bx bx-show'></i></button>
                    <button class="btn-icon admin-only" onclick="editEmpresa('${emp.id}')" title="Editar"><i class='bx bx-pencil'></i></button>
                    <button class="btn-icon delete admin-only" onclick="deleteEmpresa('${emp.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.editEmpresa = function (id) {
        editingEmpresaId = id;
        const empresas = getEmpresas();
        const emp = empresas.find(e => e.id === id);
        if (!emp) return;

        document.getElementById('emp-razao').value = emp.razao || '';
        document.getElementById('emp-cnpj').value = emp.cnpj || '';
        document.getElementById('emp-email').value = emp.email || '';
        document.getElementById('emp-telefone').value = emp.telefone || '';

        formEmpresaContainer.classList.remove('form-hidden');
        document.getElementById('empresas').scrollIntoView();
    };

    window.viewEmpresa = function (id) {
        const empresas = getEmpresas();
        const emp = empresas.find(e => e.id === id);
        if (!emp) return;

        let html = '';
        const addRow = (label, val) => {
            html += `<div class="details-row"><strong>${label}</strong><span>${val || '-'}</span></div>`;
        }

        addRow('Razão Social', emp.razao);
        addRow('CNPJ', emp.cnpj);
        addRow('E-mail', emp.email);
        addRow('Telefone', emp.telefone);

        modalBody.innerHTML = html;
        modalView.classList.remove('form-hidden');
    };

    window.deleteEmpresa = function (id) {
        if (confirm('Tem certeza que deseja excluir esta empresa? Contratos atrelados a ela requerem atenção.')) {
            let empresas = getEmpresas();
            empresas = empresas.filter(e => e.id !== id);
            saveEmpresas(empresas);
            loadEmpresasTable();
            populateEmpresasSelect();
            showToast('Empresa excluída.', 'success');
        }
    }

    function populateEmpresasSelect() {
        const select = document.getElementById('con-empresa');
        const empresas = getEmpresas();

        select.innerHTML = '<option value="" disabled selected>Selecione uma Empresa</option>';
        empresas.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = emp.razao;
            select.appendChild(opt);
        });
    }

    // ==========================================
    // CONTRATOS LOGIC
    // ==========================================
    const btnNovoContrato = document.getElementById('btn-novo-contrato');
    const formContratoContainer = document.getElementById('form-contrato-container');
    const btnCancelContrato = document.getElementById('btn-cancel-contrato');
    const formContrato = document.getElementById('form-contrato');

    const selectTipo = document.getElementById('con-tipo');
    const grupoServicosGerais = document.getElementById('grupo-servicos-gerais');
    const grupoTransporte = document.getElementById('grupo-transporte');
    const grupoCompartilhado = document.getElementById('grupo-compartilhado');
    const btnSaveContrato = document.getElementById('btn-save-contrato');

    selectTipo.addEventListener('change', (e) => {
        const val = e.target.value;
        grupoCompartilhado.style.display = 'block';
        btnSaveContrato.style.display = 'inline-flex';

        if (val === 'Transporte Escolar') {
            grupoServicosGerais.style.display = 'none';
            grupoTransporte.style.display = 'block';
        } else {
            grupoServicosGerais.style.display = 'block';
            grupoTransporte.style.display = 'none';
        }
    });

    let editingContratoId = null;

    btnNovoContrato.addEventListener('click', () => {
        editingContratoId = null;
        formContrato.reset();
        grupoServicosGerais.style.display = 'none';
        grupoTransporte.style.display = 'none';
        grupoCompartilhado.style.display = 'none';
        btnSaveContrato.style.display = 'none';
        populateEmpresasSelect(); // Ensure it's updated
        formContratoContainer.classList.remove('form-hidden');
    });

    btnCancelContrato.addEventListener('click', () => {
        formContratoContainer.classList.add('form-hidden');
    });

    formContrato.addEventListener('submit', (e) => {
        e.preventDefault();

        const tipo = document.getElementById('con-tipo').value;

        const newContrato = {
            id: Date.now().toString(),
            numero: document.getElementById('con-numero').value,
            proa: document.getElementById('con-proa').value,
            lote: document.getElementById('con-lote').value,
            cre: document.getElementById('con-cre').value,
            tipo: tipo,
            empresaId: document.getElementById('con-empresa').value,

            // Compartilhados
            periodoInicial: document.getElementById('con-periodoinicial').value,
            periodoFinal: document.getElementById('con-periodofinal').value,
            situacao: document.getElementById('con-situacao').value,
            gestor: document.getElementById('con-gestor').value,
        };

        // Específicos
        if (tipo === 'Transporte Escolar') {
            newContrato.alunos = document.getElementById('con-alunos').value;
            newContrato.municipio = document.getElementById('con-municipio').value;
            newContrato.valorDiario = parseFloat(document.getElementById('con-valordiario').value) || 0;
            newContrato.valorKm = parseFloat(document.getElementById('con-valorkm').value) || 0;
            newContrato.km = parseFloat(document.getElementById('con-km').value) || 0;
        } else {
            newContrato.valorMensal = parseFloat(document.getElementById('con-valormensal').value) || 0;
            newContrato.postos = document.getElementById('con-postos').value;
        }

        const contratos = getContratos();
        if (editingContratoId) {
            const index = contratos.findIndex(c => c.id === editingContratoId);
            if (index > -1) {
                newContrato.id = editingContratoId;
                contratos[index] = newContrato;
                showToast('Contrato atualizado com sucesso!');
            }
        } else {
            contratos.push(newContrato);
            showToast('Contrato salvo com sucesso!');
        }

        saveContratos(contratos);
        formContratoContainer.classList.add('form-hidden');
        loadContratosTable();
    });

    // Filtros
    const inputsFiltro = [
        'filtro-processo', 'filtro-municipio', 'filtro-cre',
        'filtro-contrato', 'filtro-empresa', 'filtro-situacao'
    ].map(id => document.getElementById(id));

    inputsFiltro.forEach(input => {
        if (input) input.addEventListener('input', loadContratosTable);
    });

    document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
        inputsFiltro.forEach(input => { if (input) input.value = ''; });
        loadContratosTable();
    });

    function loadContratosTable() {
        const tbody = document.getElementById('lista-contratos');
        let contratos = getContratos();
        const empresas = getEmpresas();

        // Aplicar filtros
        contratos = contratos.filter(con => {
            const emp = empresas.find(e => e.id === con.empresaId);
            const empName = emp ? emp.razao.toLowerCase() : '';

            const vPro = (document.getElementById('filtro-processo').value || '').toLowerCase();
            const matchProcesso = con.proa ? con.proa.toLowerCase().includes(vPro) : (vPro === '' || true); // always evaluate
            if (vPro && (!con.proa || !con.proa.toLowerCase().includes(vPro))) return false;

            const vMun = (document.getElementById('filtro-municipio').value || '').toLowerCase();
            if (vMun && (!con.municipio || !con.municipio.toLowerCase().includes(vMun))) return false;

            const vCre = (document.getElementById('filtro-cre').value || '').toLowerCase();
            if (vCre && (!con.cre || !con.cre.toLowerCase().includes(vCre))) return false;

            const vNum = (document.getElementById('filtro-contrato').value || '').toLowerCase();
            if (vNum && (!con.numero || !con.numero.toLowerCase().includes(vNum))) return false;

            const vEmp = (document.getElementById('filtro-empresa').value || '').toLowerCase();
            if (vEmp && !empName.includes(vEmp)) return false;

            const vSit = document.getElementById('filtro-situacao').value;
            if (vSit && con.situacao !== vSit) return false;

            return true;
        });

        tbody.innerHTML = '';

        if (contratos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-light)">Nenhum contrato encontrado.</td></tr>`;
            return;
        }

        contratos.forEach(con => {
            const emp = empresas.find(e => e.id === con.empresaId);
            const empName = emp ? emp.razao : '<span style="color:red">Empresa Excluída</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${con.numero || '-'}</td>
                <td>${empName}</td>
                <td>${con.tipo || '-'}</td>
                <td>${con.cre || '-'}</td>
                <td><span class="badge ${con.situacao || ''}">${con.situacao || '-'}</span></td>
                <td>
                    <button class="btn-icon" onclick="viewContrato('${con.id}')" title="Visualizar"><i class='bx bx-show'></i></button>
                    <button class="btn-icon admin-only" onclick="editContrato('${con.id}')" title="Editar"><i class='bx bx-pencil'></i></button>
                    <button class="btn-icon delete admin-only" onclick="deleteContrato('${con.id}')" title="Excluir"><i class='bx bx-trash'></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.deleteContrato = function (id) {
        if (confirm('Tem certeza que deseja excluir este contrato?')) {
            let contratos = getContratos();
            contratos = contratos.filter(c => c.id !== id);
            saveContratos(contratos);
            loadContratosTable();
            showToast('Contrato excluído.', 'success');
        }
    }

    // Modal View & Edit Logic
    window.editContrato = function (id) {
        editingContratoId = id;
        const contratos = getContratos();
        const con = contratos.find(c => c.id === id);
        if (!con) return;

        populateEmpresasSelect();

        document.getElementById('con-numero').value = con.numero || '';
        document.getElementById('con-proa').value = con.proa || '';
        document.getElementById('con-lote').value = con.lote || '';
        document.getElementById('con-cre').value = con.cre || '';
        document.getElementById('con-tipo').value = con.tipo || '';
        document.getElementById('con-empresa').value = con.empresaId || '';

        document.getElementById('con-periodoinicial').value = con.periodoInicial || '';
        document.getElementById('con-periodofinal').value = con.periodoFinal || '';
        document.getElementById('con-situacao').value = con.situacao || '';
        document.getElementById('con-gestor').value = con.gestor || '';

        if (con.tipo === 'Transporte Escolar') {
            document.getElementById('con-alunos').value = con.alunos || '';
            document.getElementById('con-municipio').value = con.municipio || '';
            document.getElementById('con-valordiario').value = con.valorDiario || '';
            document.getElementById('con-valorkm').value = con.valorKm || '';
            document.getElementById('con-km').value = con.km || '';
        } else if (con.tipo) {
            document.getElementById('con-valormensal').value = con.valorMensal || '';
            document.getElementById('con-postos').value = con.postos || '';
        }

        // Trigger visual change
        selectTipo.dispatchEvent(new Event('change'));

        formContratoContainer.classList.remove('form-hidden');
        document.getElementById('contratos').scrollIntoView();
    };

    const modalView = document.getElementById('generic-modal');
    const modalBody = document.getElementById('modal-body');
    const btnCloseModal = document.getElementById('btn-close-modal');

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            modalView.classList.add('form-hidden');
        });
    }

    window.viewContrato = function (id) {
        const contratos = getContratos();
        const con = contratos.find(c => c.id === id);
        if (!con) return;
        const empresas = getEmpresas();
        const emp = empresas.find(e => e.id === con.empresaId);

        let html = '';
        const addRow = (label, val) => {
            html += `<div class="details-row"><strong>${label}</strong><span>${val || '-'}</span></div>`;
        }

        addRow('Número do Contrato', con.numero);
        addRow('Empresa', emp ? emp.razao : 'Desconhecida');
        addRow('Tipo de Serviço', con.tipo);
        addRow('PROA', con.proa);
        addRow('Lote', con.lote);
        addRow('CRE', con.cre);

        if (con.tipo === 'Transporte Escolar') {
            addRow('Alunos', con.alunos);
            addRow('Município', con.municipio);
            addRow('Valor Diário', con.valorDiario ? `R$ ${con.valorDiario}` : '-');
            addRow('Valor do KM', con.valorKm ? `R$ ${con.valorKm}` : '-');
            addRow('Quilometragem (KM)', con.km);
        } else if (con.tipo) {
            addRow('Valor Mensal', con.valorMensal ? `R$ ${con.valorMensal}` : '-');
            addRow('Postos', con.postos);
        }

        addRow('Período Inicial', con.periodoInicial ? con.periodoInicial.split('-').reverse().join('/') : '-');
        addRow('Período Final', con.periodoFinal ? con.periodoFinal.split('-').reverse().join('/') : '-');
        addRow('Situação', con.situacao);
        addRow('Gestor', con.gestor);

        modalBody.innerHTML = html;
        modalView.classList.remove('form-hidden');
    };

    // ==========================================
    // FATURAMENTOS LOGIC
    // ==========================================
    const menuFaturamentos = document.getElementById('menu-faturamentos');
    const submenuFaturamentos = document.getElementById('submenu-faturamentos');
    const faturamentosChevron = document.getElementById('faturamentos-chevron');
    
    if (menuFaturamentos) {
        menuFaturamentos.addEventListener('click', (e) => {
            e.preventDefault();
            const isHidden = submenuFaturamentos.style.display === 'none';
            submenuFaturamentos.style.display = isHidden ? 'block' : 'none';
            faturamentosChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    // ==========================================
    // POSTOS SIDEBAR TOGGLE
    // ==========================================
    const menuPostos = document.getElementById('menu-postos');
    const submenuPostos = document.getElementById('submenu-postos');
    const postosChevron = document.getElementById('postos-chevron');
    
    if (menuPostos) {
        menuPostos.addEventListener('click', (e) => {
            e.preventDefault();
            const isHidden = submenuPostos.style.display === 'none';
            submenuPostos.style.display = isHidden ? 'block' : 'none';
            postosChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    const subLinks = document.querySelectorAll('#submenu-faturamentos a, #submenu-postos a');
    subLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            const servico = link.getAttribute('data-servico');
            const label = link.textContent;
            
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
            const targetView = document.getElementById(targetId);
            if (targetView) targetView.classList.add('active-view');
            
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            if (menuFaturamentos) menuFaturamentos.classList.add('active');

            if (targetId === 'faturamentos-lista') {
                document.getElementById('fat-group-title').textContent = `Faturamentos - ${label} (2025)`;
                loadContratosFaturamentosTable(servico);
            } else if (targetId === 'postos-lista') {
                document.getElementById('postos-group-title').textContent = `Gerenciamento de Postos - ${label}`;
                
                // Clear filters
                document.getElementById('filter-postos-cre').value = "";
                document.getElementById('filter-postos-empresa').value = "";
                document.getElementById('filter-postos-municipio').value = "";
                
                loadPostosDashboard(servico);
            }
        });
    });

    function loadContratosFaturamentosTable(servico) {
        const tbody = document.getElementById('lista-contratos-faturamentos');
        const contratos = getContratos().filter(c => c.tipo === servico);
        const empresas = getEmpresas();

        tbody.innerHTML = '';
        if (contratos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-light)">Nenhum contrato encontrado para este setor.</td></tr>`;
            return;
        }

        contratos.forEach(con => {
            const emp = empresas.find(e => e.id === con.empresaId);
            const empName = emp ? emp.razao : '<span style="color:red">Desconhecida</span>';
            const vigencia = `${con.periodoInicial ? con.periodoInicial.split('-').reverse().join('/') : '-'} á ${con.periodoFinal ? con.periodoFinal.split('-').reverse().join('/') : '-'}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${con.numero || '-'}</td>
                <td>${empName}</td>
                <td>${vigencia}</td>
                <td>
                    <button class="btn btn-secondary" onclick="openModalFaturamentos('${con.id}', '${con.numero}')" style="font-size:12px; padding: 6px 12px; background: transparent; border: 1px solid var(--primary-color); color: var(--primary-color);">
                        <i class='bx bx-edit'></i> Gerenciar Faturamentos
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const modalFat = document.getElementById('modal-faturamentos');
    const btnCloseFat = document.getElementById('btn-close-fat-modal');
    const btnCancelFat = document.getElementById('btn-cancel-fat');
    const btnSaveFat = document.getElementById('btn-save-fat');
    
    let currentFatContratoId = null;
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    window.openModalFaturamentos = function(contratoId, contratoNumero) {
        currentFatContratoId = contratoId;
        document.getElementById('modal-fat-title').textContent = `Gerenciar Faturamentos 2025 - Contrato ${contratoNumero}`;
        
        let dbFat = JSON.parse(localStorage.getItem('faturamentos_2025') || '{}');
        let fatList = dbFat[contratoId] || Array(12).fill({});

        const tbody = document.getElementById('fat-grid-body');
        tbody.innerHTML = '';

        months.forEach((m, idx) => {
            const data = fatList[idx] || {};
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 8px 12px; font-weight: 500; font-size: 13px; border-bottom: 1px solid var(--border-color);">${m}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">
                    <input type="text" id="fat-proc-${idx}" value="${data.processo || ''}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </td>
                <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">
                    <input type="date" id="fat-abert-${idx}" value="${data.abertura || ''}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </td>
                <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">
                    <select id="fat-sit-${idx}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                        <option value="Pendente" ${data.situacao === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Pago" ${data.situacao === 'Pago' ? 'selected' : ''}>Pago</option>
                        <option value="Atrasado" ${data.situacao === 'Atrasado' ? 'selected' : ''}>Atrasado</option>
                    </select>
                </td>
                <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">
                    <input type="date" id="fat-pag-${idx}" value="${data.pagamento || ''}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </td>
                <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">
                    <input type="text" id="fat-val-${idx}" value="${data.valor || ''}" placeholder="Ex: 1234.56" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </td>
            `;
            tbody.appendChild(tr);
        });

        modalFat.classList.remove('form-hidden');
    }

    const closeModalFat = () => modalFat.classList.add('form-hidden');
    
    if (btnCloseFat) btnCloseFat.addEventListener('click', closeModalFat);
    if (btnCancelFat) btnCancelFat.addEventListener('click', closeModalFat);

    if (btnSaveFat) {
        btnSaveFat.addEventListener('click', () => {
            if (!currentFatContratoId) return;

            let fatArray = [];
            for (let i = 0; i < 12; i++) {
                fatArray.push({
                    processo: document.getElementById(`fat-proc-${i}`).value,
                    abertura: document.getElementById(`fat-abert-${i}`).value,
                    situacao: document.getElementById(`fat-sit-${i}`).value,
                    pagamento: document.getElementById(`fat-pag-${i}`).value,
                    valor: document.getElementById(`fat-val-${i}`).value
                });
            }

            let dbFat = JSON.parse(localStorage.getItem('faturamentos_2025') || '{}');
            dbFat[currentFatContratoId] = fatArray;
            localStorage.setItem('faturamentos_2025', JSON.stringify(dbFat));

            showToast('Faturamentos salvos com sucesso!');
            closeModalFat();
        });
    }

    // ==========================================
    // POSTOS LOGIC
    // ==========================================
    let currentPostoServico = null;
    let postosData = JSON.parse(localStorage.getItem('postos_alocados') || '{}');
    
    const postosCreFilter = document.getElementById('filter-postos-cre');
    const postosEmpresaFilter = document.getElementById('filter-postos-empresa');
    const postosMunicipioFilter = document.getElementById('filter-postos-municipio');
    const btnLimparFiltrosPostos = document.getElementById('btn-limpar-filtros-postos');
    
    [postosCreFilter, postosEmpresaFilter, postosMunicipioFilter].forEach(el => {
        if(el) el.addEventListener('input', () => loadPostosDashboard());
    });
    
    if(btnLimparFiltrosPostos) {
        btnLimparFiltrosPostos.addEventListener('click', () => {
            postosCreFilter.value = "";
            postosEmpresaFilter.value = "";
            postosMunicipioFilter.value = "";
            loadPostosDashboard();
        });
    }

    function loadPostosDashboard(servico) {
        if (servico) currentPostoServico = servico;
        if (!currentPostoServico) return;

        postosData = JSON.parse(localStorage.getItem('postos_alocados') || '{}');
        const allEmpresas = getEmpresas();
        let listContratos = getContratos().filter(c => c.tipo === currentPostoServico);

        // Atualizar options do Filtro de Empresa com as empresas deste serviço
        const uniqueEmpIds = [...new Set(listContratos.map(c => c.empresaId))];
        const prevEmpVal = postosEmpresaFilter.value;
        postosEmpresaFilter.innerHTML = '<option value="">Todas</option>';
        uniqueEmpIds.forEach(id => {
            const e = allEmpresas.find(emp => emp.id === id);
            if (e) {
                postosEmpresaFilter.innerHTML += `<option value="${e.id}">${e.razao}</option>`;
            }
        });
        postosEmpresaFilter.value = uniqueEmpIds.includes(prevEmpVal) ? prevEmpVal : "";

        // Global dashboard metrics
        let gTotalPostos = 0;
        let gImplantados = 0;
        let gVagos = 0;
        let gEscolas = 0;

        // Apply filters
        const fCre = postosCreFilter.value;
        const fEmp = postosEmpresaFilter.value;
        const fMun = postosMunicipioFilter.value.toLowerCase();

        listContratos.forEach(con => {
            gTotalPostos += parseInt(con.postos || 0);
            
            const escolasDoContrato = postosData[con.id] || [];
            gEscolas += escolasDoContrato.length;
            
            escolasDoContrato.forEach(esc => {
                gImplantados += parseInt(esc.implantados || 0);
                // Vagos globais (caso a gente calcule com base na escola ou no total - seguiremos a escola preenchida)
            });
        });
        
        gVagos = gTotalPostos - gImplantados;
        
        // Render Top Cards
        document.getElementById('card-total-postos').textContent = gTotalPostos;
        document.getElementById('card-postos-implantados').textContent = gImplantados;
        document.getElementById('card-postos-vagos').textContent = gVagos < 0 ? 0 : gVagos;
        document.getElementById('card-total-escolas').textContent = gEscolas;

        listContratos = listContratos.filter(c => {
            if (fCre && c.cre !== fCre) return false;
            if (fEmp && c.empresaId !== fEmp) return false;
            
            if (fMun) {
                // Filtra pelo municipio vinculado na escola DESTE contrato
                const escolasArr = postosData[c.id] || [];
                const checkMun = escolasArr.some(esc => (esc.municipio || '').toLowerCase().includes(fMun));
                if (!checkMun) return false;
            }
            return true;
        });

        const container = document.getElementById('container-postos-cards');
        container.innerHTML = '';

        if (listContratos.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding: 40px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius); color: var(--text-light);">Nenhum contrato encontrado para o tipo de serviço com os filtros aplicados.</div>`;
            return;
        }

        listContratos.forEach(con => {
            const emp = allEmpresas.find(e => e.id === con.empresaId);
            const empName = emp ? emp.razao : 'Desconhecida';
            
            const arrEscolas = postosData[con.id] || [];
            let totalEscolas = arrEscolas.length;
            let imp = 0;
            let uniqMuns = new Set();
            
            arrEscolas.forEach(sc => {
                imp += parseInt(sc.implantados || 0);
                if (sc.municipio) uniqMuns.add(sc.municipio);
            });
            
            // Assume vago is calculated dynamically per block, or base total - impl. 
            // In the screenshot it asks for 'vagos' in the form, but let's sum it from details.
            let vgs = 0;
            arrEscolas.forEach(sc => vgs += parseInt(sc.vagos || 0));

            const munsStr = uniqMuns.size > 0 ? Array.from(uniqMuns).join(', ') : 'N/A';

            container.innerHTML += `
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="padding: 10px 20px; font-weight: 600; font-size: 14px; color: #4361ee; border-bottom: 1px solid var(--border-color); background: var(--bg-color);">
                        Crê: ${con.cre || '-'}
                    </div>
                    <div style="padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                            <div>
                                <h3 style="margin: 0; font-size: 16px; color: var(--text-color);">Contrato: ${con.numero || '-'}</h3>
                                <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">${empName}</div>
                            </div>
                            <div style="display: flex; gap: 15px;">
                                <button class="btn-icon" style="color: #2b9348; font-size: 14px; display: flex; align-items: center; gap: 5px;" onclick="alert('Funcionalidade de Relatório em desenvolvimento')">
                                    <i class='bx bx-download'></i> Relatório
                                </button>
                                <button class="btn-icon" style="color: #4361ee; font-size: 14px; display: flex; align-items: center; gap: 5px;" onclick="openGerenciarEscolas('${con.id}', '${con.numero}')">
                                    <i class='bx bx-show'></i> Gerenciar Escolas
                                </button>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; font-size: 13px; color: var(--text-light);">
                            <div><strong>Total de Escolas:</strong> <span style="color:var(--text-color)">${totalEscolas}</span></div>
                            <div><strong>Postos Implantados:</strong> <span style="color:var(--text-color)">${imp}</span></div>
                            <div><strong>Postos Vagos:</strong> <span style="color:var(--text-color)">${vgs}</span></div>
                            <div><strong>Municípios:</strong> <span style="color:var(--text-color)">${munsStr}</span></div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    const modalEscolas = document.getElementById('modal-escolas');
    const containerEscolasBlocks = document.getElementById('escolas-blocks-container');
    const btnCloseEscolasModal = document.getElementById('btn-close-escolas-modal');
    const btnFecharEscolas = document.getElementById('btn-fechar-escolas');
    const btnAddEscola = document.getElementById('btn-add-escola');
    const btnSalvarEscolas = document.getElementById('btn-salvar-escolas');

    let curEscolaContratoId = null;

    window.openGerenciarEscolas = function(id, num) {
        curEscolaContratoId = id;
        document.getElementById('modal-escolas-title').textContent = `Gerenciar Escolas - Contrato ${num}`;
        
        postosData = JSON.parse(localStorage.getItem('postos_alocados') || '{}');
        const escolas = postosData[id] || [];

        renderEscolasBlocks(escolas);
        modalEscolas.classList.remove('form-hidden');
    }

    function renderEscolasBlocks(arr) {
        containerEscolasBlocks.innerHTML = '';
        if (arr.length === 0) {
            containerEscolasBlocks.innerHTML = `
                <div id="empty-escolas" style="text-align: center; color: var(--text-light); padding: 40px 0;">
                    Nenhuma escola cadastrada para este contrato.
                </div>
            `;
            return;
        }

        arr.forEach((esc, idx) => appendEscolaBlock(esc, idx));
    }

    function appendEscolaBlock(data = {}, uid = Date.now()) {
        const emptyDiv = document.getElementById('empty-escolas');
        if (emptyDiv) emptyDiv.remove();

        const block = document.createElement('div');
        block.className = 'escola-card';
        block.setAttribute('data-uid', uid);
        block.style.background = 'var(--card-bg)';
        block.style.border = '1px solid var(--border-color)';
        block.style.borderRadius = 'var(--radius)';
        block.style.padding = '15px';
        block.style.position = 'relative';

        block.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px; margin-bottom: 10px;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 11px;">Município</label>
                    <input type="text" class="esc-mun" value="${data.municipio || ''}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 11px;">Nome da Escola</label>
                    <input type="text" class="esc-nome" value="${data.nome || ''}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 11px;">Valor Unitário</label>
                    <input type="text" class="esc-val" value="${data.valor || ''}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 11px;">Carga Horária</label>
                    <input type="text" class="esc-ch" value="${data.carga_horaria || ''}" placeholder="Ex: 40h" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 11px;">Postos Implantados</label>
                    <input type="number" class="esc-imp" value="${data.implantados !== undefined ? data.implantados : '0'}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 11px;">Postos Vagos</label>
                    <input type="number" class="esc-vag" value="${data.vagos !== undefined ? data.vagos : '0'}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; outline: none;">
                </div>
            </div>
            
            <button class="btn-icon" style="position: absolute; bottom: 15px; right: 15px; color: var(--danger-color); padding: 5px;" onclick="this.parentElement.remove(); if(document.querySelectorAll('.escola-card').length === 0) document.getElementById('escolas-blocks-container').innerHTML = '<div id=\\\'empty-escolas\\\' style=\\\'text-align: center; color: var(--text-light); padding: 40px 0;\\\'>Nenhuma escola cadastrada para este contrato.</div>';">
                <i class='bx bx-trash' style="font-size: 18px;"></i>
            </button>
        `;
        
        containerEscolasBlocks.appendChild(block);
    }

    if (btnAddEscola) {
        btnAddEscola.addEventListener('click', () => {
            appendEscolaBlock({}, Date.now());
            containerEscolasBlocks.scrollTo(0, containerEscolasBlocks.scrollHeight);
        });
    }

    const closeModEsc = () => modalEscolas.classList.add('form-hidden');
    if (btnCloseEscolasModal) btnCloseEscolasModal.addEventListener('click', closeModEsc);
    if (btnFecharEscolas) btnFecharEscolas.addEventListener('click', closeModEsc);

    if (btnSalvarEscolas) {
        btnSalvarEscolas.addEventListener('click', () => {
            if (!curEscolaContratoId) return;

            const cards = containerEscolasBlocks.querySelectorAll('.escola-card');
            let arr = [];

            cards.forEach(card => {
                arr.push({
                    municipio: card.querySelector('.esc-mun').value,
                    nome: card.querySelector('.esc-nome').value,
                    valor: card.querySelector('.esc-val').value,
                    carga_horaria: card.querySelector('.esc-ch').value,
                    implantados: card.querySelector('.esc-imp').value,
                    vagos: card.querySelector('.esc-vag').value
                });
            });

            postosData[curEscolaContratoId] = arr;
            localStorage.setItem('postos_alocados', JSON.stringify(postosData));
            showToast('Lotações de escola salvas com sucesso!');
            closeModEsc();

            loadPostosDashboard(); // refresh behind
        });
    }

});
