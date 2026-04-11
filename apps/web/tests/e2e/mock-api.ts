import type { Page } from '@playwright/test';

export type MockSearchResult = {
  rawgId: number;
  title: string;
  coverUrl: string | null;
  platforms: string[];
  genres: string[];
  metacritic: number;
};

export interface MockApiOptions {
  searchResult?: MockSearchResult;
}

type MockPlatform = {
  id: string;
  userId: string;
  name: string;
  manufacturer: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
};

type MockLibraryItem = {
  id: string;
  status: string;
  rating: number | null;
  playtimeHours: number | null;
  review: string | null;
  addedAt: string;
  game: {
    id: string;
    title: string;
    coverUrl: string | null;
    developer: string | null;
    genres: string[];
  };
  platform: {
    id: string;
    name: string;
    icon: string;
  };
};

type MockCatalogGame = MockSearchResult & {
  developer: string | null;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nowIso() {
  return new Date().toISOString();
}

function createPlatform(platform: Omit<MockPlatform, 'createdAt'>): MockPlatform {
  return {
    ...platform,
    createdAt: nowIso(),
  };
}

function createLibraryItem(game: MockCatalogGame, platform: MockPlatform): MockLibraryItem {
  return {
    id: `library-${game.rawgId}`,
    status: 'BACKLOG',
    rating: null,
    playtimeHours: null,
    review: null,
    addedAt: nowIso(),
    game: {
      id: `game-${game.rawgId}`,
      title: game.title,
      coverUrl: game.coverUrl,
      developer: game.developer,
      genres: game.genres,
    },
    platform: {
      id: platform.id,
      name: platform.name,
      icon: platform.icon,
    },
  };
}

function toPlatformResponse(platforms: MockPlatform[]) {
  return {
    success: true,
    data: platforms,
  };
}

function toLibraryResponse(items: MockLibraryItem[]) {
  return {
    success: true,
    data: {
      data: items,
      pagination: {
        page: 1,
        pageSize: items.length || 20,
        totalItems: items.length,
        totalPages: 1,
      },
    },
  };
}

function toSearchResponse(item: MockSearchResult) {
  return {
    success: true,
    data: {
      data: [item],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    },
  };
}

function toDiscoverResponse(items: MockSearchResult[]) {
  return {
    success: true,
    data: {
      data: items,
      pagination: {
        page: 1,
        pageSize: items.length || 20,
        totalItems: items.length,
        totalPages: 1,
      },
    },
  };
}

function toSteamJobResponse(status: 'RUNNING' | 'COMPLETED') {
  return {
    success: true,
    data: {
      id: 'steam-sync-job-e2e',
      userId: 'user-e2e',
      type: 'STEAM_SYNC',
      status,
      totalItems: 4,
      processedItems: status === 'COMPLETED' ? 4 : 2,
      errorMessage: null,
      startedAt: nowIso(),
      completedAt: status === 'COMPLETED' ? nowIso() : null,
    },
  };
}

export async function setupMockApi(page: Page, options: MockApiOptions = {}) {
  const platforms: MockPlatform[] = [
    createPlatform({ id: 'platform-pc', userId: 'user-e2e', name: 'PC', manufacturer: 'Valve', icon: 'gamepad', isActive: true }),
    createPlatform({ id: 'platform-ps5', userId: 'user-e2e', name: 'PlayStation 5', manufacturer: 'Sony', icon: 'console', isActive: true }),
  ];

  const catalog = new Map<number, MockCatalogGame>();
  const searchResult = options.searchResult ?? {
    rawgId: 8_800_001,
    title: 'Discovery Test Game',
    coverUrl: null,
    platforms: ['PC', 'PlayStation 5'],
    genres: ['Action', 'Adventure'],
    metacritic: 91,
  };

  catalog.set(searchResult.rawgId, {
    ...searchResult,
    developer: 'E2E Studio',
  });

  const recommendations: MockSearchResult[] = [
    {
      rawgId: 8_800_101,
      title: 'Recommendation One',
      coverUrl: null,
      platforms: ['PC'],
      genres: ['RPG'],
      metacritic: 87,
    },
    {
      rawgId: 8_800_102,
      title: 'Recommendation Two',
      coverUrl: null,
      platforms: ['PC', 'PlayStation 5'],
      genres: ['Adventure'],
      metacritic: 84,
    },
  ];

  for (const recommendation of recommendations) {
    catalog.set(recommendation.rawgId, {
      ...recommendation,
      developer: 'E2E Studio',
    });
  }

  const library: MockLibraryItem[] = [
    createLibraryItem(catalog.get(recommendations[0].rawgId) ?? catalog.get(searchResult.rawgId)!, platforms[0]),
  ];

  const syncJobs = new Map<string, { pollCount: number }>();

  await page.context().route('**/*', async (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());
    const method = request.method();

    if (method === 'GET' && pathname.startsWith('/api/v1/platforms')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(toPlatformResponse(platforms)) });
      return;
    }

    if (method === 'POST' && pathname.startsWith('/api/v1/platforms')) {
      const body = request.postDataJSON() as { name: string; manufacturer: string; icon?: string };
      const platform: MockPlatform = createPlatform({
        id: `platform-${Date.now()}`,
        userId: 'user-e2e',
        name: body.name,
        manufacturer: body.manufacturer,
        icon: body.icon ?? 'gamepad',
        isActive: true,
      });
      platforms.push(platform);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: platform }) });
      return;
    }

    if (method === 'PUT' && pathname.startsWith('/api/v1/platforms/')) {
      const platformId = pathname.split('/').pop() ?? '';
      const body = request.postDataJSON() as Partial<MockPlatform>;
      const platform = platforms.find((entry) => entry.id === platformId);
      if (!platform) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Platform not found' } }) });
        return;
      }

      Object.assign(platform, body);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: platform }) });
      return;
    }

    if (method === 'DELETE' && pathname.startsWith('/api/v1/platforms/')) {
      const platformId = pathname.split('/').pop() ?? '';
      const index = platforms.findIndex((entry) => entry.id === platformId);
      if (index >= 0) {
        platforms.splice(index, 1);
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { deleted: true } }) });
      return;
    }

    if (method === 'GET' && pathname.startsWith('/api/v1/library')) {
      const filtered = [...library].sort((left, right) => right.addedAt.localeCompare(left.addedAt));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(toLibraryResponse(filtered)) });
      return;
    }

    if (method === 'POST' && pathname.startsWith('/api/v1/library')) {
      const body = request.postDataJSON() as { rawgId: number; platformId: string; status: string; rating?: number; playtimeHours?: number; review?: string };
      const game = catalog.get(body.rawgId) ?? {
        rawgId: body.rawgId,
        title: `Game ${body.rawgId}`,
        coverUrl: null,
        platforms: ['PC'],
        genres: ['Action'],
        metacritic: 80,
        developer: 'E2E Studio',
      };
      const platform = platforms.find((entry) => entry.id === body.platformId) ?? platforms[0];
      const item = createLibraryItem(game, platform);
      item.status = body.status;
      item.rating = body.rating ?? null;
      item.playtimeHours = body.playtimeHours ?? null;
      item.review = body.review ?? null;
      item.id = `library-${body.rawgId}-${Date.now()}`;
      library.push(item);

      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: item }) });
      return;
    }

    if (method === 'PUT' && pathname.startsWith('/api/v1/library/')) {
      const itemId = pathname.split('/').pop() ?? '';
      const body = request.postDataJSON() as Partial<MockLibraryItem> & { platformId?: string };
      const item = library.find((entry) => entry.id === itemId);
      if (!item) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Library item not found' } }) });
        return;
      }

      if (body.status) item.status = body.status;
      if (body.rating !== undefined) item.rating = body.rating as number | null;
      if (body.review !== undefined) item.review = body.review as string | null;
      if (body.platformId) {
        const platform = platforms.find((entry) => entry.id === body.platformId);
        if (platform) {
          item.platform = { id: platform.id, name: platform.name, icon: platform.icon };
        }
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: item }) });
      return;
    }

    if (method === 'DELETE' && pathname.startsWith('/api/v1/library/')) {
      const itemId = pathname.split('/').pop() ?? '';
      const index = library.findIndex((entry) => entry.id === itemId);
      if (index >= 0) {
        library.splice(index, 1);
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { deleted: true } }) });
      return;
    }

    if (method === 'GET' && pathname.startsWith('/api/v1/games/search')) {
      const query = (searchParams.get('q') ?? '').toLowerCase();
      const result = [...catalog.values()].find((entry) => entry.title.toLowerCase().includes(query)) ?? catalog.get(searchResult.rawgId)!;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(toSearchResponse(result)) });
      return;
    }

    if (method === 'GET' && pathname.startsWith('/api/v1/discover')) {
      const availableRecommendations = recommendations.filter((recommendation) => !library.some((item) => item.game.title === recommendation.title));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(toDiscoverResponse(availableRecommendations)) });
      return;
    }

    if (method === 'POST' && pathname.startsWith('/api/v1/steam/sync')) {
      const jobId = 'steam-sync-job-e2e';
      syncJobs.set(jobId, { pollCount: 0 });
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { jobId, status: 'RUNNING' } }),
      });
      return;
    }

    if (method === 'GET' && pathname.startsWith('/api/v1/steam/sync/')) {
      const jobId = pathname.split('/').pop() ?? '';
      const job = syncJobs.get(jobId) ?? { pollCount: 0 };
      job.pollCount += 1;
      syncJobs.set(jobId, job);
      const status = job.pollCount >= 2 ? 'COMPLETED' : 'RUNNING';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(toSteamJobResponse(status)),
      });
      return;
    }

    if (method === 'GET' && pathname.startsWith('/api/v1/dashboard/stats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalGames: library.length,
            byStatus: {
              WISHLIST: 0,
              BACKLOG: library.filter((item) => item.status === 'BACKLOG').length,
              PLAYING: library.filter((item) => item.status === 'PLAYING').length,
              PLAYED: library.filter((item) => item.status === 'PLAYED').length,
              DROPPED: 0,
            },
            totalPlaytime: library.reduce((sum, item) => sum + (item.playtimeHours ?? 0), 0),
            averageRating: 8,
            continuePlaying: library.filter((item) => item.status === 'PLAYING'),
            gamesCompletedThisYear: 1,
            platformDistribution: platforms.map((platform) => ({ platform: platform.name, count: 1 })),
          },
        }),
      });
      return;
    }

    await route.continue();
  });

  return {
    platforms,
    library,
    catalog,
    searchResult,
  };
}

export { escapeRegExp };