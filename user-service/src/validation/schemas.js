// src/validation/schemas.js
const Joi = require('joi');

// Custom validation rules
const customValidations = {
  // Strong password validation
  password: Joi.string()
    .min(parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least {#limit} characters long',
      'string.max': 'Password cannot be longer than {#limit} characters'
    }),

  // Username validation
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .lowercase()
    .pattern(new RegExp('^[a-zA-Z0-9_]+$'))
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'string.min': 'Username must be at least {#limit} characters long',
      'string.max': 'Username cannot be longer than {#limit} characters'
    }),

  // Email validation
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'co', 'io'] } })
    .max(255)
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email address cannot be longer than {#limit} characters'
    }),

  // Name validation
  name: Joi.string()
    .min(1)
    .max(100)
    .pattern(new RegExp('^[a-zA-Z\\s\\-\']+$'))
    .messages({
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
      'string.max': 'Name cannot be longer than {#limit} characters'
    }),

  // Phone validation
  phone: Joi.string()
    .pattern(new RegExp('^[+]?[1-9]?[0-9]{7,15}$'))
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  // URL validation
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(500)
    .messages({
      'string.uri': 'Please provide a valid URL',
      'string.max': 'URL cannot be longer than {#limit} characters'
    }),

  // Date validation (for date of birth)
  dateOfBirth: Joi.date()
    .max('now')
    .min('1900-01-01')
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.min': 'Please provide a valid date of birth'
    }),

  // Bio validation
  bio: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Bio cannot be longer than {#limit} characters'
    }),

  // Location validation
  location: Joi.string()
    .max(255)
    .allow('')
    .messages({
      'string.max': 'Location cannot be longer than {#limit} characters'
    }),

  // Occupation validation
  occupation: Joi.string()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'Occupation cannot be longer than {#limit} characters'
    }),

  // Interests validation
  interests: Joi.array()
    .items(Joi.string().max(50))
    .max(20)
    .messages({
      'array.max': 'You can have a maximum of {#limit} interests',
      'string.max': 'Each interest cannot be longer than {#limit} characters'
    })
};

// Registration schema
const registerSchema = Joi.object({
  username: customValidations.username.required(),
  email: customValidations.email.required(),
  password: customValidations.password.required(),
  firstName: customValidations.name.optional(),
  lastName: customValidations.name.optional(),
  agreeToTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the terms and conditions'
  })
});

// Login schema
const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    'any.required': 'Email or username is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  }),
  rememberMe: Joi.boolean().optional().default(false)
});

// Profile update schema
const updateProfileSchema = Joi.object({
  firstName: customValidations.name.optional(),
  lastName: customValidations.name.optional(),
  bio: customValidations.bio.optional(),
  dateOfBirth: customValidations.dateOfBirth.optional(),
  phone: customValidations.phone.optional(),
  location: customValidations.location.optional(),
  website: customValidations.url.optional(),
  occupation: customValidations.occupation.optional(),
  interests: customValidations.interests.optional(),  privacySettings: Joi.object({
    profileVisibility: Joi.string().valid('public', 'friends', 'private').optional(),
    contactInfoVisibility: Joi.string().valid('public', 'friends', 'private').optional(),
    activityVisibility: Joi.string().valid('public', 'friends', 'private').optional()
  }).optional()
});

// Change password schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: customValidations.password.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match',
      'any.required': 'Password confirmation is required'
    })
});

// Forgot password schema
const forgotPasswordSchema = Joi.object({
  email: customValidations.email.required()
});

// Reset password schema
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  newPassword: customValidations.password.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match',
      'any.required': 'Password confirmation is required'
    })
});

// Email verification schema
const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Verification token is required'
  })
});

// User search schema
const searchUserSchema = Joi.object({
  query: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Search query must be at least 1 character',
    'string.max': 'Search query cannot exceed 100 characters',
    'any.required': 'Search query is required'
  }),
  limit: Joi.number().integer().min(1).max(50).default(10),
  offset: Joi.number().integer().min(0).default(0),
  filters: Joi.object({
    location: Joi.string().max(255).optional(),
    occupation: Joi.string().max(100).optional(),
    interests: Joi.array().items(Joi.string().max(50)).max(5).optional()
  }).optional()
});

// Follow/Unfollow user schema
const followUserSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.uuid': 'Invalid user ID format',
    'any.required': 'User ID is required'
  })
});

// Block/Unblock user schema
const blockUserSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.uuid': 'Invalid user ID format',
    'any.required': 'User ID is required'
  }),
  reason: Joi.string().max(500).optional().messages({
    'string.max': 'Block reason cannot exceed 500 characters'
  })
});

// Report user schema
const reportUserSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.uuid': 'Invalid user ID format',
    'any.required': 'User ID is required'
  }),
  reason: Joi.string().valid(
    'spam',
    'harassment',
    'inappropriate_content',
    'fake_account',
    'other'
  ).required().messages({
    'any.only': 'Invalid report reason',
    'any.required': 'Report reason is required'
  }),
  description: Joi.string().max(1000).optional().messages({
    'string.max': 'Report description cannot exceed 1000 characters'
  })
});

// Update notification preferences schema
const notificationPreferencesSchema = Joi.object({
  emailNotifications: Joi.object({
    newFollower: Joi.boolean().default(true),
    newMessage: Joi.boolean().default(true),
    postLikes: Joi.boolean().default(true),
    comments: Joi.boolean().default(true),
    mentions: Joi.boolean().default(true),
    systemUpdates: Joi.boolean().default(true)
  }).optional(),
  pushNotifications: Joi.object({
    newFollower: Joi.boolean().default(true),
    newMessage: Joi.boolean().default(true),
    postLikes: Joi.boolean().default(false),
    comments: Joi.boolean().default(true),
    mentions: Joi.boolean().default(true)
  }).optional()
});

// Account deactivation schema
const deactivateAccountSchema = Joi.object({
  password: Joi.string().required().messages({
    'any.required': 'Password is required to deactivate account'
  }),
  reason: Joi.string().valid(
    'temporary_break',
    'privacy_concerns',
    'too_time_consuming',
    'not_useful',
    'other'
  ).required().messages({
    'any.only': 'Invalid deactivation reason',
    'any.required': 'Deactivation reason is required'
  }),
  feedback: Joi.string().max(1000).optional().messages({
    'string.max': 'Feedback cannot exceed 1000 characters'
  })
});

// Pagination schema (reusable)
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'username').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Export all schemas
module.exports = {
  // Core authentication schemas
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema,
  
  // Profile management schemas
  updateProfileSchema,
  notificationPreferencesSchema,
  deactivateAccountSchema,
  
  // Social interaction schemas
  searchUserSchema,
  followUserSchema,
  blockUserSchema,
  reportUserSchema,
  
  // Utility schemas
  paginationSchema,
  
  // Custom validations for reuse
  customValidations
};