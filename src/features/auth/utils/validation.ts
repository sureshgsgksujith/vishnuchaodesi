import { z } from "zod";

export const loginSchema = z.object({
  loginId: z.string().min(1, "Email or mobile number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Name is required"),
    email: z.string().email("Valid email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    mobileNumber: z.string().min(10, "Valid phone number is required"),
    otpCode: z.string().min(4, "OTP is required"),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
  });

export type LoginSchemaType = z.infer<typeof loginSchema>;
export type RegisterSchemaType = z.infer<typeof registerSchema>;