import { Request, Response, NextFunction } from 'express';
import * as sectionService from '@/services/sectionService';
// import * as courseService from '@/services/courseService'; // No longer needed here
// import * as semesterService from '@/services/semesterService'; // No longer needed here
// import * as userService from '@/services/userService'; // No longer needed here
import { AuthenticatedRequest, APIResponse, Section, CreateSectionInput, UpdateSectionInput, SectionBasicInfo } from '@/types'; // Updated imports
import { z } from 'zod';
import { HttpError } from '@/middleware/errorHandler';

// --- Schemas for Validation ---
export const createSectionSchema = z.object({
  body: z.object({
    courseId: z.number().int().positive(),
    semesterId: z.number().int().positive(),
    sectionLetter: z.string().min(1, "Section letter is required").max(5, "Section letter too long (e.g., A, B, 01, 02A)"),
    facultyUserId: z.string().optional().nullable(),
    roomNumber: z.string().max(50, "Room number too long").optional().nullable(),
    maxCapacity: z.number().int().min(1, "Capacity must be at least 1").optional().nullable(),
  }),
});

export const updateSectionSchema = z.object({
  params: z.object({
    sectionId: z.coerce.number().int().positive("Section ID must be a positive integer."),
  }),
  body: z.object({
    facultyUserId: z.string().optional().nullable(), // Allow unassigning
    roomNumber: z.string().max(50).optional().nullable(),
    maxCapacity: z.number().int().min(1).optional().nullable(),
  }).refine(data => Object.keys(data).length > 0, { message: "At least one field must be provided for update." }),
});

// --- Controller Functions ---

export const handleCreateSection = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const createInput = (req as any).body as CreateSectionInput;
    const newSection = await sectionService.createSection(createInput);
    const response: APIResponse<Section> = { success: true, data: newSection, message: "Section created successfully." };
    (res as any).status(201).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const handleGetAllSections = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sections = await sectionService.getAllSections();
    const response: APIResponse<Section[]> = { success: true, data: sections };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const handleGetAllSectionsBasicInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sectionsBasicInfo = await sectionService.getAllSectionsBasicInfo();
    const response: APIResponse<SectionBasicInfo[]> = { success: true, data: sectionsBasicInfo };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const handleGetSectionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sectionId = parseInt((req as any).params.sectionId, 10);
    if (isNaN(sectionId)) {
        throw new HttpError("Invalid section ID.", 400);
    }
    const section = await sectionService.getSectionById(sectionId);
    if (!section) {
      throw new HttpError("Section not found.", 404);
    }
    const response: APIResponse<Section> = { success: true, data: section };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const handleUpdateSectionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sectionId = parseInt((req as any).params.sectionId, 10);
     if (isNaN(sectionId)) {
        throw new HttpError("Invalid section ID.", 400);
    }
    const updateData = (req as any).body as UpdateSectionInput;
    const updatedSection = await sectionService.updateSectionById(sectionId, updateData);
    if (!updatedSection) {
        throw new HttpError("Section not found or update failed.", 404);
    }
    const response: APIResponse<Section> = { success: true, data: updatedSection, message: "Section updated successfully." };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const handleDeleteSectionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sectionId = parseInt((req as any).params.sectionId, 10);
    if (isNaN(sectionId)) {
        throw new HttpError("Invalid section ID.", 400);
    }
    await sectionService.deleteSectionById(sectionId);
    const response: APIResponse<null> = { success: true, message: "Section deleted successfully." };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

// Removed getSectionFormData as it's no longer needed in this context.
// UserFormDialog will fetch basic section list directly.