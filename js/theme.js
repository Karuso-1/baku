// Paletas de fondo y foto de fondo.
export const PALETTES = {
  nori: {
    name: 'Nori',
    vars: { fondo: '#1B3A2F', pino: '#2F5D4A', arena: '#C8A982', 'arena-claro': '#E3CDA8', salvia: '#9CC7AF', oxido: '#B5653A', 'oxido-claro': '#F2A57E' },
    blobs: ['#2F5D4A', '#C8A982', '#F2EADB', '#3E6B57', '#C8A982', '#2F5D4A'],
  },
  otono: {
    name: 'Otoño',
    vars: { fondo: '#2A211A', pino: '#4E3B2C', arena: '#D9A066', 'arena-claro': '#EBC9A0', salvia: '#B8C99C', oxido: '#B04A6A', 'oxido-claro': '#F08FAE' },
    blobs: ['#4E3B2C', '#B5653A', '#F2EADB', '#6B4A33', '#E3CDA8', '#3D2C20'],
  },
  bruma: {
    name: 'Bruma',
    vars: { fondo: '#14262F', pino: '#1F3B4A', arena: '#A9C2C9', 'arena-claro': '#D3E0E2', salvia: '#9CC7AF', oxido: '#B5653A', 'oxido-claro': '#F2A57E' },
    blobs: ['#1F3B4A', '#5D8C9C', '#F2EADB', '#2B5566', '#C9D8C5', '#1F3B4A'],
  },
};

export let colors = { ...PALETTES.nori.vars };
let photoUrl;

export function applyTheme(settings) {
  // Con foto propia se mantiene Nori; con paleta cambia todo
  const key = settings.bgPhoto ? 'nori' : settings.palette || 'nori';
  const pal = PALETTES[key];
  colors = { ...pal.vars };
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(pal.vars)) root.setProperty('--' + k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pal.vars.fondo);
  const bg = document.querySelector('.bg');
  if (bg) {
    bg.querySelector('rect').setAttribute('fill', pal.vars.fondo);
    bg.querySelectorAll('g circle').forEach((c, i) => c.setAttribute('fill', pal.blobs[i]));
  }
  let img = document.getElementById('bgphoto');
  if (settings.bgPhoto) {
    if (!img) {
      img = document.createElement('div');
      img.id = 'bgphoto';
      img.innerHTML = '<img alt=""><span></span>';
      document.body.prepend(img);
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(settings.bgPhoto);
    const el = img.querySelector('img');
    el.src = photoUrl;
    el.style.filter = `blur(${Math.round(settings.bgBlur / 4)}px)`;
    img.querySelector('span').style.background = `rgba(10,20,16,${settings.bgDim / 100})`;
    if (bg) bg.style.display = 'none';
  } else {
    img?.remove();
    if (bg) bg.style.display = '';
  }
}
