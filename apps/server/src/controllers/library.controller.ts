// src/controllers/library.controller.ts
// Library CRUD controller — connects routes to LibraryService
// Uses the default user (no auth yet) — will be replaced with auth middleware

import { Request, Response, NextFunction } from "express";
import { LibraryService } from "../services/library.service.js";
import { getPrismaClient } from "../config/database.js";

// Singleton service instance
let libraryService: LibraryService | null = null;

function getService(): LibraryService {
  if (!libraryService) {
    libraryService = new LibraryService(getPrismaClient());
  }
  return libraryService;
}

/**
 * Temporary helper to get the current user ID.
 * Since there's no auth yet, uses the first user in the database.
 * In production, this will come from auth middleware (req.user.id).
 */
async function getCurrentUserId(): Promise<string> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findFirst();
  if (!user) {
    // Auto-create a default user if none exists
    const newUser = await prisma.user.create({
      data: { username: "default_user" },
    });
    return newUser.id;
  }
  return user.id;
}

// GET /api/v1/library
export async function listLibrary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const result = await getService().list(userId, req.query as any);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/library
export async function addToLibrary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const item = await getService().addGame(userId, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

// PUT /api/v1/library/:id
export async function updateLibraryItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const item = await getService().update(userId, String(req.params.id), req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/v1/library/:id
export async function deleteLibraryItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const result = await getService().delete(userId, String(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
