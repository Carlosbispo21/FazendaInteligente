const source = (title, url) => ({ title, url });
const fao = source("FAO 56 — água disponível e salinidade do solo", "https://www.fao.org/4/X0490E/x0490e0e.htm");
const hydro = source("Oklahoma State University — CE em hidroponia", "https://extension.okstate.edu/fact-sheets/electrical-conductivity-and-ph-guide-for-hydroponics");
const fahrenheit = (a, b) => [a, b].map((v) => Math.round((v - 32) * 5 / 9 * 10) / 10);
const temperature = (values, context, citation) => ({ values, context, source: citation });
const solutionEC = (values, citation = hydro) => ({ values, context: "Solução nutritiva hidropônica; não é CE direta do solo.", source: citation });
const depletion = (value) => ({ value, context: "Fração de depleção de água disponível, para evapotranspiração de cerca de 5 mm/dia. Não é o percentual mostrado pelo sensor.", source: fao });

export const cultureCatalog = [
  { id: "callisia", name: "Planta-cesto", scientificName: "Callisia fragrans", aliases: ["callisia", "planta-cesto"], emoji: "🪴", color: "#2fbfa0",
    note: "Os limites exibidos para o monitoramento são os cadastrados no experimento. Não foi identificada uma fonte que valide uma faixa universal de umidade e CE para esta espécie." },
  { id: "tomate", name: "Tomate", scientificName: "Solanum lycopersicum", aliases: ["tomate", "tomato"], emoji: "🍅", color: "#E53935", moisture: depletion(0.40), ec: solutionEC([2000, 4000]),
    temperature: temperature(fahrenheit(70, 85), "Temperatura do ar durante o dia, para crescimento.", source("Iowa State University — tomate", "https://yardandgarden.extension.iastate.edu/faq/my-tomato-plants-are-flowering-arent-setting-fruit-why")) },
  { id: "alface", name: "Alface", scientificName: "Lactuca sativa", aliases: ["alface", "lettuce"], emoji: "🥬", color: "#66BB6A", moisture: depletion(0.30), ec: solutionEC([1200, 1800]),
    temperature: temperature(fahrenheit(60, 70), "Temperatura média diária do ar.", source("Illinois Extension — alface", "https://extension.illinois.edu/gardening/lettuce")) },
  { id: "manjericao", name: "Manjericão", scientificName: "Ocimum basilicum", aliases: ["manjericao", "basil"], emoji: "🌿", color: "#43A047", ec: solutionEC([1000, 1600]),
    temperature: temperature(fahrenheit(68, 77), "Faixa ótima de cultivo na referência de aquaponia.", source("Oklahoma State University — aquaponia", "https://extension.okstate.edu/fact-sheets/aquaponics")) },
  { id: "pimenta", name: "Pimenta", scientificName: "Capsicum spp.", aliases: ["pimenta", "pepper", "capsicum"], emoji: "🌶️", color: "#D32F2F", ec: solutionEC([800, 1800]),
    note: "Referências gerais para Capsicum; variedade e estágio de crescimento precisam ser considerados.",
    temperature: temperature(fahrenheit(70, 80), "Temperatura do ar de dia; à noite, a fonte indica 15,6–21,1 °C.", source("Oregon State University — pimentas", "https://extension.oregonstate.edu/catalog/ec-1227-grow-your-own-peppers")) },
  { id: "cenoura", name: "Cenoura", scientificName: "Daucus carota", aliases: ["cenoura", "carrot"], emoji: "🥕", color: "#FB8C00", moisture: depletion(0.35),
    ec: { values: [1000], context: "Limiar de salinidade do extrato de saturação (ECe) associado à redução de produtividade; não é faixa ótima nem limite mínimo de nutrientes.", source: fao },
    temperature: temperature(fahrenheit(50, 65), "Temperatura ótima de crescimento.", source("Clemson Cooperative Extension — cenoura", "https://hgic.clemson.edu/factsheet/carrot-beet-radish-parsnip/")) },
  { id: "morango", name: "Morango", scientificName: "Fragaria × ananassa", aliases: ["morango", "strawberry", "fragaria"], emoji: "🍓", color: "#EC407A", moisture: depletion(0.20), ec: solutionEC([1800, 2200]),
    temperature: temperature(fahrenheit(50, 80), "Faixa de cultivo para floração e produção no contexto descrito pela UF/IFAS.", source("University of Florida IFAS — morangos", "https://sfyl.ifas.ufl.edu/lawn-and-garden/growing-strawberries/")) },
  { id: "rucula", name: "Rúcula", scientificName: "Eruca sativa", aliases: ["rucula", "arugula", "eruca"], emoji: "🌱", color: "#7CB342",
    ec: { values: [1200, 1500, 1800, 2100], context: "Tratamentos experimentais em solução nutritiva, cultivar Standard; não representam uma faixa ótima universal.", source: source("Pesquisa da Ohio State University — rúcula", "https://www.mdpi.com/2073-4395/11/7/1340") },
    temperature: temperature(fahrenheit(65, 75), "Condições ótimas de crescimento descritas no manual.", source("SARE — produção de rúcula", "https://www.sare.org/publications/northeast-crop-production-harvest-manual/arugula/")) },
  { id: "girassol", name: "Girassol", scientificName: "Helianthus annuus", aliases: ["girassol", "sunflower", "helianthus"], emoji: "🌻", color: "#FDD835", moisture: depletion(0.45),
    ec: { values: [4800], context: "Limiar de tolerância à salinidade do solo; não representa uma faixa ótima ou CE mínima.", source: source("FAO — resposta das culturas à água", "https://www.fao.org/4/i2800e/i2800e.pdf") },
    temperature: temperature(fahrenheit(70, 78), "Temperatura ótima de crescimento; a fonte relata tolerância a uma faixa mais ampla.", source("University of Wisconsin — girassol", "https://corn.aae.wisc.edu/Crops/Sunflower.aspx")) },
];

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function findCatalogCulture(name = "") {
  const normalized = normalize(name);
  return cultureCatalog.find((entry) => entry.aliases.some((alias) => normalized.includes(alias)));
}

export function validLimits(values) {
  return ["umidade", "ce", "temperatura"].every((metric) => {
    const min = values[`${metric}_min`], max = values[`${metric}_max`];
    return min !== "" && max !== "" && Number.isFinite(Number(min)) && Number.isFinite(Number(max)) && Number(min) <= Number(max)
      && (metric !== "umidade" || (Number(min) >= 0 && Number(max) <= 100)) && (metric !== "ce" || Number(min) >= 0);
  });
}
