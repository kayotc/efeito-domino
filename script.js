
"use strict";

const SP = [
  { id: "planta", n: "Plantas", e: "🌿", g: 0, prey: [], c: "#4caf50" },
  { id: "inseto", n: "Insetos polinizadores", e: "🐝", g: 1, prey: ["planta"], c: "#f5b301" },
  { id: "coelho", n: "Coelhos", e: "🐇", g: 1, prey: ["planta"], c: "#a1887f" },
  { id: "sapo", n: "Sapos", e: "🐸", g: 2, prey: ["inseto"], c: "#26a69a" },
  { id: "onca", n: "Onças", e: "🐆", g: 2, prey: ["coelho"], c: "#ef6c00" },
  { id: "cobra", n: "Cobras", e: "🐍", g: 3, prey: ["sapo"], c: "#7e57c2" },
  { id: "gaviao", n: "Gaviões", e: "🦅", g: 3, prey: ["cobra", "inseto"], c: "#42a5f5" }
];

const GROUPS = [
  "Produtores",
  "Consumidores primários",
  "Predadores intermediários",
  "Predadores de topo"
];

const byId = Object.fromEntries(SP.map(s => [s.id, s]));

SP.forEach(s => {
  s.preds = SP.filter(p => p.prey.includes(s.id)).map(p => p.id);
});

let X;
let dead;
let hist;
let paused = false;
let tick = 0;
let timer = null;
let stress = 0;
let pressure = {};
let researchPoints = 0;
const INITIAL_BIOMASS = SP.length * 0.6;

const $ = id => document.getElementById(id);
const refs = {};

function init() {
  X = {};
  dead = {};
  hist = {};

  SP.forEach(s => {
    X[s.id] = 0.6;
    dead[s.id] = false;
    hist[s.id] = [];
  });

  $("log").innerHTML = "";
  tick = 0;
  stress = 0;
  pressure = Object.fromEntries(SP.map(s => [s.id, 0]));
  researchPoints = 0;
  if ($("researchPoints")) $("researchPoints").textContent = "0";
  if ($("responseMessage")) $("responseMessage").textContent = "Ações de recuperação disponíveis durante a simulação.";

  log("Ecossistema em equilíbrio. Faça sua intervenção!");
  frame();
}

function log(message) {
  const li = document.createElement("li");
  li.textContent = message;
  $("log").prepend(li);
}

function kill(id, manual) {
  if (dead[id]) return;

  dead[id] = true;
  X[id] = 0;

  const s = byId[id];

  log(
    manual
      ? `${s.e} ${s.n} foram removidos do ecossistema.`
      : `💀 ${s.e} ${s.n} entraram em colapso (extintos).`
  );
}

function step() {
  const dt = 0.1;
  const r = 0.8;
  const m = 0.15;
  const c = 0.5;
  const nx = {};

  SP.forEach(s => {
    if (dead[s.id]) {
      nx[s.id] = 0;
      return;
    }

    const x = X[s.id];

    let sup = 1;

    if (s.prey.length) {
      sup = Math.min(
        1,
        1.3 *
        s.prey.reduce((sum, p) => sum + X[p], 0) /
        s.prey.length
      );
    }

    const pred = s.preds.reduce(
      (sum, p) => sum + X[p],
      0
    );

    const mort = s.prey.length ? m : 0;

    // Pressão ambiental persistente: cada desastre continua prejudicando
    // as espécies afetadas e pode provocar efeitos em cascata na cadeia alimentar.
    const localPressure = pressure[s.id] || 0;
    const environmentalLoss = x * (stress * 0.08 + localPressure * 0.22);
    const v = x + dt * (
      r * x * (sup - x) -
      mort * x -
      c * x * pred -
      environmentalLoss
    );

    nx[s.id] = Math.max(0, Math.min(1, v));
  });

  SP.forEach(s => {
    X[s.id] = nx[s.id];

    if (!dead[s.id] && X[s.id] < 0.03) {
      kill(s.id, false);
    }
  });

  tick++;
  if (tick % 25 === 0) {
    researchPoints += 1;
    if ($("researchPoints")) $("researchPoints").textContent = String(researchPoints);
  }
}

function build() {
  const web = $("web");
  web.innerHTML = "";

  SP.forEach(s => {
    delete refs[s.id];
  });

  GROUPS.forEach((group, i) => {
    const label = document.createElement("div");
    label.className = "lbl";
    label.textContent = group;
    web.appendChild(label);

    const row = document.createElement("div");
    row.className = "lvl";

    SP.filter(s => s.g === i).forEach(s => {
      const card = document.createElement("div");
      card.className = "sp";

      const eats = s.prey.length
        ? "Come: " + s.prey.map(
            p => byId[p].n.split(" ")[0]
          ).join(", ")
        : "Produz energia (sol)";

      card.innerHTML = `
        <div class="top">
          <b>${s.e} ${s.n}</b>
          <button type="button" class="danger">Remover</button>
        </div>
        <div class="eats">${eats}</div>
        <div class="meter">
          <i style="background:${s.c}"></i>
        </div>
      `;

      card.querySelector("button").addEventListener(
        "click",
        () => kill(s.id, true)
      );

      refs[s.id] = {
        card,
        bar: card.querySelector(".meter i")
      };

      row.appendChild(card);
    });

    web.appendChild(row);
  });

  $("legend").innerHTML = SP.map(s =>
    `<span style="--c:${s.c}">${s.n}</span>`
  ).join("");
}

function draw() {
  const canvas = $("chart");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (!w || !h) return;

  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  const ctx = canvas.getContext("2d");

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const styles = getComputedStyle(
    document.documentElement
  );

  ctx.strokeStyle = styles.getPropertyValue("--bd").trim();
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = 4 + (h - 8) * i / 4;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  SP.forEach(s => {
    const values = hist[s.id];

    if (values.length < 2) return;

    ctx.strokeStyle = s.c;
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((value, i) => {
      const x = i / 299 * w;
      const y = h - 4 - value * (h - 8);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  });
}

function frame() {
  if (!paused) {
    for (let i = 0; i < 2; i++) {
      step();
    }

    SP.forEach(s => {
      const values = hist[s.id];

      values.push(X[s.id]);

      if (values.length > 300) {
        values.shift();
      }
    });
  }

  let alive = 0;

  SP.forEach(s => {
    const ref = refs[s.id];

    if (!ref) return;

    ref.bar.style.width = (X[s.id] * 100) + "%";
    ref.card.classList.toggle("dead", dead[s.id]);

    if (!dead[s.id]) {
      alive++;
    }
  });

  const stat = $("stat");

  stat.textContent = `Espécies vivas: ${alive}/${SP.length}`;

  // Indicadores relativos à biomassa inicial estimada: vivos + perdidos = 100%.
  const currentBiomass = SP.reduce((sum, species) => sum + (X[species.id] || 0), 0);
  const alivePct = Math.max(0, Math.min(100, currentBiomass / INITIAL_BIOMASS * 100));
  const deadPct = 100 - alivePct;
  if ($("alivePercent")) $("alivePercent").textContent = `${alivePct.toFixed(1).replace(".", ",")}%`;
  if ($("deadPercent")) $("deadPercent").textContent = `${deadPct.toFixed(1).replace(".", ",")}%`;
  if ($("aliveMeter")) $("aliveMeter").style.width = `${alivePct}%`;
  if ($("deadMeter")) $("deadMeter").style.width = `${deadPct}%`;
  if ($("aliveCount")) $("aliveCount").textContent = `Biomassa restante estimada: ${alivePct.toFixed(1).replace(".", ",")}%`;
  if ($("extinctCount")) $("extinctCount").textContent = `${SP.filter(species => dead[species.id]).length} / ${SP.length}`;
  if ($("pressureLevel")) {
    const pressureScore = stress + Object.values(pressure).reduce((sum, value) => sum + value, 0) / SP.length;
    $("pressureLevel").textContent = pressureScore < 0.5 ? "Baixa" : pressureScore < 1.5 ? "Moderada" : pressureScore < 3 ? "Alta" : "Crítica";
    $("pressureLevel").style.color = pressureScore < 0.5 ? "#5fe0a0" : pressureScore < 1.5 ? "#f6d36b" : "#ff7a83";
    $("pressureDetail").textContent = `${pressureScore.toFixed(1).replace(".", ",")} pontos de pressão acumulada`;
  }

  stat.style.color =
    alive === SP.length
      ? "var(--ok)"
      : alive <= 3
        ? "var(--bad)"
        : "inherit";

  draw();
}

$("drought").addEventListener("click", () => {
  if (!dead.planta) {
    X.planta *= 0.25;
    pressure.planta = Math.min(3, (pressure.planta || 0) + 1.2);
    pressure.inseto = Math.min(3, (pressure.inseto || 0) + 0.35);

    log(
      "☀️ Seca severa: as plantas perderam 75% da população."
    );

    frame();
  }
});

$("poison").addEventListener("click", () => {
  if (!dead.inseto) {
    X.inseto *= 0.1;
    pressure.inseto = Math.min(3, (pressure.inseto || 0) + 1.3);
    pressure.sapo = Math.min(3, (pressure.sapo || 0) + 0.45);

    log(
      "🧪 Agrotóxico: 90% dos insetos morreram."
    );

    frame();
  }
});


function impact(name, factor, message, targets = SP.map(s => s.id)) {
  // Os efeitos se acumulam: repetir desastres aumenta a pressão no ambiente.
  stress = Math.min(3.5, stress + factor * 0.55);
  targets.forEach(id => {
    if (dead[id]) return;
    pressure[id] = Math.min(3, (pressure[id] || 0) + factor * 1.35);
    // Dano instantâneo perceptível nas barras e no gráfico.
    X[id] *= Math.max(0.08, 1 - factor * 1.25);
    if (X[id] < 0.03) kill(id, false);
  });
  log(message + ` Impacto aplicado a ${targets.length} grupo(s); os efeitos continuam ao longo da simulação.`);
  frame();
}

$("deforestation").addEventListener("click", () =>
  impact("desmatamento", 0.42, "🪓 Desmatamento: perda de árvores, abrigo e alimento; a erosão aumenta.", ["planta","inseto","coelho","sapo"])
);
$("airPollution").addEventListener("click", () =>
  impact("poluição do ar", 0.22, "🏭 Poluição do ar: fumaça e gases afetam a saúde dos seres vivos e a vegetação.")
);
$("waterPollution").addEventListener("click", () =>
  impact("poluição da água", 0.35, "🛢️ Poluição da água: esgoto, óleo e químicos contaminam rios e prejudicam a vida aquática.", ["planta","inseto","sapo","cobra"])
);
$("plasticPollution").addEventListener("click", () =>
  impact("plástico e lixo", 0.25, "🧴 Plásticos e resíduos: animais podem ingerir lixo ou ficar presos nele.")
);
$("soilPollution").addEventListener("click", () =>
  impact("contaminação do solo", 0.3, "☣️ Contaminação do solo: resíduos tóxicos reduzem a fertilidade e contaminam a cadeia alimentar.", ["planta","inseto","coelho"])
);
$("fire").addEventListener("click", () =>
  impact("queimada", 0.48, "🔥 Queimada: destrói vegetação, ninhos e abrigos; a fumaça também polui o ar.", ["planta","inseto","coelho","sapo"])
);
$("climate").addEventListener("click", () =>
  impact("aquecimento global", 0.28, "🌡️ Aquecimento global: ondas de calor e mudanças nas chuvas desequilibram o ecossistema.")
);
$("overfishing").addEventListener("click", () =>
  impact("caça e pesca excessivas", 0.3, "🎣 Caça e pesca excessivas: a retirada de animais rompe relações alimentares.", ["coelho","sapo","cobra","gaviao","onca"])
);
$("mining").addEventListener("click", () =>
  impact("mineração", 0.34, "⛏️ Mineração: desmatamento, sedimentos e metais contaminantes degradam habitats.", ["planta","inseto","sapo","coelho"])
);
$("invasive").addEventListener("click", () =>
  impact("espécies invasoras", 0.24, "🦎 Espécies invasoras: competem com espécies nativas e podem transmitir doenças.")
);
$("habitat").addEventListener("click", () =>
  impact("fragmentação do habitat", 0.27, "🏗️ Fragmentação do habitat: estradas e construções isolam populações e dificultam a reprodução.", ["onca","gaviao","cobra","coelho"])
);

function recovery(cost, message, targets, amount = 0.12) {
  if (researchPoints < cost) {
    $("responseMessage").textContent = `Você precisa de ${cost} pontos de pesquisa. Ganhe pontos deixando a simulação avançar.`;
    return;
  }
  researchPoints -= cost;
  $("researchPoints").textContent = String(researchPoints);
  targets.forEach(id => {
    pressure[id] = Math.max(0, (pressure[id] || 0) - amount * 2.5);
    if (!dead[id]) X[id] = Math.min(1, X[id] + amount);
  });
  stress = Math.max(0, stress - amount * 0.45);
  $("responseMessage").textContent = message;
  log(message);
  frame();
}

$("restorePlants").addEventListener("click", () => recovery(3, "🌱 Reflorestamento: a vegetação foi recuperada parcialmente e a pressão sobre os habitats diminuiu.", ["planta", "coelho", "inseto"], 0.18));
$("cleanWater").addEventListener("click", () => recovery(2, "💧 Limpeza das águas: parte da contaminação foi reduzida e espécies ligadas à água receberam alívio.", ["planta", "inseto", "sapo", "cobra"], 0.14));
$("protectWildlife").addEventListener("click", () => recovery(3, "🛡️ Proteção da fauna: ações de conservação ajudaram a recuperar populações animais.", ["inseto", "coelho", "sapo", "onca", "cobra", "gaviao"], 0.12));
$("reduceEmissions").addEventListener("click", () => recovery(4, "🌬️ Redução de emissões: a pressão ambiental geral diminuiu e o ecossistema ganhou tempo para se recuperar.", SP.map(species => species.id), 0.08));

$("pause").addEventListener("click", event => {
  paused = !paused;

  event.currentTarget.textContent = paused
    ? "▶ Continuar"
    : "⏸ Pausar";
});

$("reset").addEventListener("click", () => {
  init();
});

const BASE = SP.map(s => [s.e, s.n]);

const REGIONS = {
  am: {
    n: "Amazônia",
    b: "floresta tropical",
    sp: [
      ["🌳", "Árvores"],
      ["🦋", "Borboletas"],
      ["🦥", "Preguiças"],
      ["🐸", "Sapos-flecha"],
      ["🐆", "Onças"],
      ["🐍", "Sucuris"],
      ["🦅", "Harpias"]
    ]
  },

  ce: {
    n: "Cerrado",
    b: "savana brasileira",
    sp: [
      ["🌾", "Gramíneas"],
      ["🐜", "Cupins"],
      ["🦌", "Veados"],
      ["🐦", "Seriemas"],
      ["🐺", "Lobos-guará"],
      ["🐈", "Jaguatiricas"],
      ["🦅", "Gaviões"]
    ]
  },

  ca: {
    n: "Caatinga",
    b: "semiárido",
    sp: [
      ["🌵", "Cactos"],
      ["🐝", "Abelhas"],
      ["🐁", "Preás"],
      ["🦎", "Lagartos"],
      ["🦊", "Raposas"],
      ["🐍", "Jiboias"],
      ["🦅", "Carcarás"]
    ]
  },

  ma: {
    n: "Mata Atlântica",
    b: "floresta costeira",
    sp: [
      ["🌳", "Jequitibás"],
      ["🦋", "Borboletas"],
      ["🐒", "Micos"],
      ["🐸", "Sapos"],
      ["🐆", "Onças"],
      ["🐍", "Jararacas"],
      ["🦅", "Gaviões"]
    ]
  },

  pt: {
    n: "Pantanal",
    b: "maior planície alagada do mundo",
    sp: [
      ["🌿", "Aguapés"],
      ["🦟", "Mosquitos"],
      ["🐹", "Capivaras"],
      ["🐸", "Pererecas"],
      ["🐆", "Onças-pintadas"],
      ["🐊", "Jacarés"],
      ["🦅", "Gaviões"]
    ]
  },

  pa: {
    n: "Pampa",
    b: "campos do sul",
    sp: [
      ["🌾", "Capim"],
      ["🐞", "Besouros"],
      ["🦌", "Veados"],
      ["🐦", "Quero-queros"],
      ["🐈", "Gatos-do-mato"],
      ["🐍", "Cobras"],
      ["🦅", "Gaviões"]
    ]
  }
};

const BIOME_COLORS = {
  am: "#25a66a", ce: "#e7a83e", ca: "#c8794b",
  ma: "#3b9fba", pt: "#6b75d6", pa: "#b8a85a", base: "#5d8c77"
};

function setRegion(key) {
  const data = key === "base"
    ? BASE
    : REGIONS[key].sp;

  SP.forEach((s, i) => {
    s.e = data[i][0];
    s.n = data[i][1];
  });

  build();
  init();

  document.querySelectorAll(".reg").forEach(region => {
    region.style.setProperty("--c", BIOME_COLORS[region.dataset.r] || BIOME_COLORS.base);
    region.classList.toggle(
      "on",
      region.dataset.r === key
    );
  });

  $("mapsvg").classList.toggle(
    "sel",
    key !== "base"
  );

  document.querySelectorAll(".chip").forEach(chip => {
    chip.classList.toggle(
      "on",
      chip.dataset.r === key
    );
  });

  const description = key === "base"
    ? "Ecossistema padrão"
    : REGIONS[key].n + " — " + REGIONS[key].b;

  $("biome").textContent = "📍 " + description;

  log("📍 Bioma: " + description);
}

const chips = [
  ["base", "🌐 Padrão"],
  ...Object.keys(REGIONS).map(key => [
    key,
    REGIONS[key].n
  ])
];

$("chips").innerHTML = chips.map(([key, name]) =>
  `<button type="button" class="chip" data-r="${key}">${name}</button>`
).join("");

document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    setRegion(chip.dataset.r);
  });
});

const STATES = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins"
};

function pick(region) {
  setRegion(region.dataset.r);

  $("biome").textContent +=
    " · " + STATES[region.dataset.uf];
}

document.querySelectorAll(".reg").forEach(region => {
  region.addEventListener("click", () => {
    pick(region);
  });

  region.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(region);
    }
  });
});

build();
init();
setRegion("base");

timer = window.setInterval(frame, 60);

// Atualiza o gráfico quando a janela muda de tamanho.
window.addEventListener("resize", draw);

// Evita deixar a simulação rodando quando a página é fechada.
window.addEventListener("pagehide", () => {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
});