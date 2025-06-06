
import { UserPayload } from './user.api'; // Relative import

export interface LoginResponse {
  token: string;
  user: UserPayload; // Contains the dynamically determined role
}
