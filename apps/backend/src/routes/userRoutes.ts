import { Router } from "express";
import * as userController from "@/controllers/userController";
import { authMiddleware, authorize } from "@/middleware/authMiddleware";
import { validate } from "@/middleware/validationMiddleware";

const router = Router();

// All routes under /users require authentication by default
router.use(authMiddleware);

// Publicly accessible after auth (for user's own profile)
router.get("/me", userController.getMyProfile);

// --- Admin User Management Routes ---
// These routes are for admins to manage all users.

router.post(
  "/",
  authorize(["admin"]),
  validate(userController.createUserSchema),
  userController.handleCreateUser
);

router.get("/", authorize(["admin"]), userController.handleGetAllUsers);

// Route for admins to get all departments
router.get(
  "/departments",
  authorize(["admin"]),
  userController.handleGetAllDepartments
);

router.get(
  "/:userId",
  authorize(["admin"]),
  userController.handleGetUserById // No schema validation needed for GET with param for now
);

router.put(
  "/:userId",
  authorize(["admin"]),
  validate(userController.updateUserSchema),
  userController.handleUpdateUserById
);

router.delete(
  "/:userId",
  authorize(["admin"]),
  userController.handleDeleteUserById // No schema validation needed for DELETE with param
);

export default router;
