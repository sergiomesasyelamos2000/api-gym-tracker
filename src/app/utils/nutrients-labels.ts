const NUTRIENT_LABELS_ES: Record<string, string> = {
  // Principales
  'energy-kcal': 'Calorías (kcal)',
  'energy-kcal_100g': 'Calorías (kcal/100g)',
  'energy-kcal_serving': 'Calorías por ración (kcal)',
  'energy-kcal_unit': 'Unidad de calorías',
  'energy-kcal_value': 'Valor de calorías',
  'energy-kcal_value_computed': 'Calorías calculadas',
  energy: 'Energía (kJ)',
  energy_100g: 'Energía (kJ/100g)',
  energy_serving: 'Energía por ración (kJ)',
  energy_unit: 'Unidad de energía',
  energy_value: 'Valor de energía',
  'energy-kj': 'Energía (kJ)',
  'energy-kj_100g': 'Energía (kJ/100g)',
  'energy-kj_serving': 'Energía por ración (kJ)',
  'energy-kj_unit': 'Unidad de energía (kJ)',
  'energy-kj_value': 'Valor de energía (kJ)',
  'energy-kj_value_computed': 'Energía calculada (kJ)',

  carbohydrates: 'Carbohidratos (g)',
  carbohydrates_100g: 'Carbohidratos (g/100g)',
  carbohydrates_serving: 'Carbohidratos por ración (g)',
  carbohydrates_unit: 'Unidad de carbohidratos',
  carbohydrates_value: 'Valor de carbohidratos',

  proteins: 'Proteínas (g)',
  proteins_100g: 'Proteínas (g/100g)',
  proteins_serving: 'Proteínas por ración (g)',
  proteins_unit: 'Unidad de proteínas',
  proteins_value: 'Valor de proteínas',

  fat: 'Grasas (g)',
  fat_100g: 'Grasas (g/100g)',
  fat_serving: 'Grasas por ración (g)',
  fat_unit: 'Unidad de grasas',
  fat_value: 'Valor de grasas',

  sugars: 'Azúcares (g)',
  sugars_100g: 'Azúcares (g/100g)',
  sugars_serving: 'Azúcares por ración (g)',
  sugars_unit: 'Unidad de azúcares',
  sugars_value: 'Valor de azúcares',

  fiber: 'Fibra (g)',
  fiber_100g: 'Fibra (g/100g)',
  fiber_serving: 'Fibra por ración (g)',
  fiber_unit: 'Unidad de fibra',

  salt: 'Sal (g)',
  salt_100g: 'Sal (g/100g)',
  salt_serving: 'Sal por ración (g)',
  salt_unit: 'Unidad de sal',
  salt_value: 'Valor de sal',

  'saturated-fat': 'Grasas saturadas (g)',
  'saturated-fat_100g': 'Grasas saturadas (g/100g)',
  'saturated-fat_serving': 'Grasas saturadas por ración (g)',
  'saturated-fat_unit': 'Unidad de grasas saturadas',
  'saturated-fat_value': 'Valor de grasas saturadas',

  sodium: 'Sodio (mg)',
  sodium_100g: 'Sodio (mg/100g)',
  sodium_serving: 'Sodio por ración (mg)',
  sodium_unit: 'Unidad de sodio',
  sodium_value: 'Valor de sodio',

  // Otros
  'fruits-vegetables-legumes-estimate-from-ingredients_100g':
    'Frutas, verduras y legumbres estimadas (100g)',
  'fruits-vegetables-legumes-estimate-from-ingredients_serving':
    'Frutas, verduras y legumbres estimadas por ración',
  'fruits-vegetables-nuts-estimate-from-ingredients_100g':
    'Frutas, verduras y frutos secos estimados (100g)',
  'fruits-vegetables-nuts-estimate-from-ingredients_serving':
    'Frutas, verduras y frutos secos estimados por ración',
  'nova-group': 'Grupo NOVA',
  'nova-group_100g': 'Grupo NOVA (100g)',
  'nova-group_serving': 'Grupo NOVA por ración',
  'nutrition-score-fr': 'Nutri-Score (Francia)',
  'nutrition-score-fr_100g': 'Nutri-Score (Francia, 100g)',

  // Huella de carbono
  'carbon-footprint-from-known-ingredients_100g': 'Huella de carbono (100g)',
  'carbon-footprint-from-known-ingredients_product':
    'Huella de carbono (producto)',
  'carbon-footprint-from-known-ingredients_serving':
    'Huella de carbono por ración',

  // Nutrientes adicionales
  alcohol: 'Alcohol (%)',

  calcium: 'Calcio (mg)',
  calcium_100g: 'Calcio (mg/100g)',
  calcium_serving: 'Calcio por ración (mg)',

  magnesium: 'Magnesio (mg)',
  magnesium_100g: 'Magnesio (mg/100g)',
  magnesium_serving: 'Magnesio por ración (mg)',

  potassium: 'Potasio (mg)',
  potassium_100g: 'Potasio (mg/100g)',
  potassium_serving: 'Potasio por ración (mg)',

  zinc: 'Zinc (mg)',
  zinc_100g: 'Zinc (mg/100g)',
  zinc_serving: 'Zinc por ración (mg)',

  selenium: 'Selenio (µg)',
  selenium_100g: 'Selenio (µg/100g)',
  selenium_serving: 'Selenio por ración (µg)',

  'vitamin-a': 'Vitamina A (µg)',
  'vitamin-a_100g': 'Vitamina A (µg/100g)',

  'vitamin-d': 'Vitamina D (µg)',
  'vitamin-d_100g': 'Vitamina D (µg/100g)',

  'vitamin-e': 'Vitamina E (mg)',
  'vitamin-e_100g': 'Vitamina E (mg/100g)',

  'vitamin-c': 'Vitamina C (mg)',
  'vitamin-c_100g': 'Vitamina C (mg/100g)',

  'vitamin-b1': 'Vitamina B1 (tiamina) (mg)',
  'vitamin-b1_100g': 'Vitamina B1 (mg/100g)',

  'vitamin-b2': 'Vitamina B2 (riboflavina) (mg)',
  'vitamin-b2_100g': 'Vitamina B2 (mg/100g)',

  'vitamin-b6': 'Vitamina B6 (mg)',
  'vitamin-b6_100g': 'Vitamina B6 (mg/100g)',

  'vitamin-b12': 'Vitamina B12 (µg)',
  'vitamin-b12_100g': 'Vitamina B12 (µg/100g)',

  folates: 'Ácido fólico (µg)',
  folates_100g: 'Ácido fólico (µg/100g)',

  'monounsaturated-fat': 'Ácidos grasos monoinsaturados (g)',
  'monounsaturated-fat_100g': 'Grasas monoinsaturadas (g/100g)',

  'polyunsaturated-fat': 'Ácidos grasos poliinsaturados (g)',
  'polyunsaturated-fat_100g': 'Grasas poliinsaturadas (g/100g)',

  cholesterol: 'Colesterol (mg)',
  cholesterol_100g: 'Colesterol (mg/100g)',

  phosphorus: 'Fósforo (mg)',
  phosphorus_100g: 'Fósforo (mg/100g)',

  copper: 'Cobre (mg)',
  copper_100g: 'Cobre (mg/100g)',
};

export default NUTRIENT_LABELS_ES;
