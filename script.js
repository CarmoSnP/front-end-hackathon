document.addEventListener('DOMContentLoaded', function () {
    // --- ELEMENTOS DA TELA INICIAL ---
    const splashScreen = document.getElementById('splash-screen');
    const enterAppBtn = document.getElementById('enter-app-btn');
    const appWrapper = document.getElementById('app-wrapper');

    // --- ELEMENTOS DOM (Grifo) ---
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadTitle = document.getElementById('upload-title');
    const uploadText = document.getElementById('upload-text');
    const submitBtn = document.getElementById('submit-btn');
    const modelSelect = document.getElementById('model-select');
    const ufscGenreInput = document.getElementById('ufsc-genre-input');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const resultContent = document.getElementById('result-content');
    const redacoesList = document.getElementById('redacoes-list');
    const apiUrlInput = document.getElementById('api-url');
    const saveApiConfigBtn = document.getElementById('save-api-config');
    const toggleUploadBtn = document.getElementById('toggle-upload');
    const toggleTextBtn = document.getElementById('toggle-text');
    const uploadContainer = document.getElementById('upload-container');
    const textInputArea = document.getElementById('text-input-area');
    const resultArea = document.getElementById('result-area'); // Adicionado seletor

    // --- NOVOS ELEMENTOS DE CONTROLE DA UI ---
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const leftPanel = document.querySelector('.left-panel');
    const toggleMaximizeBtn = document.getElementById('toggle-maximize-btn');


    // --- RAG (SINAPSE) ELEMENTOS ---
    const ragSubmitBtn = document.getElementById('rag-submit-btn');
    const ragQuestionInput = document.getElementById('rag-question-input');
    const ragLoading = document.getElementById('rag-loading');
    const ragErrorMessage = document.getElementById('rag-error-message');
    const ragResultArea = document.getElementById('rag-result-area');
    const ragUploadArea = document.getElementById('rag-upload-area');
    const ragFileInput = document.getElementById('rag-file-input');
    const ragUploadBtn = document.getElementById('rag-upload-btn');
    const ragUploadLoading = document.getElementById('rag-upload-loading');
    const ragUploadErrorMessage = document.getElementById('rag-upload-error-message');
    const ragFilesList = document.getElementById('rag-files-list');

    // --- TABS ---
    const navTabs = document.querySelectorAll('.nav-tab');
    const appViews = document.querySelectorAll('.app-view');

    // --- ESTADO DA APLICAÇÃO ---
    let apiConfig = JSON.parse(localStorage.getItem('apiConfig')) || { url: '' };
    apiUrlInput.value = apiConfig.url;
    let redacoesSalvas = JSON.parse(localStorage.getItem('redacoesSalvas')) || [];
    let currentInputMode = 'upload'; // 'upload' ou 'text'

    // --- FUNÇÕES DE LÓGICA ---
    function showError(mensagem, type = 'redacao') {
        let el;
        if (type === 'rag') el = ragErrorMessage;
        else if (type === 'rag-upload') el = ragUploadErrorMessage;
        else el = errorMessage;

        el.textContent = mensagem;
        el.style.display = 'block';
    }

    function salvarRedacoes() {
        localStorage.setItem('redacoesSalvas', JSON.stringify(redacoesSalvas));
    }

    function carregarRedacoes() {
        redacoesList.innerHTML = '';
        if (redacoesSalvas.length === 0) {
            redacoesList.innerHTML = `<div class="empty-state"><i>📂</i><p>Nenhuma redação salva.</p></div>`;
            return;
        }
        redacoesSalvas.slice().reverse().forEach(redacao => {
            const item = document.createElement('div');
            item.className = 'redacao-item';
            // MODIFICADO: Adicionado botão de renomear
            item.innerHTML = `<h3>${redacao.titulo}</h3><p>Data: ${redacao.data} | Nota: ${typeof redacao.nota === 'number' ? redacao.nota.toFixed(2) : redacao.nota}</p>
                            <div class="redacao-actions">
                                <button class="action-btn rename-btn" title="Renomear" data-id="${redacao.id}">✏️</button>
                                <button class="action-btn delete-btn" title="Apagar" data-id="${redacao.id}">🗑️</button>
                            </div>`;

            item.addEventListener('click', (e) => {
                // Modificado para não ativar ao clicar nos botões
                if (!e.target.classList.contains('action-btn')) {
                    document.querySelectorAll('.redacao-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    exibirResultado(redacao.resultado);
                }
            });

            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Tem certeza que deseja apagar esta redação?')) {
                    apagarRedacao(redacao.id);
                }
            });

            // NOVO: Event listener para o botão de renomear
            item.querySelector('.rename-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const newTitle = prompt("Digite o novo nome para a redação:", redacao.titulo);
                if (newTitle && newTitle.trim() !== '') {
                    const redacaoToUpdate = redacoesSalvas.find(r => r.id === redacao.id);
                    if (redacaoToUpdate) {
                        redacaoToUpdate.titulo = newTitle.trim();
                        salvarRedacoes();
                        carregarRedacoes(); // Recarrega a lista para mostrar a alteração
                    }
                }
            });

            redacoesList.appendChild(item);
        });
    }

    function apagarRedacao(id) {
        redacoesSalvas = redacoesSalvas.filter(redacao => redacao.id !== id);
        salvarRedacoes();
        carregarRedacoes();
        if (document.querySelector('.redacao-item.active') === null) {
            resultContent.innerHTML = `<div class="empty-state"><i>📝</i><p>Envie uma redação para ver o resultado aqui.</p></div>`;
        }
    }

    function handleFileSelect(file) {
        if (file) {
            uploadTitle.textContent = "Arquivo Selecionado";
            uploadText.textContent = file.name;
            uploadArea.classList.add('file-selected');
        }
    }

    function updateRagFilesList() {
        ragFilesList.innerHTML = '';
        const file = ragFileInput.files[0];
        if (!file) {
            ragUploadArea.classList.remove('file-selected');
            ragUploadArea.querySelector('h3').textContent = 'Adicionar Documento à Base de Conhecimento';
            ragUploadArea.querySelector('p').textContent = 'Arraste um arquivo (PDF, PPTX) aqui ou clique para selecionar';
            return;
        }
        ragUploadArea.classList.add('file-selected');
        ragUploadArea.querySelector('h3').textContent = 'Arquivo Selecionado';
        ragUploadArea.querySelector('p').textContent = file.name;
    }

    function exibirResultado(resultado) {
        if (resultado && resultado.competencias) { // ENEM
            let competenciasHtml = resultado.competencias.map(c => `<div class="criteria-item"><div class="criteria-header"><span class="criteria-name">Competência ${c.id}</span><span class="criteria-score">${c.nota}</span></div><p class="criteria-comment">${c.feedback}</p></div>`).join('');
            resultContent.innerHTML = `<div class="criteria-item"><div class="criteria-name">Análise Geral</div><p class="criteria-comment">${resultado.analise_geral}</p></div>${competenciasHtml}<div class="total-score">Nota Final: ${resultado.nota_final}</div>`;
        } else if (resultado && resultado.criterios) { // UFSC
            let criteriosHtml = resultado.criterios.map(c => `<div class="criteria-item"><div class="criteria-header"><span class="criteria-name">${c.nome}</span><span class="criteria-score">${c.nota.toFixed(2)}</span></div><p class="criteria-comment">${c.feedback}</p></div>`).join('');
            resultContent.innerHTML = `<div class="criteria-item"><div class="criteria-name">Análise Geral</div><p class="criteria-comment">${resultado.analise_geral}</p></div>${criteriosHtml}<div class="total-score">Nota Final: ${resultado.nota_final.toFixed(2)}</div>`;
        } else {
            resultContent.innerHTML = `<div class="error-message" style="display:block;">Resposta da API em formato inválido.</div>`;
            console.error("Resposta inválida:", resultado);
        }
    }

    // --- EVENT LISTENERS ---

    // Lógica da Tela Inicial
    enterAppBtn.addEventListener('click', () => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            appWrapper.style.display = 'flex';
        }, 1000);
    });

    // --- NOVOS EVENT LISTENERS PARA CONTROLE DA UI ---
    toggleSidebarBtn.addEventListener('click', () => {
        leftPanel.classList.toggle('collapsed');
        if (leftPanel.classList.contains('collapsed')) {
            toggleSidebarBtn.textContent = '›';
            toggleSidebarBtn.title = 'Expandir Barra Lateral';
        } else {
            toggleSidebarBtn.textContent = '‹';
            toggleSidebarBtn.title = 'Recolher Barra Lateral';
        }
    });

    toggleMaximizeBtn.addEventListener('click', () => {
        resultArea.classList.toggle('maximized');
        if (resultArea.classList.contains('maximized')) {
            toggleMaximizeBtn.textContent = '✕';
            toggleMaximizeBtn.title = 'Minimizar';
        } else {
            toggleMaximizeBtn.textContent = '⛶';
            toggleMaximizeBtn.title = 'Maximizar';
        }
    });
    // ----------------------------------------------------

    // Navegação por Abas
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            navTabs.forEach(t => t.classList.remove('active'));
            appViews.forEach(v => v.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.view).classList.add('active');
        });
    });

    toggleUploadBtn.addEventListener('click', () => {
        currentInputMode = 'upload';
        toggleUploadBtn.classList.add('active');
        toggleTextBtn.classList.remove('active');
        uploadContainer.style.display = 'block';
        textInputArea.style.display = 'none';
    });

    toggleTextBtn.addEventListener('click', () => {
        currentInputMode = 'text';
        toggleTextBtn.classList.add('active');
        toggleUploadBtn.classList.remove('active');
        uploadContainer.style.display = 'none';
        textInputArea.style.display = 'block';
    });

    saveApiConfigBtn.addEventListener('click', function () {
        let url = apiUrlInput.value.trim();
        if (url.endsWith('/')) url = url.slice(0, -1);
        apiConfig = { url: url };
        localStorage.setItem('apiConfig', JSON.stringify(apiConfig));
        alert('Configurações da API salvas!');
    });

    modelSelect.addEventListener('change', () => {
        ufscGenreInput.style.display = (modelSelect.value === 'ufsc') ? 'block' : 'none';
    });

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = 'var(--accent-color)'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = 'var(--border-color)'; });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--border-color)';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFileSelect(fileInput.files[0]);
    });

    submitBtn.addEventListener('click', async () => {
        const selectedModel = modelSelect.value;
        if (!apiConfig.url) {
            showError('URL da API não configurada. Configure no campo acima.');
            return;
        }

        let requestBody;
        let endpoint = '';
        let headers = {};

        if (currentInputMode === 'upload') {
            const file = fileInput.files[0];
            if (!file) { showError('Por favor, faça o upload de uma imagem da redação.'); return; }
            requestBody = new FormData();
            requestBody.append('foto', file);
            if (selectedModel === 'enem') {
                endpoint = '/redacao/corrigir-redacao-enem/';
            } else {
                const genero = ufscGenreInput.value.trim();
                if (!genero) { showError('Por favor, informe o gênero textual para a correção da UFSC.'); return; }
                requestBody.append('genero', genero);
                endpoint = '/redacao/corrigir-redacao-ufsc/';
            }
        } else { // modo 'text'
            const texto = textInputArea.value.trim();
            if (!texto) { showError('Por favor, digite o texto da redação.'); return; }
            headers = { 'Content-Type': 'application/json' };
            if (selectedModel === 'enem') {
                endpoint = '/redacao/corrigir-texto-enem/';
                requestBody = JSON.stringify({ texto: texto });
            } else {
                const genero = ufscGenreInput.value.trim();
                if (!genero) { showError('Por favor, informe o gênero textual para a correção da UFSC.'); return; }
                endpoint = '/redacao/corrigir-texto-ufsc/';
                requestBody = JSON.stringify({ texto: texto, genero: genero });
            }
        }

        const fullApiUrl = apiConfig.url + endpoint;
        submitBtn.disabled = true;
        loading.style.display = 'block';
        errorMessage.style.display = 'none';
        resultContent.innerHTML = `<div class="empty-state"><i>📝</i><p>Aguardando resultado...</p></div>`;

        try {
            const response = await fetch(fullApiUrl, { method: 'POST', headers: headers, body: requestBody });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Erro na API: ${response.status}`);
            }
            const resultado = await response.json();

            const novaRedacao = {
                id: Date.now(),
                titulo: `Grifo (${selectedModel.toUpperCase()}) de ${new Date().toLocaleDateString()}`,
                data: new Date().toLocaleDateString(),
                nota: resultado.nota_final || 0,
                resultado: resultado,
                tipo: selectedModel
            };

            redacoesSalvas.push(novaRedacao);
            salvarRedacoes();
            carregarRedacoes();
            exibirResultado(resultado);

            const primeiroItem = redacoesList.querySelector('.redacao-item');
            if (primeiroItem) {
                document.querySelectorAll('.redacao-item').forEach(el => el.classList.remove('active'));
                primeiroItem.classList.add('active');
            }

        } catch (error) {
            showError(`Erro ao processar: ${error.message}`);
            console.error('Erro detalhado:', error);
            resultContent.innerHTML = `<div class="empty-state"><i>❌</i><p>Ocorreu um erro.</p></div>`;
        } finally {
            submitBtn.disabled = false;
            loading.style.display = 'none';
        }
    });

    // --- RAG (Sinapse) EVENT LISTENERS ---

    ragUploadArea.addEventListener('click', () => ragFileInput.click());
    ragUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ragUploadArea.style.borderColor = 'var(--accent-color)'; });
    ragUploadArea.addEventListener('dragleave', () => { ragUploadArea.style.borderColor = 'var(--border-color)'; });
    ragUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        ragUploadArea.style.borderColor = 'var(--border-color)';
        if (e.dataTransfer.files.length) {
            ragFileInput.files = e.dataTransfer.files;
            updateRagFilesList();
        }
    });
    ragFileInput.addEventListener('change', updateRagFilesList);

    ragUploadBtn.addEventListener('click', async () => {
        if (!apiConfig.url) {
            showError('URL da API não configurada.', 'rag-upload');
            return;
        }
        const file = ragFileInput.files[0];
        if (!file) {
            showError('Por favor, selecione um arquivo para enviar.', 'rag-upload');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const endpoint = '/rag/upload';
        const fullApiUrl = apiConfig.url + endpoint;

        ragUploadBtn.disabled = true;
        ragUploadLoading.style.display = 'block';
        ragUploadErrorMessage.style.display = 'none';

        try {
            const response = await fetch(fullApiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Erro no upload: ${response.status}`);
            }

            const result = await response.json();
            alert(result.message || 'Arquivo enviado com sucesso!');
            ragFileInput.value = '';
            updateRagFilesList();

        } catch (error) {
            showError(`Erro ao enviar: ${error.message}`, 'rag-upload');
            console.error('Erro detalhado no upload do RAG:', error);
        } finally {
            ragUploadBtn.disabled = false;
            ragUploadLoading.style.display = 'none';
        }
    });


    ragSubmitBtn.addEventListener('click', async () => {
        const pergunta = ragQuestionInput.value.trim();
        if (!apiConfig.url) {
            showError('URL da API não configurada.', 'rag');
            return;
        }
        if (!pergunta) {
            showError('Por favor, digite uma pergunta.', 'rag');
            return;
        }

        const endpoint = '/rag/query';
        const fullApiUrl = apiConfig.url + endpoint;

        ragSubmitBtn.disabled = true;
        ragLoading.style.display = 'block';
        ragErrorMessage.style.display = 'none';
        ragResultArea.innerHTML = `<div class="empty-state"><i>💡</i><p>Processando...</p></div>`;

        try {
            const response = await fetch(fullApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: pergunta })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Erro na API: ${response.status}`);
            }

            const resultado = await response.json();
            ragResultArea.innerHTML = resultado.answer || "Não foi possível obter uma resposta.";

        } catch (error) {
            showError(`Erro ao processar: ${error.message}`, 'rag');
            console.error('Erro detalhado no RAG:', error);
            ragResultArea.innerHTML = `<div class="empty-state"><i>❌</i><p>Ocorreu um erro ao buscar a resposta.</p></div>`;
        } finally {
            ragSubmitBtn.disabled = false;
            ragLoading.style.display = 'none';
        }
    });


    // --- INICIALIZAÇÃO ---
    carregarRedacoes();
});