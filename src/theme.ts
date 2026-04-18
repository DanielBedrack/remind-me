export const C = {
  // Backgrounds
  bg:             '#0C0C0F',
  bgSecondary:    '#111115',
  card:           '#1A1A1F',
  cardElevated:   '#1E1E26',
  cardBorder:     '#2A2A32',

  // Text
  textPrimary:    '#FFFFFF',
  textSecondary:  '#8E8E9A',
  textTertiary:   '#4A4A58',

  // Accent
  accent:         '#5B9EFF',
  accentSoft:     'rgba(91,158,255,0.15)',
  accentDim:      '#1A2F55',

  // Semantic
  danger:         '#FF4A4A',
  success:        '#34C759',
  warning:        '#FF9F0A',
  purple:         '#BF5AF2',

  // Inputs
  inputBg:        '#1E1E26',

  // Tab bar
  tabBar:         '#13131A',
  tabBarBorder:   '#1E1E26',
};

// Per-store accent colors
export const STORE_COLORS: Record<string, string> = {
  supermarket: '#34C759',
  hardware:    '#FF9F0A',
  pharmacy:    '#5B9EFF',
  general:     '#BF5AF2',
};

export const PRODUCT_EMOJI: Record<string, string> = {
  Milk: '🥛', Bread: '🍞', Eggs: '🥚', Butter: '🧈', Cheese: '🧀',
  Yogurt: '🫙', Chicken: '🍗', Rice: '🍚', Pasta: '🍝', Tomatoes: '🍅',
  Onions: '🧅', Apples: '🍎', Bananas: '🍌', 'Orange Juice': '🍊',
  Coffee: '☕', Sugar: '🍬', Flour: '🌾', Oil: '🫙',
  Screws: '🔩', Nails: '🔨', Paint: '🎨', 'Drill Bits': '🔧',
  Sandpaper: '📋', 'Light Bulbs': '💡', 'Duct Tape': '📦', 'WD-40': '🛢️',
  'Cable Ties': '🔗', 'Wall Plugs': '🔌', 'Extension Cord': '⚡', Paintbrush: '🖌️',
  Aspirin: '💊', Bandages: '🩹', Vitamins: '🌿', Sunscreen: '🧴',
  Ibuprofen: '💊', 'Cough Syrup': '🍶', 'Hand Sanitizer': '🧴',
  Thermometer: '🌡️', 'Eye Drops': '👁️', Antacid: '💊', 'Allergy Pills': '💊',
  'Trash Bags': '🗑️', 'Cleaning Spray': '🧹', 'Paper Towels': '🧻',
  'Toilet Paper': '🧻', 'Dish Soap': '🧼', 'Laundry Detergent': '🧺',
  Sponges: '🧽', Candles: '🕯️', 'Zip Bags': '📦', 'Aluminum Foil': '🪞',
};

export function productEmoji(name: string): string {
  return PRODUCT_EMOJI[name] ?? '🛍️';
}
