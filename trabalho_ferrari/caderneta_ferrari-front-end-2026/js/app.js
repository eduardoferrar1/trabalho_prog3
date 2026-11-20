// ========================================
// CONFIGURAÇÃO E ESTADO
// ========================================

const API_URL = "https://localhost:7063";

let paginaAtual = 1;
let ordemAtual = "DataCadastro";
let direcaoAtual = "DESC"; // "ASC" ou "DESC"
let toastTimeout = null;

// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const formulario = document.getElementById("formulario");
const formLembrete = document.getElementById("formLembrete");

const lembreteId = document.getElementById("lembreteId");
const descricao = document.getElementById("descricao");
const erroDescricao = document.getElementById("erroDescricao");

const listaLembretes = document.getElementById("listaLembretes");
const mensagemVazia = document.getElementById("mensagemVazia");

const filtroDescricao = document.getElementById("filtroDescricao");
const filtroDataCadastroInicial = document.getElementById("filtroDataCadastroInicial");
const filtroDataCadastroFinal = document.getElementById("filtroDataCadastroFinal");
const filtroDataAtualizacaoInicial = document.getElementById("filtroDataAtualizacaoInicial");
const filtroDataAtualizacaoFinal = document.getElementById("filtroDataAtualizacaoFinal");
const tamanhoPagina = document.getElementById("tamanhoPagina");

const totalRegistros = document.getElementById("totalRegistros");
const paginaAtualElemento = document.getElementById("paginaAtual");

const btnImprimir = document.getElementById("btnImprimir");
const btnNovo = document.getElementById("btnNovo");
const btnCancelar = document.getElementById("btnCancelar");
const btnSalvar = document.getElementById("btnSalvar");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");

const btnAnterior = document.getElementById("btnAnterior");
const btnProximo = document.getElementById("btnProximo");

const tituloFormulario = document.getElementById("tituloFormulario");
const colunasOrdenaveis = document.querySelectorAll(".th-sort");

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    atualizarIndicadoresOrdenacao();
    filtrarLembretes();
});

// ========================================
// MONTAGEM DE PARÂMETROS (FILTROS, PÁGINA E ORDEM)
// ========================================

function montarParametrosConsulta() {
    const params = new URLSearchParams();

    params.append("NumeroPagina", paginaAtual);
    params.append("TamanhoPagina", tamanhoPagina.value);
    params.append("Ordem", ordemAtual);
    params.append("Direcao", direcaoAtual);

    const desc = filtroDescricao.value.trim();
    if (desc) {
        params.append("Descricao", desc);
    }

    if (filtroDataCadastroInicial.value) {
        params.append("DataCadastroInicial", filtroDataCadastroInicial.value);
    }

    if (filtroDataCadastroFinal.value) {
        params.append("DataCadastroFinal", filtroDataCadastroFinal.value);
    }

    if (filtroDataAtualizacaoInicial.value) {
        params.append("DataAtualizacaoInicial", filtroDataAtualizacaoInicial.value);
    }

    if (filtroDataAtualizacaoFinal.value) {
        params.append("DataAtualizacaoFinal", filtroDataAtualizacaoFinal.value);
    }

    return params;
}

function validarIntervalosDatas() {
    if (
        filtroDataCadastroInicial.value &&
        filtroDataCadastroFinal.value &&
        filtroDataCadastroInicial.value > filtroDataCadastroFinal.value
    ) {
        mostrarToast("A data inicial de cadastro não pode ser maior que a data final.", "error");
        return false;
    }

    if (
        filtroDataAtualizacaoInicial.value &&
        filtroDataAtualizacaoFinal.value &&
        filtroDataAtualizacaoInicial.value > filtroDataAtualizacaoFinal.value
    ) {
        mostrarToast("A data inicial de atualização não pode ser maior que a data final.", "error");
        return false;
    }

    return true;
}

// ========================================
// GET /lembretes/filtro
// ========================================

async function filtrarLembretes() {
    if (!validarIntervalosDatas()) {
        return;
    }

    try {
        const params = montarParametrosConsulta();
        const url = `${API_URL}/lembretes/filtro?${params.toString()}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            const detalhe = await extrairMensagemErro(response);
            throw new Error(detalhe || `Erro HTTP ${response.status} ao consultar lembretes.`);
        }

        const resultado = await response.json();

        renderizarLembretes(resultado.lembretes || []);

        const total = Number(resultado.total ?? 0);
        const numPagina = Number(resultado.numeroPagina ?? paginaAtual);
        const tamPagina = Number(resultado.tamanhoPagina ?? tamanhoPagina.value);
        const totalPaginas = Math.max(1, Math.ceil(total / tamPagina));

        paginaAtual = numPagina;

        totalRegistros.textContent = `${total} ${total === 1 ? "registro" : "registros"}`;
        paginaAtualElemento.textContent = `Página ${numPagina} de ${totalPaginas}`;

        btnAnterior.disabled = numPagina <= 1;
        btnProximo.disabled = numPagina >= totalPaginas || total === 0;
    } catch (error) {
        console.error("Erro em filtrarLembretes:", error);
        renderizarLembretes([]);
        totalRegistros.textContent = "0 registros";
        btnAnterior.disabled = true;
        btnProximo.disabled = true;
        mostrarToast(
            error.message || "Falha ao comunicar com a API. Verifique se o servidor está em execução.",
            "error"
        );
    }
}

// ========================================
// GET /lembretes/imprimir
// ========================================

async function imprimirLembretes() {
    if (!validarIntervalosDatas()) {
        return;
    }

    try {
        const params = montarParametrosConsulta();
        const response = await fetch(
            `${API_URL}/lembretes/imprimir?${params.toString()}`
        );

        if (!response.ok) {
            const detalhe = await extrairMensagemErro(response);
            throw new Error(detalhe || "Não foi possível gerar o relatório.");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "relatorio-lembretes.pdf";

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 10000);
        mostrarToast("Relatório gerado com sucesso!", "success");
    } catch (error) {
        console.error("Erro em imprimirLembretes:", error);
        mostrarToast(error.message || "Erro ao imprimir lembretes.", "error");
    }
}

// ========================================
// POST /lembretes
// ========================================

async function criarLembrete() {
    try {
        btnSalvar.disabled = true;

        const dados = {
            descricao: descricao.value.trim()
        };

        const response = await fetch(`${API_URL}/lembretes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        if (!response.ok) {
            const detalhe = await extrairMensagemErro(response);
            throw new Error(detalhe || "Erro ao criar lembrete.");
        }

        mostrarToast("Lembrete criado com sucesso!", "success");
        fecharFormulario();
        paginaAtual = 1;
        await filtrarLembretes();
    } catch (error) {
        console.error("Erro em criarLembrete:", error);
        mostrarToast(error.message || "Não foi possível criar o lembrete.", "error");
    } finally {
        btnSalvar.disabled = false;
    }
}

// ========================================
// GET /lembretes/{id}
// ========================================

async function buscarLembrete(id) {
    try {
        limparErroDescricao();

        const response = await fetch(`${API_URL}/lembretes/${id}`);

        if (!response.ok) {
            const detalhe = await extrairMensagemErro(response);
            throw new Error(detalhe || "Lembrete não encontrado.");
        }

        const lembrete = await response.json();

        lembreteId.value = lembrete.id;
        descricao.value = lembrete.descricao || "";
        tituloFormulario.textContent = "Editar lembrete";

        formulario.classList.remove("hidden");
        descricao.focus();
        formulario.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
        console.error("Erro em buscarLembrete:", error);
        mostrarToast(error.message || "Não foi possível buscar o lembrete.", "error");
    }
}

// ========================================
// PUT /lembretes/{id}
// ========================================

async function atualizarLembrete() {
    try {
        btnSalvar.disabled = true;

        const dados = {
            descricao: descricao.value.trim()
        };

        const response = await fetch(`${API_URL}/lembretes/${lembreteId.value}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        if (!response.ok) {
            const detalhe = await extrairMensagemErro(response);
            throw new Error(detalhe || "Erro ao atualizar lembrete.");
        }

        mostrarToast("Lembrete atualizado com sucesso!", "success");
        fecharFormulario();
        await filtrarLembretes();
    } catch (error) {
        console.error("Erro em atualizarLembrete:", error);
        mostrarToast(error.message || "Não foi possível atualizar o lembrete.", "error");
    } finally {
        btnSalvar.disabled = false;
    }
}

// ========================================
// DELETE /lembretes/{id}
// ========================================

async function excluirLembrete(id) {
    const confirmou = confirm("Deseja realmente excluir este lembrete?");

    if (!confirmou) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/lembretes/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const detalhe = await extrairMensagemErro(response);
            throw new Error(detalhe || "Erro ao excluir lembrete.");
        }

        mostrarToast("Lembrete excluído com sucesso!", "success");
        await filtrarLembretes();
    } catch (error) {
        console.error("Erro em excluirLembrete:", error);
        mostrarToast(error.message || "Não foi possível excluir o lembrete.", "error");
    }
}

// ========================================
// RENDERIZAÇÃO E ORDENAÇÃO
// ========================================

function renderizarLembretes(lembretes) {
    listaLembretes.innerHTML = "";

    if (!lembretes || lembretes.length === 0) {
        mensagemVazia.classList.remove("hidden");
        return;
    }

    mensagemVazia.classList.add("hidden");

    lembretes.forEach((lembrete) => {
        const tr = document.createElement("tr");

        const tdDescricao = document.createElement("td");
        tdDescricao.className = "col-descricao";
        tdDescricao.textContent = lembrete.descricao;

        const tdCadastro = document.createElement("td");
        tdCadastro.textContent = formatarData(lembrete.dataCadastro);

        const tdAtualizacao = document.createElement("td");
        tdAtualizacao.textContent = formatarData(lembrete.dataAtualizacao);

        const tdStatus = document.createElement("td");
        const spanStatus = document.createElement("span");
        spanStatus.className = `status ${lembrete.isAtivo ? "status-ativo" : "status-inativo"}`;
        spanStatus.textContent = lembrete.isAtivo ? "Ativo" : "Inativo";
        tdStatus.appendChild(spanStatus);

        const tdAcoes = document.createElement("td");
        const divAcoes = document.createElement("div");
        divAcoes.className = "actions";

        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "btn btn-edit";
        btnEditar.textContent = "Editar";
        btnEditar.addEventListener("click", () => buscarLembrete(lembrete.id));

        const btnExcluir = document.createElement("button");
        btnExcluir.type = "button";
        btnExcluir.className = "btn btn-danger";
        btnExcluir.textContent = "Excluir";
        btnExcluir.addEventListener("click", () => excluirLembrete(lembrete.id));

        divAcoes.appendChild(btnEditar);
        divAcoes.appendChild(btnExcluir);
        tdAcoes.appendChild(divAcoes);

        tr.appendChild(tdDescricao);
        tr.appendChild(tdCadastro);
        tr.appendChild(tdAtualizacao);
        tr.appendChild(tdStatus);
        tr.appendChild(tdAcoes);

        listaLembretes.appendChild(tr);
    });
}

function alternarOrdenacao(campo) {
    if (ordemAtual === campo) {
        direcaoAtual = direcaoAtual === "ASC" ? "DESC" : "ASC";
    } else {
        ordemAtual = campo;
        direcaoAtual = "ASC";
    }

    paginaAtual = 1;
    atualizarIndicadoresOrdenacao();
    filtrarLembretes();
}

function atualizarIndicadoresOrdenacao() {
    colunasOrdenaveis.forEach((botao) => {
        const campo = botao.dataset.ordem;
        const indicador = botao.querySelector(".sort-indicator");
        const estaAtivo = campo === ordemAtual;

        botao.classList.toggle("active", estaAtivo);

        if (!indicador) return;

        if (!estaAtivo) {
            indicador.textContent = "↕";
        } else {
            indicador.textContent = direcaoAtual === "ASC" ? "↑" : "↓";
        }
    });
}

colunasOrdenaveis.forEach((botao) => {
    botao.addEventListener("click", () => {
        alternarOrdenacao(botao.dataset.ordem);
    });
});

// ========================================
// FORMULÁRIO E VALIDAÇÃO
// ========================================

function limparErroDescricao() {
    descricao.classList.remove("input-error");
    erroDescricao.textContent = "";
    erroDescricao.classList.add("hidden");
}

function mostrarErroDescricao(mensagem) {
    descricao.classList.add("input-error");
    erroDescricao.textContent = mensagem;
    erroDescricao.classList.remove("hidden");
}

descricao.addEventListener("input", () => {
    if (descricao.value.trim()) {
        limparErroDescricao();
    }
});

btnImprimir.addEventListener("click", () => {
    imprimirLembretes();
});

btnNovo.addEventListener("click", () => {
    abrirFormularioNovo();
});

btnCancelar.addEventListener("click", () => {
    fecharFormulario();
});

formLembrete.addEventListener("submit", async (event) => {
    event.preventDefault();

    const texto = descricao.value.trim();

    if (!texto) {
        mostrarErroDescricao("A descrição do lembrete é obrigatória.");
        descricao.focus();
        mostrarToast("Preencha os campos obrigatórios antes de salvar.", "error");
        return;
    }

    limparErroDescricao();

    if (lembreteId.value) {
        await atualizarLembrete();
    } else {
        await criarLembrete();
    }
});

function abrirFormularioNovo() {
    lembreteId.value = "";
    descricao.value = "";
    limparErroDescricao();
    tituloFormulario.textContent = "Novo lembrete";
    formulario.classList.remove("hidden");
    descricao.focus();
}

function fecharFormulario() {
    formulario.classList.add("hidden");
    formLembrete.reset();
    lembreteId.value = "";
    limparErroDescricao();
}

// ========================================
// FILTROS E PAGINAÇÃO
// ========================================

btnFiltrar.addEventListener("click", () => {
    paginaAtual = 1;
    filtrarLembretes();
});

btnLimparFiltros.addEventListener("click", () => {
    filtroDescricao.value = "";
    filtroDataCadastroInicial.value = "";
    filtroDataCadastroFinal.value = "";
    filtroDataAtualizacaoInicial.value = "";
    filtroDataAtualizacaoFinal.value = "";
    tamanhoPagina.value = "10";
    paginaAtual = 1;
    filtrarLembretes();
    mostrarToast("Filtros limpos.", "success");
});

[
    filtroDescricao,
    filtroDataCadastroInicial,
    filtroDataCadastroFinal,
    filtroDataAtualizacaoInicial,
    filtroDataAtualizacaoFinal
].forEach((campo) => {
    campo.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            paginaAtual = 1;
            filtrarLembretes();
        }
    });
});

tamanhoPagina.addEventListener("change", () => {
    paginaAtual = 1;
    filtrarLembretes();
});

btnAnterior.addEventListener("click", () => {
    if (paginaAtual > 1) {
        paginaAtual--;
        filtrarLembretes();
    }
});

btnProximo.addEventListener("click", () => {
    paginaAtual++;
    filtrarLembretes();
});

// ========================================
// UTILITÁRIOS
// ========================================

async function extrairMensagemErro(response) {
    try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const body = await response.json();
            return body.message || body.title || body.detail || null;
        }
        const texto = await response.text();
        return texto || null;
    } catch {
        return null;
    }
}

function formatarData(data) {
    if (!data) {
        return "-";
    }

    const parsed = new Date(data);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleString("pt-BR");
}

function mostrarToast(mensagem, tipo = "info") {
    const toast = document.getElementById("toast");

    toast.textContent = mensagem;
    toast.className = "toast";

    if (tipo === "success") {
        toast.classList.add("toast-success");
    } else if (tipo === "error") {
        toast.classList.add("toast-error");
    }

    toast.classList.remove("hidden");

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 3500);
}
