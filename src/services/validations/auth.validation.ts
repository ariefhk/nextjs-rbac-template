import { z } from 'zod';

// Common validation patterns
const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters')
  .transform(email => email.toLowerCase().trim());

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character'
  );

const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(
    /^[a-zA-Z\s'-]+$/,
    'Name can only contain letters, spaces, hyphens, and apostrophes'
  )
  .transform(name => name.trim());

const idSchema = z
  .string()
  .min(1, 'ID is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format');

// Auth schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Role schemas
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[a-z_]+$/, 'Role name must be lowercase with underscores only')
    .transform(name => name.toLowerCase().trim()),
  description: z
    .string()
    .max(255, 'Description must be less than 255 characters')
    .optional(),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[a-z_]+$/, 'Role name must be lowercase with underscores only')
    .optional(),
  description: z
    .string()
    .max(255, 'Description must be less than 255 characters')
    .optional(),
});

// Permission schemas
export const createPermissionSchema = z.object({
  resource: z
    .string()
    .min(1, 'Resource is required')
    .max(50, 'Resource must be less than 50 characters')
    .regex(/^[a-z_]+$/, 'Resource must be lowercase with underscores only'),
  action: z
    .string()
    .min(1, 'Action is required')
    .max(50, 'Action must be less than 50 characters')
    .regex(/^[a-z_]+$/, 'Action must be lowercase with underscores only'),
  description: z
    .string()
    .max(255, 'Description must be less than 255 characters')
    .optional(),
});

// User assignment schemas
export const assignRoleSchema = z.object({
  userId: idSchema,
  roleId: idSchema,
});

export const removeRoleSchema = z.object({
  userId: idSchema,
  roleId: idSchema,
});

export const assignPermissionSchema = z.object({
  roleId: idSchema,
  permissionId: idSchema,
});

// User update schemas
export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Search schemas
export const searchSchema = z.object({
  query: z
    .string()
    .max(100, 'Search query must be less than 100 characters')
    .optional(),
  ...paginationSchema.shape,
});

// Generic ID param schema
export const idParamSchema = z.object({
  id: idSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
