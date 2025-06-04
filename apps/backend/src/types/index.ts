
// Re-export common types for convenience within the backend
export * from '@college-erp/common';

// Backend specific types can be defined here if needed
// For example, types related to Express request/response extensions:
import { Request } from 'express';
import { UserPayload } from '@college-erp/common';

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}
