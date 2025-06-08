import { Router } from 'express';
import {
  createSectionSchema,
  handleCreateSection,
  handleGetAllSections,
  handleGetAllSectionsBasicInfo, // Added
  handleGetSectionById,
  updateSectionSchema,
  handleUpdateSectionById,
  handleDeleteSectionById
} from '@/controllers/sectionController';
import { authMiddleware, authorize } from '@/middleware/authMiddleware';
import { validate } from '@/middleware/validationMiddleware';

const router = Router();

// All section routes require admin privileges
router.use(authMiddleware, authorize(['admin']));

router.post(
  '/',
  validate(createSectionSchema),
  handleCreateSection
);

router.get('/', handleGetAllSections);

router.get('/basic', handleGetAllSectionsBasicInfo); // For UserFormDialog dropdowns

router.get(
  '/:sectionId',
  handleGetSectionById 
);

router.put(
  '/:sectionId',
  validate(updateSectionSchema),
  handleUpdateSectionById
);

router.delete(
  '/:sectionId',
  handleDeleteSectionById
);

export default router;