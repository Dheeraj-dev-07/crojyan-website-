const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

module.exports = {
  loginSchema
};
