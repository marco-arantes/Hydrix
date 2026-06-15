export interface IBGEMunicipio {
  id: number;
  nome: string;
  microrregiao: {
    nome: string;
    mesorregiao: {
      nome: string;
      UF: {
        id: number;
        sigla: string;
        nome: string;
        regiao: {
          nome: string;
        };
      };
    };
  };
}

export interface IBGEStats {
  codigo: number;
  populacao?: { valor: string; ano: string };
  populacaoEstimada?: { valor: string; ano: string };
  area?: { valor: string; ano: string };
  densidade?: { valor: string; ano: string };
  pibPerCapita?: { valor: string; ano: string };
  esgotamentoSanitario?: { valor: string; ano: string };
  urbanizacao?: { valor: string; ano: string };
  arborizacao?: { valor: string; ano: string };
  areaUrbanizada?: { valor: string; ano: string };
  bioma?: { valor: string; ano: string };
}

let cachedMunicipios: IBGEMunicipio[] | null = null;

/**
 * Busca a lista de todos os municípios do Brasil no IBGE (apenas na primeira vez e faz cache)
 * e retorna os dados do município cujo nome corresponde ao parâmetro.
 */
export async function getIbgeDataByMunicipalityName(name: string): Promise<IBGEMunicipio | null> {
  if (!name) return null;

  try {
    if (!cachedMunicipios) {
      const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
      if (!response.ok) {
        throw new Error('Falha ao buscar dados do IBGE');
      }
      cachedMunicipios = await response.json();
    }

    // Extrai apenas o nome da cidade caso venha no formato "Cidade - UF" ou "Cidade, Estado"
    let cleanName = name.split('-')[0].split(',')[0].trim();
    
    // Procura o município (ignorando diferenças de maiúsculas/minúsculas)
    const normalizedSearch = cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Tenta encontrar o município em SP primeiro (já que o projeto é na bacia do Pardo/SP)
    let found = cachedMunicipios?.find(m => {
      const normalizedName = m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normalizedName === normalizedSearch && m.microrregiao.mesorregiao.UF.sigla === 'SP';
    });

    // 2. Se não encontrou em SP, tenta em qualquer estado
    if (!found) {
      found = cachedMunicipios?.find(m => {
        const normalizedName = m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalizedName === normalizedSearch;
      });
    }

    // 3. Se a string original continha o estado, podemos tentar usar isso para desempatar:
    if (name.includes('-') || name.includes(',')) {
      const parts = name.split(/[-,]/);
      if (parts.length > 1) {
        const stateStr = parts[1].trim().toLowerCase();
        const foundWithState = cachedMunicipios?.find(m => {
          const normalizedName = m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return normalizedName === normalizedSearch && m.microrregiao.mesorregiao.UF.sigla.toLowerCase() === stateStr;
        });
        if (foundWithState) found = foundWithState;
      }
    }

    return found || null;
  } catch (error) {
    console.error("Erro ao buscar município no IBGE:", error);
    return null;
  }
}

/**
 * Busca estatísticas de panorama do IBGE usando o ID do município (7 dígitos)
 */
export async function getIbgeMunicipalityStats(id: number): Promise<IBGEStats> {
  const stats: IBGEStats = { codigo: id };

  try {
    // 96385: População (2022), 29171: População estimada, 96414: Área territorial (2022), 96386: Densidade demográfica (2022), 47001: PIB per capita, 60030: Esgotamento, 60031: Urbanização, 60029: Arborização, 95335: Área urbanizada, 77861: Bioma
    const url = `https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores/96385|29171|96414|96386|47001|60030|60031|60029|95335|77861/resultados/${id}`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();

      data.forEach((indicador: any) => {
        if (!indicador.res || indicador.res.length === 0) return;

        // Pega os resultados do município
        const resLocal = indicador.res[0].res;
        if (!resLocal) return;

        // Pega o valor do ano mais recente disponível
        const anos = Object.keys(resLocal).sort().reverse();
        if (anos.length === 0) return;

        const valorMaisRecente = resLocal[anos[0]];

        switch (indicador.id) {
          case 96385: // População residente
            stats.populacao = { valor: parseInt(valorMaisRecente).toLocaleString('pt-BR'), ano: anos[0] };
            break;
          case 29171: // População estimada
            stats.populacaoEstimada = { valor: parseInt(valorMaisRecente).toLocaleString('pt-BR'), ano: anos[0] };
            break;
          case 96414:
          case 29168: // Área
            stats.area = { valor: parseFloat(valorMaisRecente).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 }), ano: anos[0] };
            break;
          case 96386: // Densidade Demográfica
            stats.densidade = { valor: parseFloat(valorMaisRecente).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), ano: anos[0] };
            break;
          case 47001: // PIB per Capita
            stats.pibPerCapita = { valor: parseFloat(valorMaisRecente).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), ano: anos[0] };
            break;
          case 60030: // Esgotamento sanitário adequado
            stats.esgotamentoSanitario = { valor: `${parseFloat(valorMaisRecente).toLocaleString('pt-BR')}%`, ano: anos[0] };
            break;
          case 60031:
          case 60045: // Urbanização de vias públicas
            stats.urbanizacao = { valor: `${parseFloat(valorMaisRecente).toLocaleString('pt-BR')}%`, ano: anos[0] };
            break;
          case 60029: // Arborização de vias públicas
            stats.arborizacao = { valor: `${parseFloat(valorMaisRecente).toLocaleString('pt-BR')}%`, ano: anos[0] };
            break;
          case 95335:
          case 8418: // Área urbanizada
            stats.areaUrbanizada = { valor: `${parseFloat(valorMaisRecente).toLocaleString('pt-BR')} km²`, ano: anos[0] };
            break;
          case 77861:
          case 7786: // Bioma predominante
            stats.bioma = { valor: valorMaisRecente.toString().replace(/;/g, ', '), ano: anos[0] };
            break;
        }
      });

      // Calcular densidade se tiver população e área (fallback caso o indicador 96386 não retorne)
      if (!stats.densidade && stats.populacao && stats.area) {
        const popInt = parseInt(stats.populacao.valor.replace(/\./g, ''));
        const areaFloat = parseFloat(stats.area.valor.replace(/\./g, '').replace(',', '.'));
        if (areaFloat > 0) {
          stats.densidade = {
            valor: (popInt / areaFloat).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            ano: stats.populacao.ano
          };
        }
      }
    }
  } catch (error) {
    console.error("Erro ao buscar estatísticas do IBGE:", error);
  }

  return stats;
}

/**
 * Gera a URL para o portal IBGE Cidades
 */
export function getIbgeCidadesUrl(municipio: IBGEMunicipio): string {
  // Exemplo: https://cidades.ibge.gov.br/brasil/sp/ribeirao-preto/panorama
  return `https://cidades.ibge.gov.br/brasil/${municipio.microrregiao.mesorregiao.UF.sigla.toLowerCase()}/${municipio.id}/panorama`;
}

/**
 * Gera a URL presumida para o site oficial da prefeitura do município
 * Exemplo: Ribeirão Preto (SP) -> https://www.ribeiraopreto.sp.gov.br/
 */
export function getPrefeituraUrl(municipioName: string, uf: string): string {
  // Remove acentos, transforma em minúsculas e remove espaços
  const slug = municipioName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

  return `https://www.${slug}.${uf.toLowerCase()}.gov.br/`;
}
