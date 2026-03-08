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
    description:
      "Покупался год назад, батарея живая, в чехле с первого дня.",
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
    description:
      "Механизм раскладывания исправен, ткань без пятен, самовывоз.",
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
    description:
      "Размер M, без пятен и потертостей, после химчистки.",
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
    description:
      "Алюминиевая рама, гидравлика, пробег около двух сезонов.",
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
    description:
      "Складная, полотно без перекосов, скорость до 14 км/ч.",
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
    description:
      "Абажур целый, царапин почти нет, лампочка в комплекте.",
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
    description:
      "Ширина скашивания 34 см, нож меняли в прошлом сезоне.",
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
    description:
      "Пробег 1400 км, батарея держит нормально, есть зарядка.",
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
    description:
      "После химчистки, без сильного износа по краям.",
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
    description:
      "Работает тихо, есть коробка, фильтр менялся недавно.",
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
    description:
      "6 чашек, 6 блюдец, без сколов, рисунок не стерт.",
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
];

const richDescriptions: Record<number, string> = {
  1: "Покупался для себя, продают после обновления модели. Носился в чехле, в ремонте не был; из нюансов — аккумулятор уже не новый.",
  2: "Личный телефон, продают после перехода на новую модель. Использовался спокойно, без жесткой эксплуатации; важен общий уровень ликвидности флагмана.",
  3: "Массовый смартфон после года обычного использования. Продают из-за смены бренда; здесь легко переоценить свежесть модели относительно рынка.",
  4: "Стоял в гостиной, продают из-за переезда. Использовался дома без аренды; важный нюанс — самовывоз и практичность для нового владельца.",
  5: "Служил на кухне, продают после обновления мебели. Поверхность живая, но вещь уже не выглядит новой; стулья в комплект не входят.",
  6: "Использовалось для домашней работы, продают после апгрейда рабочего места. По механике все ок; ключевой вопрос — сколько в кресле осталось комфорта.",
  7: "Обычная домашняя микроволновка, продают из-за перехода на встраиваемую технику. Пользовались аккуратно; из нюансов — без дополнительных режимов вроде гриля.",
  8: "Пылесос из квартиры, продают после покупки более свежей модели. Использовался регулярно, но бережно; решает, сколько в нем осталось ресурса.",
  9: "Стояла в квартире, продают после покупки более вместительной модели. Работала в обычном семейном режиме; важно, насколько спокойно она проживет дальше.",
  10: "Набор продают после обновления кухни. Пользовались редко; важно не переплатить просто за известный бренд, если комплект уже не новый.",
  11: "Стоял в шкафу и доставался по праздникам, продают для освобождения места. Главная ценность тут — полный набор и аккуратное состояние.",
  12: "Носили один сезон, продают после смены гардероба. Вещь свежая, но уже с вторичного рынка; важно не переплатить только за бренд.",
  13: "Городская пара, продают потому что перестал подходить размер. Носились аккуратно; при оценке важно не смотреть только на логотип бренда.",
  14: "Базовое сезонное пальто, продают после смены размера. Носилось аккуратно; цену здесь сильно держит общее ощущение ухоженной вещи.",
  15: "Использовался для прогулок и лесопарка, продают после перехода на другой формат велосипеда. Без экстрима; ключевое — класс навески и остаточный ресурс трансмиссии.",
  16: "Стояла дома для спокойных тренировок, продают из-за переезда. Не коммерческая эксплуатация; важный нюанс — насколько техника ощущается беспроблемной.",
  17: "Хранились дома, продают после перехода в зал. Лот прагматичный; ошибка обычно в том, что его мысленно сравнивают с новым комплектом.",
  18: "Была частью интерьера спальни, продают после обновления обстановки. Вещь не первой необходимости; рынок тут особенно чувствителен к ощущению выгодной сделки.",
  19: "Личные наушники, продают после перехода на полноразмерную модель. Рабочие и ликвидные; из нюансов — потертости кейса и чувствительность категории к состоянию батареи.",
  20: "Носили в обычном режиме, продают после покупки более свежей модели. Категория массовая; важно почувствовать, насколько часы еще актуальны на фоне новых поколений.",
  21: "Любительская камера для поездок и семейных съемок, продают при переходе на беззеркалку. Не коммерческая нагрузка; решает понятный и честный остаточный ресурс.",
  22: "Использовался в спальне летом, продают после установки сплит-системы. Вне сезона такие лоты спокойнее по спросу; важно учитывать сезонность цены.",
  23: "Домашняя консоль, продают из-за редкого использования. Категория ликвидная; на цену сильно влияет комплект и общее ощущение свежести устройства.",
  24: "Использовали дома, продают после переезда и сокращения техники на кухне. После обслуживания; важен не только бренд, но и ощущение остаточного ресурса.",
  25: "Работала на небольшом участке, продают потому что техника больше не нужна. Не тяжелая эксплуатация; легко переплатить, если смотреть только на бренд.",
  26: "Использовался для городских поездок, продают потому что личный транспорт стал не нужен. Не хранился зимой на улице; решает остаточный ресурс батареи и пробег.",
  27: "Лежал в жилой комнате, продают после смены интерьера. После чистки и в аккуратном состоянии; покупатель часто сравнивает такие вещи даже с акциями на новые.",
  28: "Робот-пылесос из обычной квартиры, продают после перехода на более новую модель. Рабочий и понятный; важно, насколько он готов к повседневной жизни без вложений.",
  29: "Стоял в спальне в отопительный сезон, продают после переезда. Категория утилитарная; рынок тут быстро показывает, где заканчивается разумная цена.",
  30: "Стоял в серванте и доставался редко, продают после обновления интерьера. Важны цельность набора и аккуратный вид; без реальной редкости рынок не прощает завышение.",
};

const getRichDescription = (item: CaseItem) =>
  richDescriptions[item.id] || item.description;

function ListingVisual({ item }: { item: CaseItem }) {
  const visual = categoryVisuals[item.category];
  const Icon = visual.icon;

  return (
    <div className="grid grid-cols-[1.35fr_0.95fr] gap-3">
      <div
        className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${visual.accent} p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_30%)]" />
        <div className="relative flex h-[260px] flex-col justify-between">
          <div className="inline-flex w-fit items-center rounded-full bg-white/18 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            {visual.tag}
          </div>
          <div className="flex items-center justify-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-[30px] bg-white/14 shadow-inner shadow-white/10 backdrop-blur-sm">
              <Icon size={58} strokeWidth={1.75} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-black/10 px-4 py-3 backdrop-blur-sm">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/65">
                Фото 1
              </div>
              <div className="mt-1 text-sm font-semibold">Главный ракурс</div>
            </div>
            <div className="rounded-full bg-white/15 px-3 py-1 text-xs">1/3</div>
          </div>
        </div>
      </div>

      <div className="grid grid-rows-2 gap-3">
        <div
          className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${visual.accentSoft} p-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)]`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_36%)]" />
          <div className="relative flex h-full flex-col justify-between rounded-[22px] border border-white/70 bg-white/55 p-4 backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Фото 2
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Icon size={30} className="text-slate-700" strokeWidth={1.8} />
              </div>
            </div>
            <div className="text-sm font-medium text-slate-700">Деталь товара</div>
          </div>
        </div>

        <div
          className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${visual.accentSoft} p-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)]`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.9),transparent_38%)]" />
          <div className="relative flex h-full flex-col justify-between rounded-[22px] border border-white/70 bg-white/55 p-4 backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Фото 3
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Icon size={30} className="text-slate-700" strokeWidth={1.8} />
              </div>
            </div>
            <div className="text-sm font-medium text-slate-700">Доп. снимок</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuessSlider({
  item,
  value,
  onChange,
}: {
  item: CaseItem;
  value: number;
  onChange: (next: number) => void;
}) {
  const progress =
    ((value - item.slider.min) / (item.slider.max - item.slider.min)) * 100;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Сколько бы вы заплатили за б/у?
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Передвиньте ползунок и зафиксируйте свою оценку.
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 shadow-sm">
          {formatPrice(value)}
        </span>
      </div>

      <div className="mt-5">
        <div className="relative h-10">
          <div className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-slate-200" />
          <div
            className="absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={item.slider.min}
            max={item.slider.max}
            step={item.slider.step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 z-10 h-10 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-12px] [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:shadow-[0_8px_20px_rgba(15,23,42,0.22)] [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-900"
          />
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
        <span>{formatPrice(item.slider.min)}</span>
        <span>{formatPrice(item.slider.max)}</span>
      </div>
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_bottom,rgba(34,197,94,0.12),transparent_30%),#f8fafc] p-4">
      <div className="w-full max-w-[430px] overflow-hidden rounded-[36px] border border-white/70 bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500 p-6 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <CircleDollarSign size={14} />
            Авито-inspired prototype
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight">Чувство цены</h1>
          <p className="mt-3 text-sm leading-6 text-white/88">
            На Авито выгодно покупать вещи с историей, если умеешь быстро
            понимать рынок. Смотри на цену нового товара и оценивай, сколько
            разумно стоит его б/у версия.
          </p>
        </div>

        <div className="space-y-4 p-6 text-slate-700">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-sm font-semibold text-slate-900">
              Оценить свои знания в категории
            </div>
            <div className="mt-3 space-y-3">
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
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-2xl p-2 ${isSelected ? "bg-white/12" : "bg-slate-100"}`}>
                        <Icon size={18} className={isSelected ? "text-white" : "text-slate-700"} />
                      </div>
                      <div>
                        <div className="font-semibold">{meta.title}</div>
                        <div className={`mt-1 text-sm ${isSelected ? "text-white/75" : "text-slate-500"}`}>
                          {meta.subtitle}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-2xl font-bold text-slate-900">5</div>
              <div className="mt-1 text-slate-500">карточек</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-2xl font-bold text-slate-900">30с</div>
              <div className="mt-1 text-slate-500">на кейс</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-2xl font-bold text-slate-900">цена нового</div>
              <div className="mt-1 text-slate-500">как ориентир</div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
            В каждой карточке сразу показана цена такого же товара новым. Твоя
            задача — понять, сколько разумно стоит б/у и где на Авито появляется
            настоящая выгода.
          </div>

          <button
            onClick={onStart}
            disabled={!selectedCategory}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-900 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            Начать игру
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
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
  const deviationPercent = Math.round(result.deviation * 100);
  const status = getRoundStatus(result.deviation, result.timedOut);
  const savings = getSavings(result.item);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_28%),#f8fafc] p-4">
      <div className="w-full max-w-[430px] rounded-[36px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            Карточка {round}/{total}
          </span>
          <span>Разбор</span>
        </div>

        <div className={`mt-5 rounded-3xl border px-5 py-4 ${status.tone}`}>
          <div className="text-[28px] font-extrabold tracking-tight">{status.title}</div>
          <div className="mt-1 text-sm opacity-80">
            {result.timedOut
              ? "Таймер закончился, поэтому показываем ориентир по лоту и реальную выгоду покупки б/у."
              : "Сравните свою оценку с рыночной ценой и посмотрите, насколько выгоднее покупать этот товар б/у, а не новым."}
          </div>
        </div>

        <h2 className="mt-5 text-2xl font-bold text-slate-900">{result.item.title}</h2>

        <div className="mt-6 grid gap-3">
          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Ваша оценка</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {result.timedOut ? "—" : formatPrice(result.guess)}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-4 text-white">
            <div className="text-sm text-white/70">Рыночная цена б/у</div>
            <div className="mt-1 text-2xl font-bold">
              {formatPrice(result.item.marketPrice)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Цена нового</div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                {formatPrice(savings.newPrice)}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="text-sm text-emerald-700">Выгода покупки б/у</div>
              <div className="mt-1 text-xl font-bold text-emerald-800">
                {formatPrice(savings.rubles)}
              </div>
              <div className="mt-1 text-xs text-emerald-700">
                Около {savings.percent}% дешевле нового
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Отклонение</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {deviationPercent}%
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${
                  deviationPercent <= 8
                    ? "bg-emerald-500"
                    : deviationPercent <= 18
                      ? "bg-sky-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${clamp(deviationPercent, 2, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-6 text-slate-700">
          <div className="mb-1 font-semibold text-slate-900">
            На что стоило обратить внимание
          </div>
          {result.item.keyInsight}
        </div>
      </div>
    </div>
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_24%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.10),transparent_25%),#f8fafc] p-4">
      <div className="w-full max-w-[430px] rounded-[36px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
          <Trophy size={15} />
          Итоги сессии
        </div>

        <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
          {label.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {label.subtitle} Если видишь цену нового и быстро понимаешь честную
          цену б/у, на Авито проще находить реально выгодные покупки.
        </p>
        {selectedCategory && (
          <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            Категория: {sessionCategoryMeta[selectedCategory].title}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-slate-900 p-4 text-white">
            <div className="text-sm text-white/70">Среднее отклонение</div>
            <div className="mt-1 text-3xl font-bold">
              {Math.round(avgDeviation * 100)}%
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Отвечено вовремя</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {answered.length}/{results.length}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="text-sm text-emerald-700">Лучшая попытка</div>
            <div className="mt-1 font-semibold text-slate-900">
              {best ? best.item.title : "—"}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {best
                ? `${Math.round(best.deviation * 100)}% отклонения`
                : "Нет ответа"}
            </div>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-rose-50/70 p-4">
            <div className="text-sm text-rose-700">Самый сложный кейс</div>
            <div className="mt-1 font-semibold text-slate-900">
              {worst ? worst.item.title : "—"}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {worst
                ? `${Math.round(worst.deviation * 100)}% отклонения`
                : "Нет данных"}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">
            Все 5 карточек
          </div>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={result.item.id}
                className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 text-sm shadow-sm"
              >
                <div className="min-w-0 pr-3">
                  <div className="truncate font-medium text-slate-900">
                    {index + 1}. {result.item.title}
                  </div>
                  <div className="text-slate-500">
                    Б/у: {formatPrice(result.item.marketPrice)} · Новое: {formatPrice(getNewPrice(result.item))}
                  </div>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
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
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-900 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <RotateCcw size={18} />
          Сыграть еще раз
        </button>
      </div>
    </div>
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
  const timerProgress = (timeLeft / CARD_TIME) * 100;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_22%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_24%),#f8fafc] px-4 py-5">
      <div className="mx-auto max-w-[430px]">
        <div className="mb-4 rounded-[28px] border border-white/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Серия
              </div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                {roundIndex + 1} / {ROUND_LIMIT}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                <TimerReset size={14} />
                Таймер
              </div>
              <div
                className={`mt-1 text-xl font-bold ${
                  timeLeft <= 7 ? "text-rose-500" : "text-slate-900"
                }`}
              >
                {timeLeft}с
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full transition-all ${
                timeLeft <= 7 ? "bg-rose-500" : "bg-slate-900"
              }`}
              style={{ width: `${timerProgress}%` }}
            />
          </div>
        </div>

        <div className="rounded-[36px] border border-white/70 bg-white/88 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-5">
          <ListingVisual item={item} />

          <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="min-w-0">
              <div className="text-4xl font-bold tracking-tight text-slate-900">
                {item.title}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {item.fields.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <div className="mb-1 font-semibold text-slate-900">Описание</div>
              {getRichDescription(item)}
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-white/60">
              Цена нового
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight">
              {formatPrice(savings.newPrice)}
            </div>
            <div className="mt-2 text-sm leading-6 text-white/75">
              Представьте, что такой же товар вы покупаете новым. Теперь оцените,
              сколько честно стоит его б/у версия с учетом состояния и комплекта.
            </div>
          </div>

          <div className="mt-5">
            <GuessSlider item={item} value={guess} onChange={onGuessChange} />
          </div>

          <button
            onClick={onSubmit}
            className="mt-5 flex w-full items-center justify-center rounded-[28px] bg-slate-900 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Зафиксировать цену
          </button>
        </div>
      </div>
    </div>
  );
}

function runSelfChecks() {
  console.assert(
    formatPrice(47000) === "47 000 ₽" || formatPrice(47000) === "47 000 ₽",
    "formatPrice should format rubles",
  );
  console.assert(clamp(10, 0, 5) === 5, "clamp upper bound failed");
  console.assert(clamp(-3, 0, 5) === 0, "clamp lower bound failed");
  console.assert(
    roundToStep(14550, 500) === 14500,
    "roundToStep should snap to step",
  );
  console.assert(
    getDeviation(100, 100) === 0,
    "getDeviation exact match failed",
  );
  console.assert(
    Math.round(getDeviation(120, 100) * 100) === 20,
    "getDeviation percentage failed",
  );
  console.assert(cases.length === 30, "Expected 30 cases in prototype data");
  console.assert(
    cases.filter((item) => item.sessionCategory === "electronics").length >= 5,
    "Need at least 5 electronics items",
  );
  console.assert(
    cases.filter((item) => item.sessionCategory === "homeLiving").length >= 5,
    "Need at least 5 homeLiving items",
  );
  console.assert(
    cases.filter((item) => item.sessionCategory === "lifestyle").length >= 5,
    "Need at least 5 lifestyle items",
  );
  console.assert(
    getNewPrice(cases[0]) > cases[0].marketPrice,
    "New price hint must be above market price",
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

  const getInitialGuess = (item: CaseItem) =>
    roundToStep((item.slider.min + item.slider.max) / 2, item.slider.step);

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
    const finalGuess = timedOut ? fallbackGuess : selectedGuess;
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
