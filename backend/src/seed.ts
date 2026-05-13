import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding Feld & Stein database...")

  // Categories
  const oils = await prisma.category.create({
    data: {
      name: "Cold-Pressed Oils",
      slug: "cold-pressed-oils",
      description: "Traditional wood-pressed and stone-pressed oils from Andhra Pradesh",
      imageUrl: "https://images.unsplash.com/photo-1474979266404-7caddbed1c4a?w=800",
    },
  })

  const groundnut = await prisma.category.create({
    data: {
      name: "Groundnut Oil",
      slug: "groundnut-oil",
      description: "Pure groundnut oil pressed in traditional Gaanuga",
      parentId: oils.id,
      imageUrl: "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?w=800",
    },
  })

  const coconut = await prisma.category.create({
    data: {
      name: "Coconut Oil",
      slug: "coconut-oil",
      description: "Virgin coconut oil from East Godavari coconuts",
      parentId: oils.id,
      imageUrl: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=800",
    },
  })

  const sesame = await prisma.category.create({
    data: {
      name: "Sesame Oil",
      slug: "sesame-oil",
      description: "Traditional nuvvula noone for cooking and wellness",
      parentId: oils.id,
      imageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800",
    },
  })

  const mustard = await prisma.category.create({
    data: {
      name: "Mustard Oil",
      slug: "mustard-oil",
      description: "Pungent mustard oil for pickles and tempering",
      parentId: oils.id,
      imageUrl: "https://images.unsplash.com/photo-1606923829579-0cb9d4fff5?w=800",
    },
  })

  // Products
  const products = [
    {
      name: "Feld & Stein Groundnut Oil",
      slug: "groundnut-oil",
      categoryId: groundnut.id,
      description: `Our signature groundnut oil is extracted using the traditional Gaanuga method — a wooden cold-press that rotates at just 12 RPM. This slow pressing preserves the natural antioxidants, Vitamin E, and resveratrol that refined oils destroy.\n\nSourced from farmers in Guntur district, our groundnuts are sun-dried for 7 days before pressing. The result is a golden, nutty oil with a smoke point of 232°C — perfect for deep frying, tempering, and everyday cooking.\n\nHealth Benefits:\n• Rich in monounsaturated fats (MUFA)\n• High in Vitamin E (antioxidant)\n• Contains resveratrol (heart-healthy)\n• Zero cholesterol\n• No preservatives or additives`,
      shortDesc: "Traditional Gaanuga cold-pressed groundnut oil from Guntur farmers",
      benefits: ["Heart healthy", "High smoke point", "Rich in Vitamin E", "No preservatives"],
      ingredients: "100% pure groundnuts (Arachis hypogaea)",
      howToUse: "Use for deep frying, tempering, sautéing, and as a salad dressing base. Store in a cool, dark place.",
      shelfLife: "12 months from date of pressing",
      variants: [
        { sku: "GN-250", name: "250ml", price: 180, weightGrams: 250, stock: 150 },
        { sku: "GN-500", name: "500ml", price: 340, weightGrams: 500, stock: 200 },
        { sku: "GN-1L", name: "1 Litre", price: 650, weightGrams: 1000, stock: 120 },
        { sku: "GN-5L", name: "5 Litres", price: 3100, weightGrams: 5000, stock: 50 },
      ],
      images: [
        { url: "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?w=800", alt: "Groundnut oil bottle", isPrimary: true, sortOrder: 0 },
        { url: "https://images.unsplash.com/photo-1474979266404-7caddbed1c4a?w=800", alt: "Groundnut oil pouring", sortOrder: 1 },
      ],
    },
    {
      name: "Feld & Stein Coconut Oil",
      slug: "coconut-oil",
      categoryId: coconut.id,
      description: `Virgin coconut oil pressed from hand-picked East Godavari coconuts within 24 hours of harvest. Our stone-press method extracts oil at temperatures below 40°C, preserving the lauric acid and medium-chain triglycerides (MCTs) that make coconut oil a superfood.\n\nThis oil is unrefined, unbleached, and undeodorized. It carries the natural aroma of fresh coconut — a sign of purity that refined oils lack.\n\nHealth Benefits:\n• 50% lauric acid (antimicrobial, antiviral)\n• MCTs for quick energy\n• Deep conditioning for hair and skin\n• Boosts metabolism`,
      shortDesc: "Virgin coconut oil from East Godavari, stone-pressed within 24 hours",
      benefits: ["50% lauric acid", "MCT energy boost", "Hair & skin care", "Metabolism support"],
      ingredients: "100% pure coconuts (Cocos nucifera)",
      howToUse: "Cooking: medium-heat sautéing, baking. Wellness: 1 tbsp daily, hair massage, skin moisturizer.",
      shelfLife: "18 months from date of pressing",
      variants: [
        { sku: "CO-250", name: "250ml", price: 220, weightGrams: 250, stock: 100 },
        { sku: "CO-500", name: "500ml", price: 420, weightGrams: 500, stock: 180 },
        { sku: "CO-1L", name: "1 Litre", price: 800, weightGrams: 1000, stock: 90 },
      ],
      images: [
        { url: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=800", alt: "Coconut oil bottle", isPrimary: true, sortOrder: 0 },
        { url: "https://images.unsplash.com/photo-1606923829579-0cb9d4fff5?w=800", alt: "Fresh coconuts", sortOrder: 1 },
      ],
    },
    {
      name: "Feld & Stein Sesame Oil",
      slug: "sesame-oil",
      categoryId: sesame.id,
      description: `Traditional nuvvula noone — sesame oil pressed from black sesame seeds grown in the black soil of Krishna district. Our wood-press extracts oil at room temperature, preserving the sesamin and sesamolin lignans that give sesame oil its powerful antioxidant properties.\n\nThis oil has been used in Ayurvedic medicine for 3,000 years. It is the oil of choice for Sankranti til laddus, Telugu pickles, and traditional massage.\n\nHealth Benefits:\n• Rich in sesamin and sesamolin (antioxidants)\n• High in calcium and iron\n• Anti-inflammatory properties\n• Natural sunscreen (SPF 4-6)`,
      shortDesc: "Traditional nuvvula noone from Krishna district black sesame",
      benefits: ["Ayurvedic superfood", "Rich in calcium", "Anti-inflammatory", "Natural SPF"],
      ingredients: "100% pure black sesame seeds (Sesamum indicum)",
      howToUse: "Cooking: tempering, pickles, chutneys. Wellness: Abhyanga massage, oil pulling, hair oiling.",
      shelfLife: "12 months from date of pressing",
      variants: [
        { sku: "SE-250", name: "250ml", price: 200, weightGrams: 250, stock: 80 },
        { sku: "SE-500", name: "500ml", price: 380, weightGrams: 500, stock: 150 },
        { sku: "SE-1L", name: "1 Litre", price: 720, weightGrams: 1000, stock: 70 },
        { sku: "SE-5L", name: "5 Litres", price: 3400, weightGrams: 5000, stock: 30 },
      ],
      images: [
        { url: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800", alt: "Sesame oil bottle", isPrimary: true, sortOrder: 0 },
        { url: "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?w=800", alt: "Sesame seeds", sortOrder: 1 },
      ],
    },
    {
      name: "Feld & Stein Mustard Oil",
      slug: "mustard-oil",
      categoryId: mustard.id,
      description: `Pungent, aromatic mustard oil from yellow mustard seeds grown in the cool climates of Visakhapatnam district. Our stone-press method extracts the oil while preserving the allyl isothiocyanate — the compound that gives mustard oil its characteristic heat and antimicrobial properties.\n\nThis is the oil your grandmother used for pickles, fish fry, and post-bath massage. No deodorization, no bleaching — just pure, pungent mustard oil.\n\nHealth Benefits:\n• Rich in omega-3 fatty acids\n• Antimicrobial and antifungal\n• Improves blood circulation\n• Natural pain reliever (topical)`,
      shortDesc: "Pungent mustard oil from Visakhapatnam, stone-pressed for pickles and tempering",
      benefits: ["Omega-3 rich", "Antimicrobial", "Improves circulation", "Natural pain relief"],
      ingredients: "100% pure yellow mustard seeds (Brassica juncea)",
      howToUse: "Cooking: tempering, pickles, fish fry. Wellness: massage oil, chest rub, joint pain relief.",
      shelfLife: "12 months from date of pressing",
      variants: [
        { sku: "MU-250", name: "250ml", price: 160, weightGrams: 250, stock: 120 },
        { sku: "MU-500", name: "500ml", price: 300, weightGrams: 500, stock: 200 },
        { sku: "MU-1L", name: "1 Litre", price: 580, weightGrams: 1000, stock: 100 },
      ],
      images: [
        { url: "https://images.unsplash.com/photo-1606923829579-0cb9d4fff5?w=800", alt: "Mustard oil bottle", isPrimary: true, sortOrder: 0 },
        { url: "https://images.unsplash.com/photo-1474979266404-7caddbed1c4a?w=800", alt: "Mustard seeds", sortOrder: 1 },
      ],
    },
  ]

  for (const p of products) {
    const { variants, images, ...productData } = p
    const product = await prisma.product.create({
      data: {
        ...productData,
        variants: {
          create: variants.map((v) => ({ ...v, lowStockThreshold: 10 })),
        },
        images: {
          create: images,
        },
      },
    })
    console.log(`  ✅ Created product: ${product.name}`)
  }

  // Coupons
  await prisma.coupon.create({
    data: {
      code: "SANKRANTI10",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 500,
      maxDiscount: 200,
      usageLimit: 1000,
      startDate: new Date(),
      endDate: new Date("2027-01-31"),
      appliesTo: ["all"],
    },
  })

  await prisma.coupon.create({
    data: {
      code: "FIRSTORDER",
      type: "FIXED_AMOUNT",
      value: 100,
      minOrderAmount: 300,
      usageLimit: 500,
      startDate: new Date(),
      appliesTo: ["all"],
    },
  })

  console.log("✅ Seed complete!")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
