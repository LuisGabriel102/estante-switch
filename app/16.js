// etiquetas da Estante: g.et = "px tb jr" (códigos separados por espaço); grupos para agrupar os chips
const ETIQ_GRUPOS = {jeito: "Jeito de jogar", combate: "Combate", historia: "História", estilo: "Estilo", duracao: "Duração", jogar: "Com quem"};
const ETIQ = {
  jr: {label: "JRPG", grupo: "jeito"},
  mz: {label: "Masmorra", grupo: "jeito"},
  lj: {label: "Livro-jogo", grupo: "jeito"},
  mo: {label: "Pega monstros", grupo: "jeito"},
  ow: {label: "Mundo aberto", grupo: "jeito"},
  pc: {label: "Point-and-click", grupo: "jeito"},
  tb: {label: "Por turnos", grupo: "combate"},
  tr: {label: "Tempo real", grupo: "combate"},
  cb: {label: "Cartas", grupo: "combate"},
  sh: {label: "Navinha (shmup)", grupo: "combate"},
  be: {label: "Beat 'em up", grupo: "combate"},
  rm: {label: "Com romance", grupo: "historia"},
  hi: {label: "História forte", grupo: "historia"},
  pp: {label: "Crie seu herói", grupo: "historia"},
  px: {label: "Pixel art", grupo: "estilo"},
  an: {label: "Anime", grupo: "estilo"},
  cz: {label: "Tranquilo", grupo: "estilo"},
  tl: {label: "Clima de terror", grupo: "estilo"},
  cu: {label: "Curto", grupo: "duracao"},
  lg: {label: "Longo", grupo: "duracao"},
  co: {label: "Cooperativo", grupo: "jogar"},
  on: {label: "Só online", grupo: "jogar"},
  f2: {label: "Grátis (F2P)", grupo: "jogar"}
};

