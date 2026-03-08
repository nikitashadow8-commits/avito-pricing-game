import React, { useEffect, useMemo, useState } from "react";
import {
  Smartphone,
  Sofa,
  Microwave,
  Shirt,
  Bike,
  Dumbbell,
  Lamp,
  CookingPot,
  Watch,
  Headphones,
  Camera,
  Snowflake,
  Gamepad2,
  Flower2,
  Coffee,
  ChevronRight,
  RotateCcw,
  TimerReset,
  Trophy,
  CircleDollarSign,
  Sparkles,
  House,
  Cpu,
} from "lucide-react";

const ROUND_LIMIT = 5;
const CARD_TIME = 30;
const FEEDBACK_DELAY = 3200;

const formatPrice = (value: number) =>
  `${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ₽`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundToStep = (value: number, step: number) =>
  Math.round(value / step) * step;

const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getDeviation = (guess: number, market: number) =>
  Math.abs(guess - market) / Math.max(market, 1);

const getAccuracyLabel = (avgDeviation: number) => {
  if (avgDeviation <= 0.08) {
    return {
      title: "Вы эксперт по цене",
      subtitle:
        "Вы очень хорошо чувствуете рынок и замечаете, что реально влияет на стоимость.",
    };
  }
  if (avgDeviation <= 0.16) {
    return {
      title: "Вы почти попадаете в рынок",
      subtitle:
        "Хорошее чувство цены. Еще немного внимательнее к ключевым характеристикам — и будет совсем точно.",
    };
  }
  if (avgDeviation <= 0.28) {
    return {
      title: "Чувство рынка уже есть",
      subtitle:
        "Вы видите общий порядок цен, но иногда недооцениваете или переоцениваете важные детали товара.",
    };
  }
  return {
    title: "Есть куда прокачаться",
    subtitle:
      "Обратите внимание на ориентиры Авито по цене и на те характеристики, которые сильнее всего двигают стоимость.",
  };
};

const getRoundStatus = (deviation: number, timedOut = false) => {
  if (timedOut) {
    return {
      title: "В следующий раз повезет!",
      tone: "text-amber-700 bg-amber-50 border-amber-200",
    };
  }
  if (deviation <= 0.08) {
    return {
      title: "СУПЕР",
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    };
  }
  if (deviation <= 0.18) {
    return {
      title: "Почти!",
      tone: "text-sky-700 bg-sky-50 border-sky-200",
    };
  }
  return {
    title: "В следующий раз повезет!",
    tone: "text-rose-700 bg-rose-50 border-rose-200",
  };
};

type CategoryKey =
  | "smartphone"
  | "furniture"
  | "appliance"
  | "cookware"
  | "clothing"
  | "sport"
  | "decor"
  | "gadget"
  | "watch"
  | "camera"
  | "gaming"
  | "coffee"
  | "plant"
  | "cooling"
  | "bike";

type SessionCategory = "lifestyle" | "homeLiving" | "electronics";

type CaseItem = {
  id: number;
  category: CategoryKey;
  sessionCategory: SessionCategory;
  title: string;
  marketPrice: number;
  description: string;
  keyInsight: string;
  fields: Array<[string, string]>;
  slider: {
    min: number;
    max: number;
    step: number;
  };
  newPriceFactor: number;
};

type GameResult = {
  item: CaseItem;
  guess: number;
  deviation: number;
  timedOut: boolean;
};

const categoryVisuals: Record<
  CategoryKey,
  {
    icon: React.ComponentType<{
      size?: number;
      strokeWidth?: number;
      className?: string;
    }>;
    accent: string;
    accentSoft: string;
    tag: string;
  }
> = {
  smartphone: {
    icon: Smartphone,
    accent: "from-sky-500 via-blue-500 to-indigo-500",
    accentSoft: "from-sky-100 to-blue-50",
    tag: "Техника",
  },
  furniture: {
    icon: Sofa,
    accent: "from-amber-500 via-orange-500 to-rose-500",
    accentSoft: "from-amber-50 to-orange-50",
    tag: "Дом",
  },
  appliance: {
    icon: Microwave,
    accent: "from-cyan-500 via-teal-500 to-emerald-500",
    accentSoft: "from-cyan-50 to-emerald-50",
    tag: "Бытовая техника",
  },
  cookware: {
    icon: CookingPot,
    accent: "from-violet-500 via-fuchsia-500 to-pink-500",
    accentSoft: "from-violet-50 to-pink-50",
    tag: "Кухня",
  },
  clothing: {
    icon: Shirt,
    accent: "from-fuchsia-500 via-pink-500 to-rose-500",
    accentSoft: "from-fuchsia-50 to-rose-50",
    tag: "Одежда",
  },
  sport: {
    icon: Dumbbell,
    accent: "from-lime-500 via-green-500 to-emerald-500",
    accentSoft: "from-lime-50 to-emerald-50",
    tag: "Спорт",
  },
  decor: {
    icon: Lamp,
    accent: "from-yellow-400 via-amber-400 to-orange-400",
    accentSoft: "from-yellow-50 to-amber-50",
    tag: "Интерьер",
  },
  gadget: {
    icon: Headphones,
    accent: "from-indigo-500 via-violet-500 to-purple-500",
    accentSoft: "from-indigo-50 to-violet-50",
    tag: "Гаджеты",
  },
  watch: {
    icon: Watch,
    accent: "from-slate-500 via-zinc-500 to-neutral-600",
    accentSoft: "from-slate-50 to-zinc-100",
    tag: "Аксессуары",
  },
  camera: {
    icon: Camera,
    accent: "from-stone-500 via-zinc-600 to-slate-700",
    accentSoft: "from-stone-50 to-slate-100",
    tag: "Фото",
  },
  gaming: {
    icon: Gamepad2,
    accent: "from-purple-500 via-indigo-500 to-blue-500",
    accentSoft: "from-purple-50 to-blue-50",
    tag: "Игры",
  },
  coffee: {
    icon: Coffee,
    accent: "from-orange-500 via-amber-500 to-yellow-500",
    accentSoft: "from-orange-50 to-yellow-50",
    tag: "Кофе",
  },
  plant: {
    icon: Flower2,
    accent: "from-green-500 via-emerald-500 to-teal-500",
    accentSoft: "from-green-50 to-emerald-50",
    tag: "Дача",
  },
  cooling: {
    icon: Snowflake,
    accent: "from-cyan-500 via-sky-500 to-blue-500",
    accentSoft: "from-cyan-50 to-sky-50",
    tag: "Климат",
  },
  bike: {
    icon: Bike,
    accent: "from-lime-500 via-green-500 to-teal-500",
    accentSoft: "from-lime-50 to-teal-50",
    tag: "Транспорт",
  },
};

const sessionCategoryMeta: Record<
  SessionCategory,
  {
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  lifestyle: {
    title: "Лайвстайл",
    subtitle: "Одежда, аксессуары, спорт и вещи для повседневной жизни",
    icon: Sparkles,
  },
  homeLiving: {
    title: "Home & Living",
    subtitle: "Мебель, дом, кухня, интерьер и бытовые товары",
    icon: House,
  },
  electronics: {
    title: "Электроника",
    subtitle: "Смартфоны, гаджеты, техника, фото и консоли",
    icon: Cpu,
  },
};

const getNewPrice = (item: CaseItem) =>
  roundToStep(item.marketPrice * item.newPriceFactor, item.slider.step);

const getSliderBounds = (item: CaseItem) => {
  const min = item.slider.min;
  const max = Math.max(item.slider.min, getNewPrice(item));
  return { min, max };
};

const normalizeGuess = (item: CaseItem, value: number) => {
  const { min, max } = getSliderBounds(item);
  return clamp(roundToStep(value, item.slider.step), min, max);
};

const getSavings = (item: CaseItem) => {
  const newPrice = getNewPrice(item);
  const rubles = Math.max(newPrice - item.marketPrice, 0);
  const percent = Math.round((rubles / Math.max(newPrice, 1)) * 100);

  return {
    newPrice,
    rubles,
    percent,
  };
};

const getAffordableExamples = (
  budget: number,
  selectedCategory: SessionCategory | null,
  excludedIds: Set<number>,
  sourceCases: CaseItem[],
) => {
  const filtered = sourceCases.filter(
    (item) =>
      !excludedIds.has(item.id) &&
      (selectedCategory ? item.sessionCategory === selectedCategory : true),
  );

  const sorted = [...filtered].sort((a, b) => b.marketPrice - a.marketPrice);
  const picks: CaseItem[] = [];
  let remaining = budget;

  for (const item of sorted) {
    if (item.marketPrice <= remaining) {
      picks.push(item);
      remaining -= item.marketPrice;
    }
    if (picks.length === 2) break;
  }

  if (picks.length === 0 && sorted.length > 0) {
    const closest = [...sorted].sort(
      (a, b) => Math.abs(a.marketPrice - budget) - Math.abs(b.marketPrice - budget),
    )[0];
    return closest ? [closest] : [];
  }

  return picks;
};

const getInitialGuess = (item: CaseItem) => {
  const { min, max } = getSliderBounds(item);
  const range = max - min;
  const ratios = [0.22, 0.38, 0.64, 0.8];
  const ratio = ratios[item.id % ratios.length];
  return normalizeGuess(item, min + range * ratio);
};

const cases: CaseItem[] = [
  {
    id: 1,
    sessionCategory: "electronics",
    category: "smartphone",
    title: "iPhone 13, 128 ГБ",
    marketPrice: 47000,
    description: "Без ремонтов, Face ID работает, аккумулятор 88%, есть коробка.",
    keyInsight:
      "Для смартфонов сильнее всего цену двигают состояние аккумулятора и факт ремонтов.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Аккумулятор", "88%"],
      ["Память", "128 ГБ"],
      ["Комплект", "Коробка + кабель"],
    ],
    slider: { min: 20000, max: 90000, step: 1000 },
    newPriceFactor: 1.48,
  },
  {
    id: 2,
    sessionCategory: "electronics",
    category: "smartphone",
    title: "Samsung Galaxy S23, 256 ГБ",
    marketPrice: 52000,
    description:
      "Экран без выгорания, 2 eSIM, полный комплект, следов почти нет.",
    keyInsight:
      "У флагманов Samsung хорошо держат цену объем памяти и состояние экрана.",
    fields: [
      ["Состояние", "Отличное"],
      ["Экран", "Без дефектов"],
      ["Память", "256 ГБ"],
      ["Комплект", "Полный"],
    ],
    slider: { min: 20000, max: 100000, step: 1000 },
    newPriceFactor: 1.45,
  },
  {
    id: 3,
    sessionCategory: "electronics",
    category: "smartphone",
    title: "Xiaomi Redmi Note 12, 128 ГБ",
    marketPrice: 14500,
    description: "Покупался год назад, батарея живая, в чехле с первого дня.",
    keyInsight:
      "В среднем сегменте сильнее всего на цену влияет год покупки и общее состояние корпуса.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Аккумулятор", "Хороший"],
      ["Память", "128 ГБ"],
      ["Комплект", "Чехол + коробка"],
    ],
    slider: { min: 5000, max: 40000, step: 500 },
    newPriceFactor: 1.36,
  },
  {
    id: 4,
    sessionCategory: "homeLiving",
    category: "furniture",
    title: "Диван-кровать 3-местный",
    marketPrice: 26000,
    description: "Механизм раскладывания исправен, ткань без пятен, самовывоз.",
    keyInsight:
      "Для диванов сильнее всего цену меняют состояние обивки и исправность механизма.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Материал", "Рогожка"],
      ["Механизм", "Исправен"],
      ["Доставка", "Самовывоз"],
    ],
    slider: { min: 5000, max: 70000, step: 1000 },
    newPriceFactor: 1.85,
  },
  {
    id: 5,
    sessionCategory: "homeLiving",
    category: "furniture",
    title: "Обеденный стол из массива",
    marketPrice: 18000,
    description:
      "Размер 140×80, есть мелкие следы использования, стулья не входят.",
    keyInsight:
      "Для столов цену двигают материал и размер, а не только внешний вид на фото.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Материал", "Массив сосны"],
      ["Размер", "140×80"],
      ["Комплект", "Только стол"],
    ],
    slider: { min: 4000, max: 50000, step: 1000 },
    newPriceFactor: 1.72,
  },
  {
    id: 6,
    sessionCategory: "homeLiving",
    category: "furniture",
    title: "Компьютерное кресло ergonomic",
    marketPrice: 14500,
    description:
      "Газлифт работает, сетка целая, подлокотники регулируются.",
    keyInsight:
      "У кресел цена зависит от механизма качания, бренда и износа сиденья.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Механизм", "Топ-ган"],
      ["Материал", "Сетка + ткань"],
      ["Регулировки", "Подлокотники / поясница"],
    ],
    slider: { min: 3000, max: 40000, step: 500 },
    newPriceFactor: 1.9,
  },
  {
    id: 7,
    sessionCategory: "electronics",
    category: "appliance",
    title: "Микроволновка Samsung 23 л",
    marketPrice: 6800,
    description: "Работает тихо, внутри чистая, гриль отсутствует.",
    keyInsight:
      "У микроволновок цену сильнее всего меняют литраж, бренд и набор режимов.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Объем", "23 л"],
      ["Функции", "Базовые"],
      ["Мощность", "800 Вт"],
    ],
    slider: { min: 1000, max: 15000, step: 200 },
    newPriceFactor: 1.62,
  },
  {
    id: 8,
    sessionCategory: "electronics",
    category: "appliance",
    title: "Пылесос Dyson V8",
    marketPrice: 21000,
    description:
      "Аккумулятор заменен полгода назад, насадка для мебели в комплекте.",
    keyInsight:
      "Для вертикальных пылесосов ключевые факторы цены — аккумулятор и комплект насадок.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Тип", "Вертикальный"],
      ["Аккумулятор", "Заменен"],
      ["Комплект", "2 насадки"],
    ],
    slider: { min: 6000, max: 45000, step: 500 },
    newPriceFactor: 1.78,
  },
  {
    id: 9,
    sessionCategory: "electronics",
    category: "appliance",
    title: "Стиральная машина LG 6 кг",
    marketPrice: 17000,
    description:
      "Без протечек, работает тихо, есть режим быстрой стирки.",
    keyInsight:
      "Для крупной техники цену двигают возраст, бренд и общее техническое состояние.",
    fields: [
      ["Состояние", "Исправная"],
      ["Загрузка", "6 кг"],
      ["Инвертор", "Да"],
      ["Возраст", "4 года"],
    ],
    slider: { min: 5000, max: 45000, step: 1000 },
    newPriceFactor: 1.82,
  },
  {
    id: 10,
    sessionCategory: "homeLiving",
    category: "cookware",
    title: "Набор кастрюль Tefal, 6 предметов",
    marketPrice: 5200,
    description: "Покрытие целое, крышки без сколов, пользовались мало.",
    keyInsight:
      "У посуды на цену сильнее всего влияют бренд и состояние покрытия.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Материал", "Нержавеющая сталь"],
      ["Комплект", "6 предметов"],
      ["Подходит", "Индукция"],
    ],
    slider: { min: 1000, max: 12000, step: 200 },
    newPriceFactor: 1.7,
  },
  {
    id: 11,
    sessionCategory: "homeLiving",
    category: "cookware",
    title: "Сервиз на 6 персон, фарфор",
    marketPrice: 3800,
    description: "Без сколов, почти не использовался, есть супница.",
    keyInsight:
      "Для сервизов ключевые факторы — полнота набора и отсутствие сколов.",
    fields: [
      ["Состояние", "Отличное"],
      ["Материал", "Фарфор"],
      ["Комплект", "24 предмета"],
      ["Дефекты", "Нет"],
    ],
    slider: { min: 800, max: 10000, step: 100 },
    newPriceFactor: 1.95,
  },
  {
    id: 12,
    sessionCategory: "lifestyle",
    category: "clothing",
    title: "Пуховик Uniqlo Ultra Light Down",
    marketPrice: 6500,
    description: "Размер M, без пятен и потертостей, после химчистки.",
    keyInsight:
      "У одежды вторичного рынка цену сильнее всего меняют бренд, сезонность и состояние ткани.",
    fields: [
      ["Состояние", "Отличное"],
      ["Размер", "M"],
      ["Сезон", "Демисезон"],
      ["Уход", "После химчистки"],
    ],
    slider: { min: 1000, max: 18000, step: 200 },
    newPriceFactor: 1.9,
  },
  {
    id: 13,
    sessionCategory: "lifestyle",
    category: "clothing",
    title: "Кроссовки New Balance 574",
    marketPrice: 7200,
    description: "Размер 43, подошва живая, стельки оригинальные.",
    keyInsight:
      "У кроссовок заметнее всего на цену влияют износ подошвы и сохранность пары.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Размер", "43"],
      ["Материал", "Замша / текстиль"],
      ["Коробка", "Нет"],
    ],
    slider: { min: 1500, max: 18000, step: 200 },
    newPriceFactor: 2.1,
  },
  {
    id: 14,
    sessionCategory: "lifestyle",
    category: "clothing",
    title: "Пальто COS шерстяное",
    marketPrice: 9800,
    description: "Размер S, ткань без катышков, подкладка целая.",
    keyInsight:
      "В верхней одежде на цену сильнее всего влияют состав ткани и состояние подкладки.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Размер", "S"],
      ["Состав", "70% шерсть"],
      ["Сезон", "Осень / зима"],
    ],
    slider: { min: 2000, max: 25000, step: 500 },
    newPriceFactor: 2.05,
  },
  {
    id: 15,
    sessionCategory: "lifestyle",
    category: "sport",
    title: "Горный велосипед Trek Marlin 6",
    marketPrice: 58000,
    description: "Алюминиевая рама, гидравлика, пробег около двух сезонов.",
    keyInsight:
      "У велосипедов цену сильнее всего двигают уровень навески, материал рамы и состояние трансмиссии.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Рама", "Алюминий"],
      ["Тормоза", "Гидравлические"],
      ["Колеса", "29"],
    ],
    slider: { min: 20000, max: 120000, step: 1000 },
    newPriceFactor: 1.68,
  },
  {
    id: 16,
    sessionCategory: "lifestyle",
    category: "sport",
    title: "Беговая дорожка для дома",
    marketPrice: 24000,
    description: "Складная, полотно без перекосов, скорость до 14 км/ч.",
    keyInsight:
      "Для тренажеров важнее всего мотор, состояние полотна и складной механизм.",
    fields: [
      ["Состояние", "Исправная"],
      ["Тип", "Складная"],
      ["Мотор", "2 л.с."],
      ["Макс. скорость", "14 км/ч"],
    ],
    slider: { min: 8000, max: 65000, step: 1000 },
    newPriceFactor: 1.75,
  },
  {
    id: 17,
    sessionCategory: "lifestyle",
    category: "sport",
    title: "Набор гантелей разборных 2×20 кг",
    marketPrice: 5600,
    description: "Диски без сколов, грифы с замками, хранились дома.",
    keyInsight:
      "У силового инвентаря цену в основном двигают общий вес и материал дисков.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Вес", "40 кг"],
      ["Материал", "Чугун"],
      ["Комплект", "Грифы + замки"],
    ],
    slider: { min: 1500, max: 12000, step: 200 },
    newPriceFactor: 1.6,
  },
  {
    id: 18,
    sessionCategory: "homeLiving",
    category: "decor",
    title: "Напольная лампа IKEA",
    marketPrice: 3200,
    description: "Абажур целый, царапин почти нет, лампочка в комплекте.",
    keyInsight:
      "В декоре цена зависит от бренда, состояния и того, насколько модель массовая.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Материал", "Металл / ткань"],
      ["Высота", "150 см"],
      ["Комплект", "С лампочкой"],
    ],
    slider: { min: 700, max: 9000, step: 100 },
    newPriceFactor: 1.85,
  },
  {
    id: 19,
    sessionCategory: "electronics",
    category: "gadget",
    title: "AirPods Pro 2",
    marketPrice: 13500,
    description:
      "Оригинал, шумодав работает, кейс с небольшими потертостями.",
    keyInsight:
      "У наушников основная цена сидит в оригинальности, поколении и состоянии кейса / батареи.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Шумодав", "Работает"],
      ["Кейс", "Есть потертости"],
      ["Комплект", "Кабель + амбушюры"],
    ],
    slider: { min: 4000, max: 25000, step: 500 },
    newPriceFactor: 1.58,
  },
  {
    id: 20,
    sessionCategory: "lifestyle",
    category: "watch",
    title: "Apple Watch SE 44 мм",
    marketPrice: 15500,
    description:
      "Аккумулятор 91%, ремешок новый, экран без глубоких царапин.",
    keyInsight:
      "У смарт-часов цену сильнее всего двигают поколение устройства и остаток батареи.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Размер", "44 мм"],
      ["Аккумулятор", "91%"],
      ["Ремешок", "Новый"],
    ],
    slider: { min: 5000, max: 30000, step: 500 },
    newPriceFactor: 1.65,
  },
  {
    id: 21,
    sessionCategory: "electronics",
    category: "camera",
    title: "Canon EOS 200D + 18-55",
    marketPrice: 33000,
    description:
      "Пробег около 18 тысяч кадров, матрица чистая, ремень и зарядка есть.",
    keyInsight:
      "У камер сильнее всего на цену влияют пробег затвора и объектив в комплекте.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Пробег", "18 тыс. кадров"],
      ["Комплект", "Китовый объектив"],
      ["Матрица", "Чистая"],
    ],
    slider: { min: 12000, max: 70000, step: 1000 },
    newPriceFactor: 1.7,
  },
  {
    id: 22,
    sessionCategory: "homeLiving",
    category: "cooling",
    title: "Мобильный кондиционер Electrolux",
    marketPrice: 23000,
    description: "Охлаждает до 20 м², шланг и пульт в комплекте.",
    keyInsight:
      "У климатической техники цену сильнее всего двигают мощность и сезонность спроса.",
    fields: [
      ["Состояние", "Исправный"],
      ["Мощность", "2.6 кВт"],
      ["Площадь", "До 20 м²"],
      ["Комплект", "Шланг + пульт"],
    ],
    slider: { min: 8000, max: 45000, step: 1000 },
    newPriceFactor: 1.72,
  },
  {
    id: 23,
    sessionCategory: "electronics",
    category: "gaming",
    title: "PlayStation 5 Slim",
    marketPrice: 43000,
    description: "1 геймпад, коробка есть, без аккаунтов и подписок.",
    keyInsight:
      "У консолей цену сильнее всего определяют ревизия, состояние и комплект с геймпадами.",
    fields: [
      ["Состояние", "Отличное"],
      ["Ревизия", "Slim"],
      ["Комплект", "1 геймпад"],
      ["Память", "825 ГБ"],
    ],
    slider: { min: 20000, max: 70000, step: 1000 },
    newPriceFactor: 1.38,
  },
  {
    id: 24,
    sessionCategory: "homeLiving",
    category: "coffee",
    title: "Кофемашина DeLonghi Magnifica",
    marketPrice: 22000,
    description:
      "После обслуживания, капучинатор работает, есть накипь на поддоне.",
    keyInsight:
      "Для кофемашин сильнее всего на цену влияют пробег, обслуживание и исправность капучинатора.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Тип", "Автоматическая"],
      ["Обслуживание", "Сделано"],
      ["Капучинатор", "Работает"],
    ],
    slider: { min: 8000, max: 50000, step: 1000 },
    newPriceFactor: 1.92,
  },
  {
    id: 25,
    sessionCategory: "homeLiving",
    category: "plant",
    title: "Газонокосилка электрическая Bosch",
    marketPrice: 9200,
    description: "Ширина скашивания 34 см, нож меняли в прошлом сезоне.",
    keyInsight:
      "У садовой техники цену двигают бренд, мощность и состояние ножа / мотора.",
    fields: [
      ["Состояние", "Исправная"],
      ["Тип", "Электрическая"],
      ["Мощность", "1300 Вт"],
      ["Нож", "Меняли"],
    ],
    slider: { min: 2500, max: 20000, step: 500 },
    newPriceFactor: 1.78,
  },
  {
    id: 26,
    sessionCategory: "electronics",
    category: "bike",
    title: "Электросамокат Ninebot G30",
    marketPrice: 28500,
    description: "Пробег 1400 км, батарея держит нормально, есть зарядка.",
    keyInsight:
      "У самокатов цену сильнее всего двигают пробег, батарея и модель мотора.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Пробег", "1400 км"],
      ["Аккумулятор", "Держит нормально"],
      ["Комплект", "Зарядка"],
    ],
    slider: { min: 10000, max: 60000, step: 1000 },
    newPriceFactor: 1.62,
  },
  {
    id: 27,
    sessionCategory: "homeLiving",
    category: "decor",
    title: "Ковер шерстяной 160×230",
    marketPrice: 7600,
    description: "После химчистки, без сильного износа по краям.",
    keyInsight:
      "У ковров цену больше всего двигают материал, размер и состояние ворса.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Материал", "Шерсть"],
      ["Размер", "160×230"],
      ["Уход", "После химчистки"],
    ],
    slider: { min: 1500, max: 18000, step: 200 },
    newPriceFactor: 1.88,
  },
  {
    id: 28,
    sessionCategory: "electronics",
    category: "gadget",
    title: "Робот-пылесос Xiaomi S10",
    marketPrice: 13800,
    description: "База есть, щетки новые, аккумулятор родной.",
    keyInsight:
      "У роботов-пылесосов цену сильнее всего меняют состояние аккумулятора и наличие базы.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["База", "Есть"],
      ["Щетки", "Новые"],
      ["Аккумулятор", "Родной"],
    ],
    slider: { min: 5000, max: 30000, step: 500 },
    newPriceFactor: 1.7,
  },
  {
    id: 29,
    sessionCategory: "homeLiving",
    category: "appliance",
    title: "Увлажнитель воздуха Xiaomi",
    marketPrice: 4200,
    description: "Работает тихо, есть коробка, фильтр менялся недавно.",
    keyInsight:
      "У небольших бытовых устройств цену сильнее всего держат бренд и состояние расходников.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Объем", "4.5 л"],
      ["Фильтр", "Меняли недавно"],
      ["Комплект", "Коробка"],
    ],
    slider: { min: 1000, max: 9000, step: 100 },
    newPriceFactor: 1.64,
  },
  {
    id: 30,
    sessionCategory: "homeLiving",
    category: "cookware",
    title: "Кофейный набор Villeroy & Boch",
    marketPrice: 4700,
    description: "6 чашек, 6 блюдец, без сколов, рисунок не стерт.",
    keyInsight:
      "У брендовой посуды цену сильнее всего двигают комплектность и сохранность рисунка.",
    fields: [
      ["Состояние", "Отличное"],
      ["Комплект", "12 предметов"],
      ["Материал", "Фарфор"],
      ["Дефекты", "Нет"],
    ],
    slider: { min: 1000, max: 10000, step: 100 },
    newPriceFactor: 2.1,
  },
  {
    id: 31,
    sessionCategory: "lifestyle",
    category: "clothing",
    title: "Джинсовая куртка Levi's",
    marketPrice: 7800,
    description: "Размер L, без пятен, есть легкие следы носки на манжетах.",
    keyInsight:
      "У повседневной верхней одежды на цену влияют бренд, состояние ткани и общий вид вещи.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Размер", "L"],
      ["Материал", "Деним"],
      ["Дефекты", "Легкий износ манжет"],
    ],
    slider: { min: 2000, max: 18000, step: 200 },
    newPriceFactor: 1.95,
  },
  {
    id: 32,
    sessionCategory: "lifestyle",
    category: "clothing",
    title: "Кроссовки Adidas Samba",
    marketPrice: 9500,
    description: "Размер 42, коробка есть, кожа без трещин, подошва живая.",
    keyInsight:
      "У кроссовок ликвидных моделей цену держат состояние пары и сохранность подошвы.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Размер", "42"],
      ["Материал", "Кожа"],
      ["Коробка", "Есть"],
    ],
    slider: { min: 2500, max: 22000, step: 500 },
    newPriceFactor: 1.9,
  },
  {
    id: 33,
    sessionCategory: "lifestyle",
    category: "sport",
    title: "Турник настенный 3-в-1",
    marketPrice: 4300,
    description: "Крепеж в комплекте, краска без сколов, использовался дома.",
    keyInsight:
      "У домашнего спортивного инвентаря цену держат состояние металла и комплект крепежа.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Тип", "Настенный"],
      ["Комплект", "Крепеж"],
      ["Материал", "Сталь"],
    ],
    slider: { min: 1000, max: 9000, step: 100 },
    newPriceFactor: 1.8,
  },
  {
    id: 34,
    sessionCategory: "lifestyle",
    category: "watch",
    title: "Очки Ray-Ban Clubmaster",
    marketPrice: 8900,
    description: "Оригинал, линзы без царапин, футляр в комплекте.",
    keyInsight:
      "У аксессуаров цену сильнее всего держат бренд, состояние линз и комплектность.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Линзы", "Без царапин"],
      ["Комплект", "Футляр"],
      ["Оригинал", "Да"],
    ],
    slider: { min: 2500, max: 18000, step: 200 },
    newPriceFactor: 2.15,
  },
  {
    id: 35,
    sessionCategory: "lifestyle",
    category: "sport",
    title: "Велошлем Giro MIPS",
    marketPrice: 6200,
    description: "Размер M, без падений, ремешки целые, есть коробка.",
    keyInsight:
      "У спортивной защиты цену двигают бренд, состояние корпуса и отсутствие сильного износа.",
    fields: [
      ["Состояние", "Отличное"],
      ["Размер", "M"],
      ["Система", "MIPS"],
      ["Комплект", "Коробка"],
    ],
    slider: { min: 1500, max: 14000, step: 200 },
    newPriceFactor: 1.85,
  },
  {
    id: 36,
    sessionCategory: "homeLiving",
    category: "furniture",
    title: "Комод IKEA MALM, 4 ящика",
    marketPrice: 12500,
    description: "Все направляющие целые, фасады без сколов, самовывоз.",
    keyInsight:
      "У мебели важны состояние фасадов, фурнитура и удобство перевозки.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Материал", "ЛДСП"],
      ["Ящики", "4"],
      ["Доставка", "Самовывоз"],
    ],
    slider: { min: 3000, max: 30000, step: 500 },
    newPriceFactor: 1.75,
  },
  {
    id: 37,
    sessionCategory: "homeLiving",
    category: "decor",
    title: "Зеркало в черной раме 180 см",
    marketPrice: 6900,
    description: "Без сколов, крепления в комплекте, стояло в спальне.",
    keyInsight:
      "У декора цену больше всего держат состояние поверхности и универсальность вещи.",
    fields: [
      ["Состояние", "Отличное"],
      ["Высота", "180 см"],
      ["Рама", "Металл"],
      ["Комплект", "Крепления"],
    ],
    slider: { min: 1500, max: 16000, step: 200 },
    newPriceFactor: 1.95,
  },
  {
    id: 38,
    sessionCategory: "homeLiving",
    category: "appliance",
    title: "Аэрогриль Philips Essential",
    marketPrice: 9800,
    description: "Чаша без сильных царапин, работает исправно, есть коробка.",
    keyInsight:
      "У мелкой бытовой техники цену держат бренд, состояние чаши и общий внешний вид.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Тип", "Аэрогриль"],
      ["Чаша", "Без сильного износа"],
      ["Комплект", "Коробка"],
    ],
    slider: { min: 2500, max: 22000, step: 500 },
    newPriceFactor: 1.82,
  },
  {
    id: 39,
    sessionCategory: "homeLiving",
    category: "cookware",
    title: "Сковорода Staub 28 см",
    marketPrice: 7400,
    description: "Эмаль целая, ручка без сколов, пользовались редко.",
    keyInsight:
      "У посуды премиум-брендов цену двигают состояние покрытия и узнаваемость марки.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Диаметр", "28 см"],
      ["Материал", "Чугун"],
      ["Покрытие", "Эмаль"],
    ],
    slider: { min: 2000, max: 16000, step: 200 },
    newPriceFactor: 2.2,
  },
  {
    id: 40,
    sessionCategory: "homeLiving",
    category: "coffee",
    title: "Капельная кофеварка Melitta",
    marketPrice: 5600,
    description: "Колба целая, работает исправно, фильтр в комплекте.",
    keyInsight:
      "У кофейной техники цену больше всего держат состояние колбы и исправность нагрева.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Тип", "Капельная"],
      ["Колба", "Целая"],
      ["Комплект", "Фильтр"],
    ],
    slider: { min: 1500, max: 12000, step: 200 },
    newPriceFactor: 1.9,
  },
  {
    id: 41,
    sessionCategory: "electronics",
    category: "gadget",
    title: "iPad 9, 64 ГБ, Wi‑Fi",
    marketPrice: 24500,
    description: "Экран без трещин, Touch ID работает, есть кабель.",
    keyInsight:
      "У планшетов цену сильнее всего держат поколение устройства и состояние экрана.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Память", "64 ГБ"],
      ["Биометрия", "Touch ID"],
      ["Комплект", "Кабель"],
    ],
    slider: { min: 8000, max: 50000, step: 500 },
    newPriceFactor: 1.6,
  },
  {
    id: 42,
    sessionCategory: "electronics",
    category: "gadget",
    title: "Колонка JBL Charge 5",
    marketPrice: 9200,
    description: "Заряд держит хорошо, царапин мало, кабель в комплекте.",
    keyInsight:
      "У портативных колонок цену держат состояние аккумулятора и внешний вид корпуса.",
    fields: [
      ["Состояние", "Очень хорошее"],
      ["Аккумулятор", "Хороший"],
      ["Комплект", "Кабель"],
      ["Влагозащита", "Да"],
    ],
    slider: { min: 2500, max: 18000, step: 200 },
    newPriceFactor: 1.72,
  },
  {
    id: 43,
    sessionCategory: "electronics",
    category: "gaming",
    title: "Nintendo Switch OLED",
    marketPrice: 23500,
    description: "Оригинальная док-станция, джойконы без дрифта, коробка есть.",
    keyInsight:
      "У портативных консолей цену сильнее всего держат комплект и состояние контроллеров.",
    fields: [
      ["Состояние", "Отличное"],
      ["Модель", "OLED"],
      ["Джойконы", "Без дрифта"],
      ["Комплект", "Полный"],
    ],
    slider: { min: 10000, max: 40000, step: 500 },
    newPriceFactor: 1.55,
  },
  {
    id: 44,
    sessionCategory: "electronics",
    category: "camera",
    title: "GoPro HERO10 Black",
    marketPrice: 19500,
    description: "Экран без трещин, аккумулятор родной, крепление в комплекте.",
    keyInsight:
      "У экшн-камер цену двигают поколение, состояние линзы и набор аксессуаров.",
    fields: [
      ["Состояние", "Хорошее"],
      ["Аккумулятор", "Родной"],
      ["Линза", "Без дефектов"],
      ["Комплект", "Крепление"],
    ],
    slider: { min: 7000, max: 35000, step: 500 },
    newPriceFactor: 1.68,
  },
  {
    id: 45,
    sessionCategory: "electronics",
    category: "smartphone",
    title: "Google Pixel 8, 128 ГБ",
    marketPrice: 39500,
    description: "Экран без царапин, батарея держит хорошо, полный комплект.",
    keyInsight:
      "У смартфонов Google цену сильнее всего держат поколение модели и состояние дисплея.",
    fields: [
      ["Состояние", "Отличное"],
      ["Память", "128 ГБ"],
      ["Экран", "Без дефектов"],
      ["Комплект", "Полный"],
    ],
    slider: { min: 15000, max: 70000, step: 1000 },
    newPriceFactor: 1.48,
  },
];

const getRichDescription = (item: CaseItem) => item.description;

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_24%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_26%),#f8fafc] px-3 py-3">
      <div className="mx-auto w-full max-w-[393px]">{children}</div>
    </div>
  );
}

function ListingVisual({ item }: { item: CaseItem }) {
  const visual = categoryVisuals[item.category];
  const Icon = visual.icon;

  return (
    <div className="grid grid-cols-[1.18fr_0.82fr] gap-2">
      <div
        className={`relative overflow-hidden rounded-[22px] bg-gradient-to-br ${visual.accent} p-2.5 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_30%)]" />
        <div className="relative flex h-[136px] flex-col justify-between">
          <div className="inline-flex w-fit items-center rounded-full bg-white/18 px-2 py-1 text-[10px] font-medium backdrop-blur-sm">
            {visual.tag}
          </div>
          <div className="flex items-center justify-center">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-white/14 shadow-inner shadow-white/10 backdrop-blur-sm">
              <Icon size={32} strokeWidth={1.75} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-black/10 px-2.5 py-2 backdrop-blur-sm">
            <div>
              <div className="text-[9px] uppercase tracking-[0.16em] text-white/65">
                Фото 1
              </div>
              <div className="mt-1 text-[11px] font-semibold">Главный ракурс</div>
            </div>
            <div className="rounded-full bg-white/15 px-2 py-1 text-[10px]">
              1/3
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-rows-2 gap-2">
        {["Фото 2", "Фото 3"].map((label, index) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br ${visual.accentSoft} p-1.5 shadow-[0_10px_20px_rgba(15,23,42,0.06)]`}
          >
            <div
              className={`absolute inset-0 ${
                index === 0
                  ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_36%)]"
                  : "bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.9),transparent_38%)]"
              }`}
            />
            <div className="relative flex h-full flex-col justify-between rounded-[14px] border border-white/70 bg-white/55 p-2 backdrop-blur-sm">
              <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">
                {label}
              </div>
              <div className="flex items-center justify-center py-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Icon size={18} className="text-slate-700" strokeWidth={1.8} />
                </div>
              </div>
              <div className="text-[11px] font-medium text-slate-700">
                {index === 0 ? "Деталь товара" : "Доп. снимок"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuessSlider({
  item,
  value,
  onChange,
  onSubmit,
}: {
  item: CaseItem;
  value: number;
  onChange: (next: number) => void;
  onSubmit: () => void;
}) {
  const { min, max } = getSliderBounds(item);
  const safeValue = normalizeGuess(item, value);
  const range = Math.max(max - min, item.slider.step);
  const progress = clamp(((safeValue - min) / range) * 100, 0, 100);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">Ваша оценка б/у</div>
        <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-sm font-medium text-slate-700 shadow-sm">
          {formatPrice(safeValue)}
        </span>
      </div>

      <div className="mt-3 -mx-1 px-1">
        <div className="relative h-10">
          <div className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-slate-200" />
          <div
            className="absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={item.slider.step}
            value={safeValue}
            onChange={(e) => onChange(normalizeGuess(item, Number(e.target.value)))}
            className="absolute inset-0 z-10 h-10 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-13px] [&::-webkit-slider-thumb]:h-9 [&::-webkit-slider-thumb]:w-9 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:shadow-[0_8px_20px_rgba(15,23,42,0.22)] [&::-moz-range-track]:h-3 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-9 [&::-moz-range-thumb]:w-9 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-900"
          />
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{formatPrice(min)}</span>
        <span>{formatPrice(max)}</span>
      </div>

      <button
        onClick={onSubmit}
        className="mt-3 flex w-full items-center justify-center rounded-[20px] bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
      >
        Зафиксировать цену
      </button>
    </div>
  );
}

function StartScreen({
  onStart,
  selectedCategory,
  onSelectCategory,
}: {
  onStart: () => void;
  selectedCategory: SessionCategory | null;
  onSelectCategory: (next: SessionCategory) => void;
}) {
  return (
    <ScreenShell>
      <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500 p-5 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium backdrop-blur-sm">
            <CircleDollarSign size={13} />
            Авито-inspired prototype
          </div>
          <h1 className="mt-3 text-[28px] font-bold leading-tight">Чувство цены</h1>
          <p className="mt-2 text-sm leading-6 text-white/88">
            Смотри на цену нового товара и оценивай, сколько разумно стоит его б/у версия.
          </p>
        </div>

        <div className="space-y-3 p-4 text-slate-700">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-sm font-semibold text-slate-900">Выберите категорию</div>
            <div className="mt-3 space-y-2.5">
              {(
                Object.entries(sessionCategoryMeta) as Array<[
                  SessionCategory,
                  (typeof sessionCategoryMeta)[SessionCategory],
                ]>
              ).map(([key, meta]) => {
                const Icon = meta.icon;
                const isSelected = selectedCategory === key;
                return (
                  <button
                    key={key}
                    onClick={() => onSelectCategory(key)}
                    className={`w-full rounded-3xl border px-3.5 py-3.5 text-left transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-2xl p-2 ${
                          isSelected ? "bg-white/12" : "bg-slate-100"
                        }`}
                      >
                        <Icon
                          size={16}
                          className={isSelected ? "text-white" : "text-slate-700"}
                        />
                      </div>
                      <div>
                        <div className="font-semibold">{meta.title}</div>
                        <div
                          className={`mt-1 text-xs leading-5 ${
                            isSelected ? "text-white/75" : "text-slate-500"
                          }`}
                        >
                          {meta.subtitle}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xl font-bold text-slate-900">5</div>
              <div className="mt-1 text-slate-500">карточек</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xl font-bold text-slate-900">30с</div>
              <div className="mt-1 text-slate-500">на кейс</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xl font-bold text-slate-900">+2</div>
              <div className="mt-1 text-slate-500">выгоды</div>
            </div>
          </div>

          <button
            onClick={onStart}
            disabled={!selectedCategory}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            Начать игру
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </ScreenShell>
  );
}

function FeedbackScreen({
  result,
  round,
  total,
}: {
  result: GameResult;
  round: number;
  total: number;
}) {
  const status = getRoundStatus(result.deviation, result.timedOut);
  const savings = getSavings(result.item);
  const deviationPercent = Math.round(result.deviation * 100);
  const guessDelta = Math.abs(result.guess - result.item.marketPrice);
  const isAccurate = !result.timedOut && result.deviation <= 0.18;
  const priceTone = result.timedOut
    ? "text-slate-900"
    : isAccurate
      ? "text-emerald-700"
      : "text-rose-700";
  const deviationTone = result.timedOut
    ? "bg-amber-500"
    : result.deviation <= 0.08
      ? "bg-emerald-500"
      : result.deviation <= 0.18
        ? "bg-sky-500"
        : "bg-rose-500";
  const marketDeltaLabel = result.timedOut
    ? "Показали рынок автоматически"
    : guessDelta === 0
      ? "Точно в рынок"
      : result.guess > result.item.marketPrice
        ? `На ${formatPrice(guessDelta)} выше рынка`
        : `На ${formatPrice(guessDelta)} ниже рынка`;

  return (
    <ScreenShell>
      <div className="rounded-[30px] border border-white/70 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Карточка {round}/{total}
          </span>
          <span>Разбор</span>
        </div>

        <div className={`mt-3 rounded-3xl border px-4 py-3 ${status.tone}`}>
          <div className="text-[24px] font-extrabold tracking-tight">{status.title}</div>
          <div className="mt-1 text-xs leading-5 opacity-80">
            {result.timedOut
              ? "Не успели ответить — показываем рыночную цену и выгоду покупки б/у."
              : "Сначала сравните свою цену с рынком, а потом посмотрите, сколько можно было сэкономить."}
          </div>
        </div>

        <h2 className="mt-3 text-xl font-bold leading-tight text-slate-900">
          {result.item.title}
        </h2>

        <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">Ваша оценка</div>
              <div className={`mt-1 text-xl font-bold ${priceTone}`}>
                {result.timedOut ? "—" : formatPrice(result.guess)}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">Рыночная цена б/у</div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                {formatPrice(result.item.marketPrice)}
              </div>
            </div>
          </div>

          <div className="mt-2.5 rounded-2xl bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-900">{marketDeltaLabel}</span>
              <span className="font-semibold text-slate-500">
                {result.timedOut ? "—" : `${deviationPercent}%`}
              </span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-slate-100">
              <div
                className={`h-2.5 rounded-full ${deviationTone}`}
                style={{ width: `${clamp(deviationPercent, 2, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-3xl border border-emerald-100 bg-emerald-50/90 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Выгода покупки б/у
          </div>
          <div className="mt-2 text-[30px] font-bold leading-none tracking-tight text-emerald-900">
            {formatPrice(savings.rubles)}
          </div>
          <div className="mt-2 text-sm leading-6 text-emerald-900">
            Выгоднее, чем новое за <span className="font-semibold">{formatPrice(savings.newPrice)}</span>
          </div>
          <div className="mt-1 text-xs text-emerald-800">
            Около {savings.percent}% экономии при покупке на Авито
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

function ResultScreen({
  results,
  onRestart,
  selectedCategory,
}: {
  results: GameResult[];
  onRestart: () => void;
  selectedCategory: SessionCategory | null;
}) {
  const answered = results.filter((item) => !item.timedOut);
  const avgDeviation =
    results.reduce((sum, item) => sum + item.deviation, 0) /
    Math.max(results.length, 1);
  const totalSavings = results.reduce(
    (sum, item) => sum + getSavings(item.item).rubles,
    0,
  );
  const playedIds = new Set(results.map((item) => item.item.id));
  const affordableExamples = getAffordableExamples(
    totalSavings,
    selectedCategory,
    playedIds,
    cases,
  );
  const best =
    answered.length > 0
      ? [...answered].sort((a, b) => a.deviation - b.deviation)[0]
      : null;
  const worst =
    results.length > 0
      ? [...results].sort((a, b) => b.deviation - a.deviation)[0]
      : null;
  const label = getAccuracyLabel(avgDeviation);

  return (
    <ScreenShell>
      <div className="rounded-[30px] border border-white/70 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <Trophy size={14} />
          Итоги сессии
        </div>

        <h2 className="mt-3 text-[26px] font-bold tracking-tight text-slate-900">
          {label.title}
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {label.subtitle} Если видишь цену нового и быстро понимаешь честную
          цену б/у, на Авито проще находить выгодные покупки.
        </p>
        {selectedCategory && (
          <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            Категория: {sessionCategoryMeta[selectedCategory].title}
          </div>
        )}

        <div className="mt-4 grid gap-2.5">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Суммарная выгода
            </div>
            <div className="mt-1.5 text-[28px] font-bold tracking-tight text-emerald-900">
              {formatPrice(totalSavings)}
            </div>
            <div className="mt-1 text-xs text-emerald-800">
              вы сэкономили, если бы купили это все на Авито
            </div>
            {affordableExamples.length > 0 && (
              <div className="mt-3 rounded-2xl bg-white/85 p-3">
                <div className="text-xs font-medium text-slate-900">
                  На эти деньги можно купить
                </div>
                <div className="mt-2 space-y-1.5">
                  {affordableExamples.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-xs shadow-sm"
                    >
                      <div className="min-w-0 pr-3 font-medium text-slate-900">
                        {item.title}
                      </div>
                      <div className="whitespace-nowrap text-slate-600">
                        {formatPrice(item.marketPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-3xl bg-slate-900 p-3 text-white">
              <div className="text-xs text-white/70">Среднее отклонение</div>
              <div className="mt-1 text-2xl font-bold">
                {Math.round(avgDeviation * 100)}%
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Отвечено вовремя</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {answered.length}/{results.length}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-3">
            <div className="text-xs text-emerald-700">Лучшая попытка</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {best ? best.item.title : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {best
                ? `${Math.round(best.deviation * 100)}% отклонения`
                : "Нет ответа"}
            </div>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-rose-50/70 p-3">
            <div className="text-xs text-rose-700">Самый сложный кейс</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {worst ? worst.item.title : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {worst
                ? `${Math.round(worst.deviation * 100)}% отклонения`
                : "Нет данных"}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">
            Все 5 карточек
          </div>
          <div className="space-y-1.5">
            {results.map((result, index) => (
              <div
                key={result.item.id}
                className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-xs shadow-sm"
              >
                <div className="min-w-0 pr-3">
                  <div className="truncate font-medium text-slate-900">
                    {index + 1}. {result.item.title}
                  </div>
                  <div className="text-slate-500">
                    Б/у: {formatPrice(result.item.marketPrice)}
                  </div>
                </div>
                <div className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  {result.timedOut
                    ? "Тайм-аут"
                    : `${Math.round(result.deviation * 100)}%`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onRestart}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <RotateCcw size={16} />
          Сыграть еще раз
        </button>
      </div>
    </ScreenShell>
  );
}

function GameScreen({
  deck,
  roundIndex,
  timeLeft,
  guess,
  onGuessChange,
  onSubmit,
}: {
  deck: CaseItem[];
  roundIndex: number;
  timeLeft: number;
  guess: number;
  onGuessChange: (next: number) => void;
  onSubmit: () => void;
}) {
  const item = deck[roundIndex];

  if (!item) return null;

  const savings = getSavings(item);

  return (
    <ScreenShell>
      <div className="rounded-[30px] border border-white/70 bg-white/90 p-3.5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            <span className="text-slate-500">Серия</span>
            <span>{roundIndex + 1} / {ROUND_LIMIT}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            <TimerReset size={12} className="text-slate-400" />
            <span className={timeLeft <= 7 ? "text-rose-500" : "text-slate-700"}>
              {timeLeft}с
            </span>
          </div>
        </div>

        <ListingVisual item={item} />

        <div className="mt-3 rounded-[24px] border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="min-w-0">
            <div className="truncate text-[22px] font-bold leading-tight tracking-tight text-slate-900">
              {item.title}
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {item.fields.map(([label, fieldValue]) => (
                <div key={label} className="min-w-0">
                  <div className="text-[11px] leading-4 text-slate-400">{label}</div>
                  <div className="mt-0.5 truncate text-xs font-semibold leading-4 text-slate-800">
                    {fieldValue}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
            <div className="mb-1 font-semibold text-slate-900">Описание</div>
            {getRichDescription(item)}
          </div>
        </div>

        <div className="mt-3 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <div className="rounded-2xl bg-slate-900 px-4 py-2.5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/65">
                Цена нового
              </div>
              <div className="whitespace-nowrap text-2xl font-bold tracking-tight">
                {formatPrice(savings.newPrice)}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-white px-3 py-3 shadow-sm">
            <GuessSlider
              item={item}
              value={guess}
              onChange={onGuessChange}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

function runSelfChecks() {
  console.assert(
    formatPrice(47000) === "47 000 ₽" || formatPrice(47000) === "47 000 ₽",
    "formatPrice should format rubles",
  );
  console.assert(clamp(10, 0, 5) === 5, "clamp upper bound failed");
  console.assert(clamp(-3, 0, 5) === 0, "clamp lower bound failed");
  console.assert(roundToStep(14550, 500) === 14500, "roundToStep failed");
  console.assert(getDeviation(100, 100) === 0, "getDeviation exact match failed");
  console.assert(
    Math.round(getDeviation(120, 100) * 100) === 20,
    "getDeviation percentage failed",
  );
  console.assert(cases.length === 45, "Expected 45 cases in prototype data");
  console.assert(
    cases.filter((item) => item.sessionCategory === "electronics").length >= 12,
    "Need at least 12 electronics items",
  );
  console.assert(
    cases.filter((item) => item.sessionCategory === "homeLiving").length >= 12,
    "Need at least 12 homeLiving items",
  );
  console.assert(
    cases.filter((item) => item.sessionCategory === "lifestyle").length >= 12,
    "Need at least 12 lifestyle items",
  );
  console.assert(
    getNewPrice(cases[0]) > cases[0].marketPrice,
    "New price hint must be above market price",
  );
  console.assert(
    getSliderBounds(cases[0]).max === getNewPrice(cases[0]),
    "Slider max must match new price",
  );
  console.assert(
    normalizeGuess(cases[0], 999999) === getSliderBounds(cases[0]).max,
    "normalizeGuess should clamp upper bound",
  );
  console.assert(
    getInitialGuess(cases[0]) !==
      normalizeGuess(
        cases[0],
        (getSliderBounds(cases[0]).min + getSliderBounds(cases[0]).max) / 2,
      ),
    "Initial guess should not default to exact midpoint",
  );
  console.assert(
    getAffordableExamples(30000, "electronics", new Set([1, 2, 3, 7, 8]), cases).every(
      (item) => !new Set([1, 2, 3, 7, 8]).has(item.id),
    ),
    "Affordable examples must exclude played items",
  );
}

runSelfChecks();

export default function AvitoPriceSensePrototype() {
  const [phase, setPhase] =
    useState<"start" | "playing" | "feedback" | "result">("start");
  const [deck, setDeck] = useState<CaseItem[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [guess, setGuess] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CARD_TIME);
  const [results, setResults] = useState<GameResult[]>([]);
  const [feedbackResult, setFeedbackResult] = useState<GameResult | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<SessionCategory | null>(null);

  const currentItem = deck[roundIndex];

  const availableDeck = useMemo(() => {
    if (!selectedCategory) return [] as CaseItem[];
    return cases.filter((item) => item.sessionCategory === selectedCategory);
  }, [selectedCategory]);

  const startGame = () => {
    if (!selectedCategory) return;
    const selectedDeck = shuffle(availableDeck).slice(0, ROUND_LIMIT);
    const firstItem = selectedDeck[0];

    setDeck(selectedDeck);
    setRoundIndex(0);
    setResults([]);
    setFeedbackResult(null);
    setTimeLeft(CARD_TIME);
    setGuess(firstItem ? getInitialGuess(firstItem) : 0);
    setPhase("playing");
  };

  const goToNextRound = () => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= ROUND_LIMIT || nextIndex >= deck.length) {
      setPhase("result");
      return;
    }

    const nextItem = deck[nextIndex];
    setRoundIndex(nextIndex);
    setTimeLeft(CARD_TIME);
    setGuess(getInitialGuess(nextItem));
    setPhase("playing");
  };

  const pushResult = (
    item: CaseItem,
    selectedGuess: number,
    timedOut = false,
  ) => {
    const fallbackGuess = getInitialGuess(item);
    const finalGuess = timedOut
      ? fallbackGuess
      : normalizeGuess(item, selectedGuess);
    const deviation = timedOut ? 1 : getDeviation(finalGuess, item.marketPrice);

    const result: GameResult = {
      item,
      guess: finalGuess,
      deviation,
      timedOut,
    };

    setResults((prev) => [...prev, result]);
    setFeedbackResult(result);
    setPhase("feedback");
  };

  const submitGuess = () => {
    if (!currentItem) return;
    pushResult(currentItem, guess, false);
  };

  const restartToMenu = () => {
    setPhase("start");
    setDeck([]);
    setRoundIndex(0);
    setGuess(0);
    setTimeLeft(CARD_TIME);
    setResults([]);
    setFeedbackResult(null);
  };

  useEffect(() => {
    if (phase !== "playing" || !currentItem) return undefined;

    if (timeLeft <= 0) {
      pushResult(currentItem, guess, true);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [phase, timeLeft, currentItem, guess]);

  useEffect(() => {
    if (phase !== "feedback") return undefined;

    const timer = window.setTimeout(() => {
      goToNextRound();
    }, FEEDBACK_DELAY);

    return () => window.clearTimeout(timer);
  }, [phase, roundIndex, deck]);

  if (phase === "start") {
    return (
      <StartScreen
        onStart={startGame}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
    );
  }

  if (phase === "feedback" && feedbackResult) {
    return (
      <FeedbackScreen
        result={feedbackResult}
        round={roundIndex + 1}
        total={ROUND_LIMIT}
      />
    );
  }

  if (phase === "result") {
    return (
      <ResultScreen
        results={results}
        onRestart={restartToMenu}
        selectedCategory={selectedCategory}
      />
    );
  }

  return (
    <GameScreen
      deck={deck}
      roundIndex={roundIndex}
      timeLeft={timeLeft}
      guess={guess}
      onGuessChange={setGuess}
      onSubmit={submitGuess}
    />
  );
}
