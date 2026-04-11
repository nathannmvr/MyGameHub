// prisma/seed.ts
// Database seed with realistic sample data for development and testing
// Run: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─────────────────────────────────────────────
  // 1. CREATE USER
  // ─────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { username: "nathan" },
    update: {},
    create: {
      username: "nathan",
      email: "nathannmvr@gmail.com",
      steamId: "76561198000000000", // Example Steam ID
      avatarUrl: null,
    },
  });
  console.log(`✅ User: ${user.username} (${user.id})`);

  // ─────────────────────────────────────────────
  // 2. CREATE PLATFORMS
  // ─────────────────────────────────────────────
  const platformsData = [
    { name: "PC", manufacturer: "Various", icon: "monitor" },
    { name: "PlayStation 5", manufacturer: "Sony", icon: "playstation" },
    { name: "Nintendo Switch", manufacturer: "Nintendo", icon: "nintendo-switch" },
    { name: "Xbox Series X", manufacturer: "Microsoft", icon: "xbox" },
  ];

  const platforms: Record<string, Awaited<ReturnType<typeof prisma.platform.create>>> = {};

  for (const p of platformsData) {
    const platform = await prisma.platform.upsert({
      where: {
        userId_name: { userId: user.id, name: p.name },
      },
      update: {},
      create: {
        userId: user.id,
        name: p.name,
        manufacturer: p.manufacturer,
        icon: p.icon,
      },
    });
    platforms[p.name] = platform;
    console.log(`✅ Platform: ${platform.name} (${platform.id})`);
  }

  // ─────────────────────────────────────────────
  // 3. CREATE GAMES (realistic data)
  // ─────────────────────────────────────────────
  const gamesData = [
    {
      rawgId: 3498,
      rawgSlug: "grand-theft-auto-v",
      steamAppId: 271590,
      title: "Grand Theft Auto V",
      coverUrl: "https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg",
      developer: "Rockstar North",
      publisher: "Rockstar Games",
      releaseDate: new Date("2013-09-17"),
      description: "An open world action-adventure game set in the fictional state of San Andreas.",
      genres: ["Action", "Adventure"],
      tags: ["Open World", "Multiplayer", "Crime"],
      gamePlatforms: ["PC", "PlayStation 5", "Xbox Series X"],
      metacritic: 97,
    },
    {
      rawgId: 3328,
      rawgSlug: "the-witcher-3-wild-hunt",
      steamAppId: 292030,
      title: "The Witcher 3: Wild Hunt",
      coverUrl: "https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg",
      developer: "CD Projekt Red",
      publisher: "CD Projekt",
      releaseDate: new Date("2015-05-18"),
      description: "An RPG masterpiece about Geralt of Rivia hunting for his adopted daughter.",
      genres: ["RPG", "Action"],
      tags: ["Open World", "Story Rich", "Fantasy"],
      gamePlatforms: ["PC", "PlayStation 5", "Nintendo Switch", "Xbox Series X"],
      metacritic: 93,
    },
    {
      rawgId: 58175,
      rawgSlug: "god-of-war-2018",
      steamAppId: 1593500,
      title: "God of War (2018)",
      coverUrl: "https://media.rawg.io/media/games/4be/4be6a6ad0217c2c2ff7a7b3826456834.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/4be/4be6a6ad0217c2c2ff7a7b3826456834.jpg",
      developer: "Santa Monica Studio",
      publisher: "Sony Interactive Entertainment",
      releaseDate: new Date("2018-04-20"),
      description: "Kratos returns in a Norse mythology setting with his son Atreus.",
      genres: ["Action", "Adventure", "RPG"],
      tags: ["Story Rich", "Hack and Slash", "Mythology"],
      gamePlatforms: ["PC", "PlayStation 5"],
      metacritic: 94,
    },
    {
      rawgId: 28,
      rawgSlug: "red-dead-redemption-2",
      steamAppId: 1174180,
      title: "Red Dead Redemption 2",
      coverUrl: "https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg",
      developer: "Rockstar Games",
      publisher: "Rockstar Games",
      releaseDate: new Date("2018-10-26"),
      description: "An epic tale of life in America at the dawn of the modern age.",
      genres: ["Action", "Adventure"],
      tags: ["Open World", "Western", "Story Rich"],
      gamePlatforms: ["PC", "PlayStation 5", "Xbox Series X"],
      metacritic: 97,
    },
    {
      rawgId: 22511,
      rawgSlug: "the-legend-of-zelda-breath-of-the-wild",
      title: "The Legend of Zelda: Breath of the Wild",
      coverUrl: "https://media.rawg.io/media/games/cc1/cc1b22e5c7e5b72f4da4c143e8103105.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/cc1/cc1b22e5c7e5b72f4da4c143e8103105.jpg",
      developer: "Nintendo",
      publisher: "Nintendo",
      releaseDate: new Date("2017-03-03"),
      description: "An open-air adventure across Hyrule.",
      genres: ["Action", "Adventure", "RPG"],
      tags: ["Open World", "Exploration", "Fantasy"],
      gamePlatforms: ["Nintendo Switch"],
      metacritic: 97,
    },
    {
      rawgId: 32,
      rawgSlug: "destiny-2",
      steamAppId: 1085660,
      title: "Destiny 2",
      coverUrl: "https://media.rawg.io/media/games/34b/34b1f1850a1c06fd971bc6e3b1c0e174.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/34b/34b1f1850a1c06fd971bc6e3b1c0e174.jpg",
      developer: "Bungie",
      publisher: "Bungie",
      releaseDate: new Date("2017-09-06"),
      description: "A free-to-play online multiplayer FPS with PvE and PvP modes.",
      genres: ["Action", "Shooter", "Adventure"],
      tags: ["Multiplayer", "Co-op", "FPS", "Looter Shooter"],
      gamePlatforms: ["PC", "PlayStation 5", "Xbox Series X"],
      metacritic: 85,
    },
    {
      rawgId: 802,
      rawgSlug: "borderlands-2",
      steamAppId: 49520,
      title: "Borderlands 2",
      coverUrl: "https://media.rawg.io/media/games/49c/49c3dfa4ce2f6f140cc4825868e858cb.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/49c/49c3dfa4ce2f6f140cc4825868e858cb.jpg",
      developer: "Gearbox Software",
      publisher: "2K Games",
      releaseDate: new Date("2012-09-18"),
      description: "A looter shooter RPG on the planet Pandora.",
      genres: ["Action", "Shooter", "RPG"],
      tags: ["Co-op", "Loot", "FPS"],
      gamePlatforms: ["PC", "PlayStation 5", "Nintendo Switch", "Xbox Series X"],
      metacritic: 89,
    },
    {
      rawgId: 13536,
      rawgSlug: "portal-2",
      steamAppId: 620,
      title: "Portal 2",
      coverUrl: "https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188b09.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188b09.jpg",
      developer: "Valve",
      publisher: "Valve",
      releaseDate: new Date("2011-04-18"),
      description: "A puzzle-platform game featuring portals and physics.",
      genres: ["Puzzle", "Adventure"],
      tags: ["Co-op", "Physics", "Puzzle"],
      gamePlatforms: ["PC", "Xbox Series X"],
      metacritic: 95,
    },
    {
      rawgId: 5679,
      rawgSlug: "the-elder-scrolls-v-skyrim",
      steamAppId: 72850,
      title: "The Elder Scrolls V: Skyrim",
      coverUrl: "https://media.rawg.io/media/games/7cf/7cfc9220b401b7a300e409e539c9adfd.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/7cf/7cfc9220b401b7a300e409e539c9adfd.jpg",
      developer: "Bethesda Game Studios",
      publisher: "Bethesda Softworks",
      releaseDate: new Date("2011-11-11"),
      description: "An open world RPG with dragons, magic, and countless adventures.",
      genres: ["RPG", "Action"],
      tags: ["Open World", "Fantasy", "Moddable"],
      gamePlatforms: ["PC", "PlayStation 5", "Nintendo Switch", "Xbox Series X"],
      metacritic: 94,
    },
    {
      rawgId: 4200,
      rawgSlug: "portal",
      steamAppId: 400,
      title: "Portal",
      coverUrl: "https://media.rawg.io/media/games/7fa/7fa0b586293c5861ee32b5d82bc9a7f0.jpg",
      backgroundUrl: "https://media.rawg.io/media/games/7fa/7fa0b586293c5861ee32b5d82bc9a7f0.jpg",
      developer: "Valve",
      publisher: "Valve",
      releaseDate: new Date("2007-10-09"),
      description: "The original portal gun puzzle game.",
      genres: ["Puzzle", "Adventure"],
      tags: ["Physics", "Puzzle", "Sci-fi"],
      gamePlatforms: ["PC"],
      metacritic: 90,
    },
  ];

  const games: Record<string, Awaited<ReturnType<typeof prisma.game.create>>> = {};

  for (const g of gamesData) {
    const { gamePlatforms, ...gameData } = g;
    const game = await prisma.game.upsert({
      where: g.rawgId ? { rawgId: g.rawgId } : { rawgSlug: g.rawgSlug },
      update: {},
      create: {
        ...gameData,
        platforms: gamePlatforms,
      },
    });
    games[g.title] = game;
    console.log(`✅ Game: ${game.title} (rawgId: ${game.rawgId})`);
  }

  // ─────────────────────────────────────────────
  // 4. CREATE USER_GAMES (library entries with varied statuses)
  // ─────────────────────────────────────────────
  const libraryEntries = [
    {
      game: "Grand Theft Auto V",
      platform: "PC",
      status: "PLAYED" as const,
      rating: 9,
      playtimeHours: 120.5,
      review: "Incredible open world, amazing online mode.",
    },
    {
      game: "The Witcher 3: Wild Hunt",
      platform: "PC",
      status: "PLAYED" as const,
      rating: 10,
      playtimeHours: 200.0,
      review: "Masterpiece. Hearts of Stone and Blood & Wine are essential.",
    },
    {
      game: "God of War (2018)",
      platform: "PlayStation 5",
      status: "PLAYED" as const,
      rating: 9,
      playtimeHours: 35.0,
      review: "Beautiful reimagining of Kratos' story.",
    },
    {
      game: "Red Dead Redemption 2",
      platform: "PC",
      status: "PLAYING" as const,
      rating: null,
      playtimeHours: 45.0,
      review: null,
    },
    {
      game: "The Legend of Zelda: Breath of the Wild",
      platform: "Nintendo Switch",
      status: "BACKLOG" as const,
      rating: null,
      playtimeHours: 0,
      review: null,
    },
    {
      game: "Destiny 2",
      platform: "PC",
      status: "DROPPED" as const,
      rating: 5,
      playtimeHours: 15.0,
      review: "Fun gunplay but too grindy for me.",
    },
    {
      game: "Borderlands 2",
      platform: "PC",
      status: "PLAYED" as const,
      rating: 8,
      playtimeHours: 80.0,
      review: "Great with friends! Handsome Jack is an amazing villain.",
    },
    {
      game: "Portal 2",
      platform: "PC",
      status: "PLAYED" as const,
      rating: 10,
      playtimeHours: 12.0,
      review: "Perfect game. Co-op is fantastic.",
    },
    {
      game: "The Elder Scrolls V: Skyrim",
      platform: "PC",
      status: "PLAYING" as const,
      rating: null,
      playtimeHours: 300.0,
      review: null,
    },
    {
      game: "Portal",
      platform: "PC",
      status: "WISHLIST" as const,
      rating: null,
      playtimeHours: null,
      review: null,
    },
  ];

  for (const entry of libraryEntries) {
    const game = games[entry.game];
    const platform = platforms[entry.platform];

    if (!game || !platform) {
      console.warn(`⚠️ Skipping: ${entry.game} on ${entry.platform} — not found`);
      continue;
    }

    const userGame = await prisma.userGame.upsert({
      where: {
        userId_gameId: { userId: user.id, gameId: game.id },
      },
      update: {},
      create: {
        userId: user.id,
        gameId: game.id,
        platformId: platform.id,
        status: entry.status,
        rating: entry.rating,
        playtimeHours: entry.playtimeHours,
        review: entry.review,
      },
    });
    console.log(`✅ Library: ${entry.game} → ${entry.status} on ${entry.platform}`);
  }

  // ─────────────────────────────────────────────
  // 5. CREATE A COMPLETED SYNC JOB (sample)
  // ─────────────────────────────────────────────
  await prisma.syncJob.create({
    data: {
      userId: user.id,
      type: "STEAM",
      status: "COMPLETED",
      totalItems: 8,
      processedItems: 8,
      completedAt: new Date(),
    },
  });
  console.log(`✅ SyncJob: COMPLETED (8/8 items)`);

  console.log("\n🎉 Seed completed successfully!");
  console.log(`   📊 Summary: 1 User, ${Object.keys(platforms).length} Platforms, ${Object.keys(games).length} Games, ${libraryEntries.length} Library Entries, 1 SyncJob`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
