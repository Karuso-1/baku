// Cálculo del plan: metabolismo, actividad, déficit y macros.

// Factor de actividad: tipo de trabajo × días de entreno (0 / 1–2 / 3–4 / 5+)
export const FACTORS = {
  sentado: [1.2, 1.375, 1.55, 1.725],
  depie: [1.375, 1.55, 1.55, 1.725],
  fisico: [1.55, 1.725, 1.725, 1.9],
};
export const LEVEL_NAMES = { 1.2: 'Sedentaria', 1.375: 'Ligera', 1.55: 'Moderada', 1.725: 'Alta', 1.9: 'Muy alta' };

export const KCAL_PER_KG = 7700;
export const MIN_KCAL = 1500;

export function activityFactor(work, days) {
  return FACTORS[work][days];
}

// Mifflin-St Jeor
export function bmr({ sex, weight, height, age }) {
  return 10 * weight + 6.25 * height - 5 * age + (sex === 'mujer' ? -161 : 5);
}

export function bmi(weight, heightCm) {
  const m = heightCm / 100;
  return weight / (m * m);
}

export function computePlan(p) {
  const base = bmr(p);
  const factor = activityFactor(p.work, p.days);
  // tdeeAdjust: corrección aprendida de tus pesajes y lo que comes (ver estimateRealTDEE)
  const tdee = base * factor + (p.tdeeAdjust || 0);
  const daily = (p.rate * KCAL_PER_KG) / 7;
  let kcal = tdee;
  if (p.goal === 'perder') kcal = tdee - daily;
  if (p.goal === 'ganar') kcal = tdee + daily;
  const floored = kcal < MIN_KCAL;
  kcal = Math.round(Math.max(MIN_KCAL, kcal) / 10) * 10;

  const protein = Math.round(1.8 * p.weight);
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  const diff = Math.abs(p.weight - p.target);
  const weeks = p.goal === 'mantener' || !p.rate ? 0 : Math.ceil(diff / p.rate);
  const end = new Date();
  end.setDate(end.getDate() + weeks * 7);

  return {
    bmr: Math.round(base),
    factor,
    level: LEVEL_NAMES[factor],
    tdee: Math.round(tdee),
    adjust: Math.round(p.goal === 'mantener' ? 0 : daily),
    learned: Math.round(p.tdeeAdjust || 0),
    kcal,
    floored,
    protein,
    fat,
    carbs,
    weeks,
    endDate: end.toISOString().slice(0, 10),
  };
}

// Formato español
export function fmt(n, d = 0) {
  // El formato español no pone punto en números de 4 cifras; aquí sí (2.150)
  const [int, dec] = Math.abs(Number(n)).toFixed(d).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (Number(n) < 0 ? '−' : '') + grouped + (dec ? ',' + dec : '');
}
export const fmtDate = (iso, opts = { day: 'numeric', month: 'short' }) =>
  new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-ES', opts).replace('.', '');
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
